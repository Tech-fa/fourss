import ivm from "isolated-vm";
import { Capabilities, HookName, prepareSource } from "./integration.model";

const RESULT_LIMIT = 262144;
const CALL_TIMEOUT_MS = 120000;

export type HookHttpInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
};

export type IntegrationHookHost = {
  configGet: (key: string) => Promise<string | null>;
  configSet: (key: string, value: string) => Promise<void>;
  stateGet: (key: string) => Promise<string | null>;
  stateSet: (key: string, value: string) => Promise<void>;
  http: (url: string, init: HookHttpInit) => Promise<unknown>;
  save: (bytes: unknown, name: string, options: { contentType?: string }) => Promise<{
    fileId: string;
    name: string;
    size: number;
    contentType: string;
    url: string;
  }>;
  extractText: (fileId: string) => Promise<{ text: string; source: "extracted" | "ocr"; confidence?: number; pages?: number }>;
  emit: (event: string, payload: unknown) => Promise<void>;
  log: (message: string) => Promise<void>;
  setStatus?: (text: string) => Promise<void>;
};

export type ProgramDispatch =
  | { kind: "hook"; name: HookName }
  | { kind: "route"; method: string; path: string }
  | { kind: "schedule"; name: string }
  | { kind: "event"; name: string }
  | { kind: "register" };

const BOOTSTRAP = `
  return (async () => {
    const callHost = async (ref, args) => {
      const result = await ref.apply(undefined, args, {
        arguments: { copy: true },
        result: { promise: true, copy: true }
      });
      if (!result || result.ok === false) {
        throw new Error((result && result.message) || "The host call failed.");
      }
      return result.value;
    };
    const ctx = {
      config: {
        get: (key) => callHost(__configGet, [String(key || "")]),
        set: (key, value) => callHost(__configSet, [String(key || ""), value == null ? "" : String(value)])
      },
      state: {
        get: (key) => callHost(__stateGet, [String(key || "")]),
        set: (key, value) => callHost(__stateSet, [String(key || ""), value == null ? "" : String(value)])
      },
      http: (url, init) => callHost(__http, [String(url || ""), init || {}]),
      save: (bytes, name, options) => callHost(__save, [bytes, String(name || ""), options || {}]),
      extractText: (fileId) => callHost(__extractText, [String(fileId || "")]),
      emit: (event, payload) => callHost(__emit, [String(event || ""), payload == null ? null : payload]),
      log: (message) => callHost(__log, [String(message || "")]),
      setStatus: (text) => callHost(__setStatus, [String(text || "")])
    };
    const savedConfig = JSON.parse($3);
    for (const key of Object.keys(savedConfig)) {
      if (key !== "get" && key !== "set") ctx.config[key] = savedConfig[key];
    }
    const writeConfig = ctx.config.set;
    ctx.config.set = (key, value) => {
      const name = String(key || "");
      const text = value == null ? "" : String(value);
      if (name && name !== "get" && name !== "set") ctx.config[name] = text;
      return writeConfig(name, text);
    };
    const routes = [];
    const schedules = {};
    const subscriptions = {};
    function route(method, path, handler) {
      const verb = String(method || "").toUpperCase();
      const pattern = routeParts(path);
      if (!/^(GET|POST|PUT|PATCH|DELETE)$/.test(verb) || !pattern || typeof handler !== "function") {
        throw new Error("That route is not usable.");
      }
      routes.push({ method: verb, path: String(path), pattern: pattern, handler: handler });
    }
    function schedule(name, options, handler) {
      const key = String(name || "");
      const every = Number(options && options.everySeconds);
      if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(key) || !Number.isInteger(every) || every < 30 || every > 86400 || typeof handler !== "function") {
        throw new Error("A schedule needs a name and a whole number of seconds from 30 to 86400.");
      }
      schedules[key] = { everySeconds: every, handler: handler };
    }
    function subscribe(event, handler) {
      const key = String(event || "");
      if (!/^[A-Za-z][A-Za-z0-9._-]{0,80}$/.test(key) || typeof handler !== "function") {
        throw new Error("That event name is not usable.");
      }
      subscriptions[key] = handler;
    }
    function routeParts(path) {
      const raw = String(path || "").split("?")[0];
      if (!raw.startsWith("/")) return null;
      const pieces = raw.split("/").filter(Boolean);
      if (pieces.length > 8) return null;
      const pattern = [];
      for (const piece of pieces) {
        if (piece === "." || piece === "..") return null;
        if (piece.charAt(0) === ":") {
          if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(piece.slice(1))) return null;
          pattern.push({ name: piece.slice(1) });
        } else if (/^[A-Za-z0-9._-]{1,128}$/.test(piece)) {
          pattern.push({ text: piece });
        } else {
          return null;
        }
      }
      return pattern;
    }
    function queryFrom(path, given) {
      if (given && typeof given === "object" && Object.keys(given).length) return given;
      const query = {};
      const search = String(path || "").split("?")[1] || "";
      for (const part of search.split("&")) {
        if (!part) continue;
        const eq = part.indexOf("=");
        const rawKey = eq === -1 ? part : part.slice(0, eq);
        const rawValue = eq === -1 ? "" : part.slice(eq + 1);
        let key = rawKey;
        let value = rawValue.split("+").join(" ");
        try {
          key = decodeURIComponent(rawKey);
          value = decodeURIComponent(value);
        } catch (error) {
          key = rawKey;
        }
        query[key] = value;
      }
      return query;
    }
    function matchRoute(method, path) {
      const pieces = String(path || "").split("?")[0].split("/").filter(Boolean);
      for (const item of routes) {
        if (item.method !== method || item.pattern.length !== pieces.length) continue;
        const params = {};
        let matched = true;
        for (let i = 0; i < item.pattern.length; i += 1) {
          if (item.pattern[i].text) {
            if (item.pattern[i].text !== pieces[i]) matched = false;
          } else {
            params[item.pattern[i].name] = pieces[i];
          }
        }
        if (matched) return { handler: item.handler, params: params };
      }
      return null;
    }
    const exported = new Function("route", "schedule", "subscribe", "ctx", $0 + "\\n;return {" +
      "onHttp: typeof onHttp===\\"function\\"?onHttp:null," +
      "onTick: typeof onTick===\\"function\\"?onTick:null," +
      "onMessage: typeof onMessage===\\"function\\"?onMessage:null," +
      "onStart: typeof onStart===\\"function\\"?onStart:null," +
      "onCall: typeof onCall===\\"function\\"?onCall:null};")(route, schedule, subscribe, ctx);
    const mode = JSON.parse($1);
    const payload = JSON.parse($2);
    let result;
    if (mode.kind === "register") {
      result = {
        schedules: Object.keys(schedules).map((name) => ({ name: name, everySeconds: schedules[name].everySeconds })),
        subscriptions: Object.keys(subscriptions),
        routes: routes.map((item) => ({ method: item.method, path: item.path }))
      };
    } else if (mode.kind === "route") {
      const found = matchRoute(String(mode.method || "").toUpperCase(), mode.path);
      if (!found) throw new Error("NO_ROUTE");
      const request = Object.assign({}, payload || {}, { params: found.params });
      request.query = queryFrom(mode.path, request.query);
      ctx.query = request.query;
      result = await found.handler(ctx, request);
    } else if (mode.kind === "schedule") {
      const found = schedules[mode.name];
      if (!found) throw new Error("NO_HOOK");
      result = await found.handler(ctx, payload);
    } else if (mode.kind === "event") {
      const found = subscriptions[mode.name] || exported.onMessage;
      if (typeof found !== "function") throw new Error("NO_HOOK");
      result = await found(ctx, payload);
    } else {
      const found = exported[mode.name];
      if (typeof found !== "function") throw new Error("NO_HOOK");
      result = await found(ctx, payload);
    }
    const text = JSON.stringify(result === undefined ? null : result);
    if (text.length > ${RESULT_LIMIT}) throw new Error("RESULT_TOO_LARGE");
    return text;
  })();
`;

const buckets = new Map<string, { window: number; count: number }>();

export function allowRequest(id: string, max: number, now = Date.now()): boolean {
  const window = Math.floor(now / 60000);
  const bucket = buckets.get(id);
  if (!bucket || bucket.window !== window) {
    buckets.set(id, { window, count: 1 });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}

export function resetRequestLimits() {
  buckets.clear();
}

export function originOf(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function runIntegrationHook(
  source: string,
  hook: HookName | ProgramDispatch,
  payload: unknown,
  host: IntegrationHookHost,
  capabilities: Capabilities,
  options: { integrationId?: string; resident?: boolean; now?: () => number; config?: Record<string, string> } = {},
): { promise: Promise<unknown>; cancel: () => void } {
  const dispatch: ProgramDispatch = typeof hook === "string" ? { kind: "hook", name: hook } : hook;
  let isolate: ivm.Isolate | null = null;
  let cancelled = false;
  const promise = (async () => {
    const created = new ivm.Isolate({ memoryLimit: 64 });
    isolate = created;
    if (cancelled) {
      created.dispose();
      throw new Error("The hook was stopped.");
    }
    let failure = "";
    try {
      const context = await created.createContext();
      const jail = context.global;
      await jail.set("global", jail.derefInto());
      await jail.set("__configGet", reference(async (key: string) => host.configGet(key)));
      await jail.set("__configSet", reference(async (key: string, value: string) => host.configSet(key, value)));
      await jail.set("__stateGet", reference(async (key: string) => host.stateGet(key)));
      await jail.set("__stateSet", reference(async (key: string, value: string) => host.stateSet(key, value)));
      await jail.set("__save", reference(async (bytes: unknown, name: string, options: { contentType?: string }) => {
        const type = options && typeof options === "object" ? options.contentType : undefined;
        return host.save(bytes, name, { contentType: type ? String(type) : undefined });
      }));
      await jail.set("__extractText", reference(async (fileId: string) => host.extractText(fileId)));
      await jail.set("__http", reference(async (url: string, init: HookHttpInit) => {
        const origin = originOf(url);
        if (!origin || !capabilities.outboundHosts.includes(origin)) {
          throw new Error("That host is not allowed for this integration.");
        }
        const now = options.now ? options.now() : Date.now();
        if (!allowRequest(options.integrationId || "integration", capabilities.maxPerMinute || 60, now)) {
          throw new Error("This integration reached its request limit for this minute.");
        }
        return host.http(url, init || {});
      }));
      await jail.set("__emit", reference(async (event: string, body: unknown) => host.emit(event, body)));
      await jail.set("__log", reference(async (message: string) => host.log(message)));
      await jail.set("__setStatus", reference(async (text: string) => {
        if (!host.setStatus) throw new Error("This connection cannot change its status.");
        const status = String(text || "").trim();
        if (!status || status.length > 255) throw new Error("Status text must be 255 characters or fewer.");
        await host.setStatus(status);
      }));
      const encoded = JSON.stringify(payload === undefined ? null : payload);
      if (encoded.length > RESULT_LIMIT) throw new Error("The payload is too large.");
      const config = configSnapshot(options.config);
      const text = await context.evalClosure(BOOTSTRAP, [prepareSource(source), JSON.stringify(dispatch), encoded, config], {
        ...(options.resident ? {} : { timeout: CALL_TIMEOUT_MS }),
        arguments: { copy: true },
        result: { promise: true, copy: true },
      });
      if (typeof text !== "string") throw new Error("The hook returned a value that could not be read.");
      return JSON.parse(text);
    } catch (error) {
      failure = hookMessage(error);
    } finally {
      try {
        created.dispose();
      } catch {
        // The task may already have been stopped.
      }
      isolate = null;
    }
    throw new Error(failure || "The hook failed.");
  })();
  return {
    promise,
    cancel() {
      cancelled = true;
      isolate?.dispose();
    },
  };
}

function configSnapshot(config: Record<string, string> | undefined): string {
  const saved: Record<string, string> = {};
  for (const [key, value] of Object.entries(config || {})) {
    if (!key || key === "get" || key === "set") continue;
    saved[key] = value == null ? "" : String(value);
  }
  const text = JSON.stringify(saved);
  if (text.length > RESULT_LIMIT) throw new Error("The config is too large.");
  return text;
}

function reference(run: (...args: any[]) => Promise<unknown>) {
  return new ivm.Reference(async (...args: any[]) => {
    try {
      return { ok: true, value: await run(...args) };
    } catch (error) {
      const message = error instanceof Error ? error.message : "The host call failed.";
      return { ok: false, message };
    }
  });
}

function hookMessage(error: unknown) {
  if (error instanceof Error && error.message) return String(error.message);
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return "The hook failed.";
}
