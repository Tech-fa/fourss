import { playgroundException } from "./playground.errors";

const METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
const RESULT_LIMIT = 262144;

export function appPath(input: string) {
  if (typeof input !== "string" || !input.startsWith("/") || input.startsWith("//")) {
    throw playgroundException("PG_027");
  }
  if (input.includes("\\") || input.includes("\0") || input.includes("://")) {
    throw playgroundException("PG_027");
  }
  let url: URL;
  try {
    url = new URL(input, "http://playground.local");
  } catch {
    throw playgroundException("PG_027");
  }
  if (url.origin !== "http://playground.local" || url.username || url.password) {
    throw playgroundException("PG_027");
  }
  if (url.pathname === "/playgrounds" || url.pathname.startsWith("/playgrounds/")) {
    throw playgroundException("PG_027");
  }
  return `${url.pathname}${url.search}`;
}

export function appMethod(input: string | undefined) {
  const method = (input || "GET").toUpperCase();
  if (!METHODS.has(method)) throw playgroundException("PG_027");
  return method;
}

export async function fetchOnApp(options: {
  base: string;
  path: string;
  method?: string;
  body?: unknown;
  authorization?: string;
  locale?: string;
  send?: typeof fetch;
}) {
  const path = appPath(options.path);
  const method = appMethod(options.method);
  const base = options.base.replace(/\/$/, "");
  const url = new URL(path, `${base}/`);
  if (url.origin !== new URL(base).origin) throw playgroundException("PG_027");
  const headers: Record<string, string> = {};
  if (options.authorization) headers.authorization = options.authorization;
  if (options.locale) headers["x-locale"] = options.locale;
  let payload: string | undefined;
  if (options.body !== undefined && method !== "GET" && method !== "DELETE") {
    payload = JSON.stringify(options.body);
    if (payload.length > RESULT_LIMIT) throw playgroundException("PG_026");
    headers["content-type"] = "application/json";
  }
  const send = options.send || fetch;
  const response = await send(url, {
    method,
    headers,
    body: payload,
    redirect: "manual",
    signal: AbortSignal.timeout(3000),
  });
  const text = await response.text();
  if (text.length > RESULT_LIMIT) throw playgroundException("PG_026");
  const type = response.headers.get("content-type") || "";
  let body: unknown = text;
  if (type.includes("json") && text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: response.status, body };
}
