import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { playgroundApiPath, runPlaygroundRoute, runServerFunction } from "./playground-call";
import {
  ensurePlayground,
  playgroundFolder,
  readSource,
  runSql,
  readData,
  writeData,
  writeSource,
} from "./playground-disk";
import { appPath, fetchOnApp } from "./playground-fetch";

describe("playground call", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "playground-call-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("runs a server function against that folder and a same-app path", async () => {
    const folder = playgroundFolder(root, "pg-1");
    await ensurePlayground(folder);
    await writeSource(
      folder,
      "server.js",
      `async function saveNote(playground, body) {
        await playground.sql('create table if not exists notes(body text)');
        await playground.sql('insert into notes(body) values (?)', [body.note]);
        const saved = await playground.sql('select body from notes');
        const linked = await playground.fetch('/documents/doc-1');
        await playground.writeFile('image/sadadas123asdaadsa', body.note);
        return { saved, linked };
      }`,
    );
    const result = await runServerFunction(
      await readSource(folder, "server.js"),
      "saveNote",
      { note: "Torque" },
      {
        sql: async (statement, params) => runSql(folder, String(statement), params),
        fetch: async (requestPath) => {
          expect(appPath(String(requestPath))).toBe("/documents/doc-1");
          return { status: 200, body: { id: "doc-1", name: "Policy" } };
        },
        readFile: async () => null,
        writeFile: async (name, contents) => {
          await writeData(folder, String(name), Buffer.from(String(contents)));
          return { name };
        },
      },
    );
    expect(result).toEqual({
      saved: { rows: [{ body: "Torque" }], changes: 0, lastInsertRowid: null },
      linked: { status: 200, body: { id: "doc-1", name: "Policy" } },
    });
    expect(await readFile(path.join(folder, "files", "image", "sadadas123asdaadsa"), "utf8")).toBe("Torque");
  });

  it("reads an attachment stored by its path", async () => {
    const folder = playgroundFolder(root, "pg-1");
    await ensurePlayground(folder);
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    await writeData(folder, "image/sadadas123asdaadsa", png, "image/png");
    await writeSource(
      folder,
      "server.js",
      `async function load(playground) {
        const file = await playground.readFile('image/sadadas123asdaadsa');
        return { mime: file.mime, size: file.bytes.length };
      }`,
    );
    const result = await runServerFunction(await readSource(folder, "server.js"), "load", null, {
      sql: async () => null,
      fetch: async () => null,
      readFile: async (name) => {
        const file = await readData(folder, String(name));
        return { mime: file.mime, bytes: new Uint8Array(file.bytes) };
      },
      writeFile: async () => null,
    });
    expect(result).toEqual({ mime: "image/png", size: png.length });
  });

  it("runs the playground route that matches the request", async () => {
    const folder = playgroundFolder(root, "pg-1");
    await ensurePlayground(folder);
    const source = `
      route('POST', '/photos', async (playground, request) => {
        const saved = await playground.save(request.file, 'image/' + request.body.id);
        await playground.sql('create table if not exists photos(name text)');
        await playground.sql('insert into photos(name) values (?)', [saved.name]);
        return saved;
      });
      route('GET', '/photos/:name', async (playground, request) => playground.open('image/' + request.params.name));
    `;
    const host = {
      sql: async (statement: string, params: unknown) => runSql(folder, statement, params),
      fetch: async () => null,
      save: async (name: string) => {
        await writeData(folder, name, Buffer.from("photo"));
        return { name, mime: "image/png" };
      },
    };
    const saved = await runPlaygroundRoute(
      source,
      {
        method: "POST",
        path: "/photos",
        body: { id: "sadadas123asdaadsa" },
        query: {},
        file: { filename: "shot.png", mime: "image/png", size: 5 },
      },
      host,
    );
    expect(saved).toEqual({ kind: "json", value: { name: "image/sadadas123asdaadsa", mime: "image/png" } });
    expect(await readFile(path.join(folder, "files", "image", "sadadas123asdaadsa"), "utf8")).toBe("photo");
    const opened = await runPlaygroundRoute(
      source,
      { method: "GET", path: "/photos/sadadas123asdaadsa", body: null, query: {}, file: null },
      host,
    );
    expect(opened).toEqual({ kind: "file", name: "image/sadadas123asdaadsa" });
    expect(playgroundApiPath(["photos", "sadadas123asdaadsa"])).toBe("/photos/sadadas123asdaadsa");
    await expect(
      runPlaygroundRoute(source, { method: "GET", path: "/missing", body: null, query: {}, file: null }, host),
    ).rejects.toMatchObject({ response: { key: "PG_028" } });
    await expect(
      runPlaygroundRoute("route('TRACE', '/x', async () => null)", { method: "GET", path: "/x", body: null, query: {}, file: null }, host),
    ).rejects.toMatchObject({ response: { key: "PG_029" } });
  });

  it("hides process from the function and rejects another host", async () => {
    const folder = playgroundFolder(root, "pg-1");
    await ensurePlayground(folder);
    await writeSource(folder, "server.js", "async function leak() { return process.env.SECRET }");
    await expect(
      runServerFunction(await readSource(folder, "server.js"), "leak", null, idleHost()),
    ).rejects.toMatchObject({ response: { key: "PG_014" } });
    expect(() => appPath("https://example.com/documents/1")).toThrow();
    expect(() => appPath("/playgrounds/pg-1/sql")).toThrow();
  });

  it("returns the status from a same-app fetch", async () => {
    const seen: string[] = [];
    const result = await fetchOnApp({
      base: "http://127.0.0.1:3004",
      path: "/documents/doc-1",
      authorization: "Bearer token",
      send: async (url, init) => {
        seen.push(String(url));
        expect(init?.headers).toMatchObject({ authorization: "Bearer token" });
        expect(init?.redirect).toBe("manual");
        return new Response(JSON.stringify({ id: "doc-1" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    });
    expect(seen).toEqual(["http://127.0.0.1:3004/documents/doc-1"]);
    expect(result).toEqual({ status: 200, body: { id: "doc-1" } });
  });
});

function idleHost() {
  return {
    sql: async () => null,
    fetch: async () => null,
    readFile: async () => null,
    writeFile: async () => null,
  };
}
