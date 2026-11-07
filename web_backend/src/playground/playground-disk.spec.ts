import { access, mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import {
  ensurePlayground,
  playgroundFolder,
  readData,
  readSource,
  removePlaygroundFolder,
  runSql,
  writeData,
  writeSource,
} from "./playground-disk";

describe("playground disk", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "playground-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("creates the page, the script, and a database file", async () => {
    const folder = playgroundFolder(root, "pg-1");
    await ensurePlayground(folder);
    expect(await readSource(folder, "index.html")).toContain('id="app"');
    expect(await readSource(folder, "app.js")).toContain("Playground");
    expect(await readSource(folder, "server.js")).toBe("");
    const created = runSql(folder, "create table notes(body text)", []);
    expect(created.changes).toBe(0);
    runSql(folder, "insert into notes(body) values (?)", ["Torque"]);
    expect(runSql(folder, "select body from notes", []).rows).toEqual([{ body: "Torque" }]);
  });

  it("rejects a second statement and an attach", async () => {
    const folder = playgroundFolder(root, "pg-1");
    await ensurePlayground(folder);
    expect(() => runSql(folder, "select 1; select 2", [])).toThrow(
      expect.objectContaining({ response: expect.objectContaining({ key: "PG_023" }) }),
    );
    expect(() => runSql(folder, "attach database ':memory:' as other", [])).toThrow(
      expect.objectContaining({ response: expect.objectContaining({ key: "PG_023" }) }),
    );
  });

  it("keeps a quoted word and writes a file under files/", async () => {
    const folder = playgroundFolder(root, "pg-1");
    await ensurePlayground(folder);
    expect(runSql(folder, "select 'attach' as word", []).rows).toEqual([{ word: "attach" }]);
    await writeData(folder, "note.txt", Buffer.from("Torque"), "text/plain");
    expect(await readFile(path.join(folder, "files", "note.txt"), "utf8")).toBe("Torque");
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
    await writeData(folder, "image/sadadas123asdaadsa", png, "image/png");
    const image = await readData(folder, "image/sadadas123asdaadsa");
    expect(image.mime).toBe("image/png");
    expect(image.bytes.equals(png)).toBe(true);
    await expect(writeData(folder, "../server.js", Buffer.from("no"))).rejects.toMatchObject({
      response: { key: "PG_025" },
    });
    await expect(readData(folder, "image/../../server.js")).rejects.toMatchObject({
      response: { key: "PG_025" },
    });
    await writeSource(folder, "server.js", "async function save() { return 1 }\n");
    expect(await readSource(folder, "server.js")).toContain("function save");
    await writeSource(folder, "server.js", "  ");
    expect(await readSource(folder, "server.js")).toBe("");
  });

  it("removes the playground folder", async () => {
    const folder = playgroundFolder(root, "pg-1");
    await ensurePlayground(folder);
    await removePlaygroundFolder(folder);
    await expect(access(folder)).rejects.toMatchObject({ code: "ENOENT" });
  });
});
