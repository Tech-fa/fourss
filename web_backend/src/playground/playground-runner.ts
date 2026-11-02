import { Injectable } from "@nestjs/common";
import ivm from "isolated-vm";
import { playgroundException, PlaygroundErrorCode } from "./playground.errors";
import { PLAYGROUND_ERROR_MAP } from "./playground.errors";

const SCRIPT_TIMEOUT_MS = 300;
const RESULT_LIMIT = 32768;

export type HandleRequest = {
  action: string;
  entityType?: string;
  entityId?: string;
  data?: unknown;
  refs?: { entityType: string; entityId: string }[];
  page?: { documentId?: string; enabled?: boolean };
};

export type HostBridge = {
  get: (entityType: string, entityId: string) => Promise<unknown>;
  list: (
    entityType: string,
    query: { limit?: number; cursor?: string },
  ) => Promise<unknown>;
};

const BOOTSTRAP = `
  return (async () => {
    const host = {
      page: JSON.parse($1).page || {},
      get: async (entityType, entityId) => {
        const result = await __hostGet.apply(undefined, [entityType, entityId], {
          arguments: { copy: true },
          result: { promise: true, copy: true }
        });
        if (!result || result.ok === false) {
          throw new Error((result && result.key) + ': ' + ((result && result.message) || 'failed'));
        }
        return result.value;
      },
      list: async (entityType, query) => {
        const result = await __hostList.apply(undefined, [entityType, query || {}], {
          arguments: { copy: true },
          result: { promise: true, copy: true }
        });
        if (!result || result.ok === false) {
          throw new Error((result && result.key) + ': ' + ((result && result.message) || 'failed'));
        }
        return result.value;
      },
      save() { throw new Error('SAVE_INSIDE_HANDLE'); },
      remove() { throw new Error('REMOVE_INSIDE_HANDLE'); },
      fail(message) { throw new Error(String(message || 'failed')); }
    };
    const produced = new Function('host', $0 + '\\n;return typeof handle===\"function\"?handle:null;')(host);
    if (typeof produced !== 'function') throw new Error('NO_HANDLE');
    const result = await produced(host, JSON.parse($1));
    const text = JSON.stringify(result === undefined ? null : result);
    if (text.length > ${RESULT_LIMIT}) throw new Error('RESULT_TOO_LARGE');
    return text;
  })();
`;

@Injectable()
export class PlaygroundRunner {
  async runHandle(source: string, request: HandleRequest, bridge: HostBridge) {
    const isolate = new ivm.Isolate({ memoryLimit: 32 });
    try {
      const context = await isolate.createContext();
      const jail = context.global;
      await jail.set("global", jail.derefInto());
      await jail.set(
        "__hostGet",
        new ivm.Reference(async (entityType: string, entityId: string) =>
          this.wrap(() => bridge.get(entityType, entityId)),
        ),
      );
      await jail.set(
        "__hostList",
        new ivm.Reference(
          async (
            entityType: string,
            query: { limit?: number; cursor?: string },
          ) => this.wrap(() => bridge.list(entityType, query || {})),
        ),
      );
      const text = await context.evalClosure(
        BOOTSTRAP,
        [source, JSON.stringify(request ?? {})],
        {
          timeout: SCRIPT_TIMEOUT_MS,
          arguments: { copy: true },
          result: { promise: true, copy: true },
        },
      );
      if (typeof text !== "string") throw playgroundException("PG_014");
      return JSON.parse(text);
    } catch (error) {
      throw this.mapError(error);
    } finally {
      isolate.dispose();
    }
  }

  private async wrap(run: () => Promise<unknown>) {
    try {
      return { ok: true, value: await run() };
    } catch (error) {
      const body = this.exceptionBody(error);
      return {
        ok: false,
        key: body?.key || "PG_014",
        message: body?.message || this.messageOf(error),
      };
    }
  }

  private mapError(error: unknown) {
    if (this.isHttpException(error)) return error;
    const message = this.messageOf(error);
    if (message.includes("timed out")) return playgroundException("PG_011");
    if (message.includes("NO_HANDLE")) return playgroundException("PG_010");
    const key = message.match(/^(PG_\d{3}):/)?.[1] as PlaygroundErrorCode | undefined;
    if (key && key in PLAYGROUND_ERROR_MAP) return playgroundException(key);
    return playgroundException("PG_014", {
      message: message.slice(0, 500) || PLAYGROUND_ERROR_MAP.PG_014.message,
    });
  }

  private exceptionBody(error: unknown): { key?: string; message?: string } | null {
    if (!error || typeof error !== "object" || !("getResponse" in error)) return null;
    const response = (error as { getResponse: () => unknown }).getResponse();
    if (!response || typeof response !== "object") return null;
    return response as { key?: string; message?: string };
  }

  private isHttpException(error: unknown) {
    return Boolean(error && typeof error === "object" && "getStatus" in error);
  }

  private messageOf(error: unknown) {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === "string") return error;
    if (error && typeof error === "object" && "message" in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === "string" && message.length) return message;
    }
    return "The playground program failed";
  }
}
