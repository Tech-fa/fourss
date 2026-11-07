import ivm from "isolated-vm";
import { playgroundException, PlaygroundErrorCode } from "./playground.errors";
import { PLAYGROUND_ERROR_MAP } from "./playground.errors";

const CALL_TIMEOUT_MS = 5000;
const RESULT_LIMIT = 262144;
const FUNCTION_NAME = /^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/;

export type PlaygroundCallHost = {
  sql: (statement: string, params: unknown) => Promise<unknown>;
  fetch: (path: string, init: { method?: string; body?: unknown }) => Promise<unknown>;
  readFile: (name: string) => Promise<unknown>;
  writeFile: (name: string, contents: unknown) => Promise<unknown>;
};

const BOOTSTRAP = `
  return (async () => {
    const playground = {
      sql: async (statement, params) => {
        const result = await __hostSql.apply(undefined, [statement, params || []], {
          arguments: { copy: true },
          result: { promise: true, copy: true }
        });
        if (!result || result.ok === false) {
          throw new Error((result && result.key) + ': ' + ((result && result.message) || 'failed'));
        }
        return result.value;
      },
      fetch: async (path, init) => {
        const request = init || {};
        const result = await __hostFetch.apply(undefined, [path, { method: request.method || 'GET', body: request.body }], {
          arguments: { copy: true },
          result: { promise: true, copy: true }
        });
        if (!result || result.ok === false) {
          throw new Error((result && result.key) + ': ' + ((result && result.message) || 'failed'));
        }
        return result.value;
      },
      readFile: async (name) => {
        const result = await __hostRead.apply(undefined, [name], {
          arguments: { copy: true },
          result: { promise: true, copy: true }
        });
        if (!result || result.ok === false) {
          throw new Error((result && result.key) + ': ' + ((result && result.message) || 'failed'));
        }
        return result.value;
      },
      writeFile: async (name, contents) => {
        const result = await __hostWrite.apply(undefined, [name, contents], {
          arguments: { copy: true },
          result: { promise: true, copy: true }
        });
        if (!result || result.ok === false) {
          throw new Error((result && result.key) + ': ' + ((result && result.message) || 'failed'));
        }
        return result.value;
      }
    };
    const produced = new Function('playground', $0 + '\\n;' + $1)(playground);
    if (typeof produced !== 'function') throw new Error('NO_FUNCTION');
    const result = await produced(playground, JSON.parse($2));
    const text = JSON.stringify(result === undefined ? null : result);
    if (text.length > ${RESULT_LIMIT}) throw new Error('RESULT_TOO_LARGE');
    return text;
  })();
`;

export function functionLookup(name: string) {
  if (!FUNCTION_NAME.test(name)) throw playgroundException("PG_024");
  return `return typeof ${name} === "function" ? ${name} : null`;
}

export async function runServerFunction(
  source: string,
  name: string,
  argument: unknown,
  host: PlaygroundCallHost,
) {
  if (!source.trim()) throw playgroundException("PG_024");
  const lookup = functionLookup(name);
  const payload = JSON.stringify(argument === undefined ? null : argument);
  if (payload.length > RESULT_LIMIT * 16) throw playgroundException("PG_026");
  const isolate = new ivm.Isolate({ memoryLimit: 64 });
  try {
    const context = await isolate.createContext();
    const jail = context.global;
    await jail.set("global", jail.derefInto());
    await jail.set("__hostSql", new ivm.Reference(async (statement: string, params: unknown) =>
      wrap(() => host.sql(statement, params)),
    ));
    await jail.set("__hostFetch", new ivm.Reference(async (path: string, init: { method?: string; body?: unknown }) =>
      wrap(() => host.fetch(path, init || {})),
    ));
    await jail.set("__hostRead", new ivm.Reference(async (fileName: string) =>
      wrap(() => host.readFile(fileName)),
    ));
    await jail.set("__hostWrite", new ivm.Reference(async (fileName: string, contents: unknown) =>
      wrap(() => host.writeFile(fileName, contents)),
    ));
    const text = await context.evalClosure(BOOTSTRAP, [source, lookup, payload], {
      timeout: CALL_TIMEOUT_MS,
      arguments: { copy: true },
      result: { promise: true, copy: true },
    });
    if (typeof text !== "string") throw playgroundException("PG_014");
    return JSON.parse(text);
  } catch (error) {
    throw mapError(error);
  } finally {
    isolate.dispose();
  }
}

async function wrap(run: () => Promise<unknown>) {
  try {
    return { ok: true, value: await run() };
  } catch (error) {
    const body = exceptionBody(error);
    return {
      ok: false,
      key: body?.key || "PG_014",
      message: body?.message || messageOf(error),
    };
  }
}

function mapError(error: unknown) {
  if (isHttpException(error)) return error;
  const message = messageOf(error);
  if (message.includes("timed out")) return playgroundException("PG_011");
  if (message.includes("NO_FUNCTION")) return playgroundException("PG_024");
  if (message.includes("NO_ROUTE")) return playgroundException("PG_028");
  if (message.includes("BAD_ROUTE")) return playgroundException("PG_029");
  if (message.includes("RESULT_TOO_LARGE")) return playgroundException("PG_026");
  const key = message.match(/^(PG_\d{3}):/)?.[1] as PlaygroundErrorCode | undefined;
  if (key && key in PLAYGROUND_ERROR_MAP) return playgroundException(key);
  return playgroundException("PG_014", {
    message: message.slice(0, 500) || PLAYGROUND_ERROR_MAP.PG_014.message,
  });
}

function exceptionBody(error: unknown): { key?: string; message?: string } | null {
  if (!error || typeof error !== "object" || !("getResponse" in error)) return null;
  const response = (error as { getResponse: () => unknown }).getResponse();
  if (!response || typeof response !== "object") return null;
  return response as { key?: string; message?: string };
}

function isHttpException(error: unknown) {
  return Boolean(error && typeof error === "object" && "getStatus" in error);
}

const API_SEGMENT = /^[A-Za-z0-9._-]{1,128}$/;
const API_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

export type PlaygroundApiFile = {
  filename: string;
  mime: string;
  size: number;
};

export type PlaygroundRouteRequest = {
  method: string;
  path: string;
  body: unknown;
  query: Record<string, string>;
  file: PlaygroundApiFile | null;
};

export type PlaygroundRouteHost = {
  sql: (statement: string, params: unknown) => Promise<unknown>;
  fetch: (path: string, init: { method?: string; body?: unknown }) => Promise<unknown>;
  save: (name: string) => Promise<unknown>;
};

export type PlaygroundRouteResult =
  | { kind: "json"; value: unknown }
  | { kind: "file"; name: string };

const ROUTE_BOOTSTRAP = `
  return (async () => {
    const callHost = async (ref, args) => {
      const result = await ref.apply(undefined, args, {
        arguments: { copy: true },
        result: { promise: true, copy: true }
      });
      if (!result || result.ok === false) {
        throw new Error((result && result.key) + ': ' + ((result && result.message) || 'failed'));
      }
      return result.value;
    };
    const playground = {
      sql: (statement, params) => callHost(__hostSql, [statement, params || []]),
      fetch: (path, init) => {
        const request = init || {};
        return callHost(__hostFetch, [path, { method: request.method || 'GET', body: request.body }]);
      },
      save: (file, name) => {
        if (!file) throw new Error('PG_025: That file is not available');
        return callHost(__hostSave, [name == null ? '' : String(name)]);
      },
      open: (name) => ({ __playgroundFile: String(name || '') })
    };
    const routes = [];
    function route(method, path, handler) {
      const verb = String(method || '').toUpperCase();
      const pattern = routePattern(path);
      if (!/^(GET|POST|PUT|PATCH|DELETE)$/.test(verb) || pattern == null || typeof handler !== 'function') {
        throw new Error('BAD_ROUTE');
      }
      routes.push({ method: verb, pattern: pattern, handler: handler });
    }
    new Function('playground', 'route', $0)(playground, route);
    const request = JSON.parse($1);
    const found = matchRoute(routes, request.method, request.path);
    if (!found) throw new Error('NO_ROUTE');
    const result = await found.handler(playground, {
      method: request.method,
      path: request.path,
      body: request.body == null ? null : request.body,
      query: request.query || {},
      params: found.params,
      file: request.file || null
    });
    if (result && typeof result === 'object' && !Array.isArray(result) && typeof result.__playgroundFile === 'string' && Object.keys(result).length === 1) {
      return JSON.stringify({ kind: 'file', name: result.__playgroundFile });
    }
    const text = JSON.stringify({ kind: 'json', value: result === undefined ? null : result });
    if (text.length > ${RESULT_LIMIT}) throw new Error('RESULT_TOO_LARGE');
    return text;

    function routePattern(path) {
      const raw = String(path || '').replace(/\\\\/g, '/').split('?')[0];
      if (!raw.startsWith('/')) return null;
      const parts = raw.split('/').filter(Boolean);
      if (parts.length > 8) return null;
      const pattern = [];
      for (const part of parts) {
        if (part === '.' || part === '..') return null;
        if (part.charAt(0) === ':') {
          if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(part.slice(1))) return null;
          pattern.push({ name: part.slice(1) });
        } else if (/^[A-Za-z0-9._-]{1,128}$/.test(part)) {
          pattern.push({ text: part });
        } else {
          return null;
        }
      }
      return pattern;
    }
    function matchRoute(list, method, path) {
      const parts = String(path || '').split('/').filter(Boolean);
      for (const item of list) {
        if (item.method !== method || item.pattern.length !== parts.length) continue;
        const params = {};
        let matched = true;
        for (let i = 0; i < item.pattern.length; i += 1) {
          if (item.pattern[i].text) {
            if (item.pattern[i].text !== parts[i]) matched = false;
          } else {
            params[item.pattern[i].name] = parts[i];
          }
        }
        if (matched) return { handler: item.handler, params: params };
      }
      return null;
    }
  })();
`;

export function playgroundApiPath(value: unknown) {
  const parts = apiSegments(value);
  if (parts.length > 8 || parts.some((part) => part === "." || part === ".." || !API_SEGMENT.test(part))) {
    throw playgroundException("PG_029");
  }
  return `/${parts.join("/")}`;
}

export function playgroundApiMethod(value: unknown) {
  const method = String(value || "GET").toUpperCase();
  if (!API_METHODS.has(method)) throw playgroundException("PG_029");
  return method;
}

export async function runPlaygroundRoute(
  source: string,
  request: PlaygroundRouteRequest,
  host: PlaygroundRouteHost,
) {
  if (!source.trim()) throw playgroundException("PG_028");
  const method = playgroundApiMethod(request.method);
  const path = playgroundApiPath(request.path);
  const payload = JSON.stringify({
    method,
    path,
    body: request.body ?? null,
    query: request.query || {},
    file: request.file,
  });
  if (payload.length > RESULT_LIMIT * 16) throw playgroundException("PG_026");
  const isolate = new ivm.Isolate({ memoryLimit: 64 });
  try {
    const context = await isolate.createContext();
    const jail = context.global;
    await jail.set("global", jail.derefInto());
    await jail.set("__hostSql", new ivm.Reference(async (statement: string, params: unknown) =>
      wrap(() => host.sql(statement, params)),
    ));
    await jail.set("__hostFetch", new ivm.Reference(async (apiPath: string, init: { method?: string; body?: unknown }) =>
      wrap(() => host.fetch(apiPath, init || {})),
    ));
    await jail.set("__hostSave", new ivm.Reference(async (name: string) =>
      wrap(() => host.save(String(name || ""))),
    ));
    const text = await context.evalClosure(ROUTE_BOOTSTRAP, [source, payload], {
      timeout: CALL_TIMEOUT_MS,
      arguments: { copy: true },
      result: { promise: true, copy: true },
    });
    return routeResult(text);
  } catch (error) {
    throw mapError(error);
  } finally {
    isolate.dispose();
  }
}

function routeResult(text: unknown): PlaygroundRouteResult {
  if (typeof text !== "string") throw playgroundException("PG_014");
  const parsed = JSON.parse(text) as { kind?: string; value?: unknown; name?: string };
  if (parsed?.kind === "file" && typeof parsed.name === "string") return { kind: "file", name: parsed.name };
  if (parsed?.kind === "json") return { kind: "json", value: parsed.value ?? null };
  throw playgroundException("PG_014");
}

function apiSegments(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => apiSegments(item));
  return String(value ?? "")
    .split("?")[0]
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part.length > 0)
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    });
}

function messageOf(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.length) return message;
  }
  return "The playground program failed";
}
