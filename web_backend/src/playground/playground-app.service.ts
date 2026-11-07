import { randomBytes } from "crypto";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import path from "path";
import { UserRequest } from "../permissions/dto";
import {
  playgroundApiMethod,
  playgroundApiPath,
  runPlaygroundRoute,
  runServerFunction,
  type PlaygroundApiFile,
} from "./playground-call";
import {
  ensurePlayground,
  isSourceFile,
  playgroundFolder,
  readData,
  readSource,
  removePlaygroundFolder,
  runSql,
  writeData,
  writeSource,
  type SourceFile,
} from "./playground-disk";
import { playgroundException } from "./playground.errors";
import { fetchOnApp } from "./playground-fetch";
import { PlaygroundService } from "./playground.service";

const CALL_LIMIT = 4;
const CALL_QUEUE = 8;
const CALL_WAIT_MS = 2000;

type Waiter = {
  start: () => void;
  timer: ReturnType<typeof setTimeout>;
  settled: boolean;
};

@Injectable()
export class PlaygroundAppService {
  private active = 0;
  private readonly waiting: Waiter[] = [];

  constructor(
    private readonly config: ConfigService,
    private readonly playgrounds: PlaygroundService,
  ) {}

  async discard(id: string) {
    await removePlaygroundFolder(playgroundFolder(this.storageRoot(), id));
  }

  async prepare(id: string, user: UserRequest) {
    const folder = await this.folder(id, user);
    return this.sources(folder);
  }

  async readApp(id: string, user: UserRequest) {
    return this.sources(await this.folder(id, user));
  }

  async writeApp(id: string, user: UserRequest, name: string, text: string) {
    if (!isSourceFile(name)) throw playgroundException("PG_025");
    const folder = await this.folder(id, user);
    await writeSource(folder, name, text);
    return this.sources(folder);
  }

  async query(id: string, user: UserRequest, statement: string, params: unknown) {
    return runSql(await this.live(id, user), statement, params);
  }

  async readFile(id: string, user: UserRequest, name: string) {
    return readData(await this.live(id, user), name);
  }

  async writeFile(id: string, user: UserRequest, name: string, bytes: Buffer, mime?: string) {
    await writeData(await this.live(id, user), name, bytes, mime);
    return { name };
  }

  async fetch(
    id: string,
    user: UserRequest,
    path: string,
    method: string | undefined,
    body: unknown,
    authorization?: string,
    locale?: string,
  ) {
    await this.live(id, user);
    const configured = this.config.get<string>("API_PUBLIC_URL");
    const port = this.config.get<string>("PORT") || "3004";
    const base = configured || `http://127.0.0.1:${port}`;
    return fetchOnApp({ base, path, method, body, authorization, locale });
  }

  async dispatch(
    id: string,
    user: UserRequest,
    method: string,
    requestPath: unknown,
    body: unknown,
    query: Record<string, string>,
    upload: { bytes: Buffer; mime?: string; filename?: string } | null,
    authorization?: string,
    locale?: string,
  ): Promise<{ kind: "json"; value: unknown } | { kind: "file"; bytes: Buffer; mime: string }> {
    const verb = playgroundApiMethod(method);
    const apiPath = playgroundApiPath(requestPath);
    const folder = await this.live(id, user);
    const source = await readSource(folder, "server.js");
    let pending = upload?.bytes?.length ? upload : null;
    const result = await this.slot(() =>
      runPlaygroundRoute(
        source,
        {
          method: verb,
          path: apiPath,
          body: body ?? null,
          query,
          file: pending ? uploadFile(pending) : null,
        },
        {
          sql: async (statement, params) => runSql(folder, String(statement || ""), params),
          fetch: async (target, init) =>
            this.fetch(id, user, String(target || ""), init?.method, init?.body, authorization, locale),
          save: async (name) => {
            if (!pending || !pending.bytes.length) throw playgroundException("PG_025");
            const stored = name.trim() || `file/${randomBytes(8).toString("hex")}`;
            const mime = await writeData(folder, stored, pending.bytes, pending.mime);
            pending = null;
            return { name: stored, mime };
          },
        },
      ),
    );
    if (result.kind === "file") {
      const file = await readData(folder, result.name);
      return { kind: "file", bytes: file.bytes, mime: file.mime };
    }
    return result;
  }

  async call(
    id: string,
    user: UserRequest,
    name: string,
    argument: unknown,
    authorization?: string,
    locale?: string,
  ) {
    const folder = await this.live(id, user);
    const source = await readSource(folder, "server.js");
    return this.slot(() =>
      runServerFunction(source, name, argument, {
        sql: async (statement, params) => runSql(folder, String(statement || ""), params),
        fetch: async (requestPath, init) =>
          this.fetch(id, user, String(requestPath || ""), init?.method, init?.body, authorization, locale),
        readFile: async (fileName) => {
          const file = await readData(folder, String(fileName || ""));
          return { mime: file.mime, bytes: new Uint8Array(file.bytes) };
        },
        writeFile: async (fileName, contents) => {
          const bytes = fileContents(contents);
          await writeData(folder, String(fileName || ""), bytes);
          return { name: fileName };
        },
      }),
    );
  }

  private async sources(folder: string) {
    const [indexHtml, appJs, serverJs] = await Promise.all([
      readSource(folder, "index.html"),
      readSource(folder, "app.js"),
      readSource(folder, "server.js"),
    ]);
    return {
      "index.html": indexHtml,
      "app.js": appJs,
      "server.js": serverJs,
    } satisfies Record<SourceFile, string>;
  }

  private async folder(id: string, user: UserRequest) {
    await this.playgrounds.requirePlayground(id, user);
    const folder = playgroundFolder(this.storageRoot(), id);
    await ensurePlayground(folder);
    return folder;
  }

  private async live(id: string, user: UserRequest) {
    await this.playgrounds.requireWritable(id, user);
    const folder = playgroundFolder(this.storageRoot(), id);
    await ensurePlayground(folder);
    return folder;
  }

  private storageRoot() {
    const configured = this.config.get<string>("FILE_STORAGE_DIR");
    return path.resolve(process.cwd(), configured || "storage", "playgrounds");
  }

  private slot<T>(work: () => Promise<T>): Promise<T> {
    if (this.active >= CALL_LIMIT) {
      if (this.waiting.length >= CALL_QUEUE) throw playgroundException("PG_012");
      return new Promise<T>((resolve, reject) => {
        const waiter: Waiter = {
          settled: false,
          timer: setTimeout(() => {
            if (waiter.settled) return;
            const index = this.waiting.indexOf(waiter);
            if (index >= 0) this.waiting.splice(index, 1);
            waiter.settled = true;
            reject(playgroundException("PG_013"));
          }, CALL_WAIT_MS),
          start: () => undefined,
        };
        waiter.start = () => {
          if (waiter.settled) return;
          waiter.settled = true;
          clearTimeout(waiter.timer);
          resolve(this.occupy(work));
        };
        this.waiting.push(waiter);
      });
    }
    return this.occupy(work);
  }

  private async occupy<T>(work: () => Promise<T>) {
    this.active += 1;
    try {
      return await work();
    } finally {
      this.active -= 1;
      const next = this.waiting.shift();
      next?.start();
    }
  }
}

function uploadFile(upload: { bytes: Buffer; mime?: string; filename?: string }): PlaygroundApiFile {
  const filename = String(upload.filename || "attachment").split(/[/\\]/).pop() || "attachment";
  return {
    filename: filename.slice(0, 128),
    mime: String(upload.mime || "application/octet-stream").slice(0, 128),
    size: upload.bytes.length,
  };
}

function fileContents(contents: unknown) {
  if (typeof contents === "string" && contents.length) return Buffer.from(contents);
  if (Buffer.isBuffer(contents)) return contents;
  if (contents instanceof Uint8Array && contents.byteLength) return Buffer.from(contents);
  if (contents instanceof ArrayBuffer && contents.byteLength) return Buffer.from(contents);
  throw playgroundException("PG_025");
}
