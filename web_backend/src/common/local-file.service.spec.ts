import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { LocalFileService } from "./local-file.service";

describe("local file bytes", () => {
  it("stores a file the app can read by id", async () => {
    const dir = await mkdtemp(join(tmpdir(), "connection-file-"));
    const rows: Array<{ id: string; fileUrl: string; fileName: string; contentType: string }> = [];
    const repo = {
      save: async (row: { fileUrl: string; fileName: string; contentType: string }) => {
        const stored = { id: "11111111-1111-4111-8111-111111111111", ...row };
        rows.push(stored);
        return stored;
      },
      findOne: async ({ where }: { where: { id?: string; fileUrl?: string } }) =>
        rows.find((row) => row.id === where.id || row.fileUrl === where.fileUrl) || null,
    };
    const files = new LocalFileService(
      { get: (key: string) => (key === "FILE_STORAGE_DIR" ? dir : key === "API_PUBLIC_URL" ? "http://127.0.0.1:3004" : undefined) } as never,
      repo as never,
    );
    try {
      const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      const saved = await files.saveBytes("shot.png", png, "image/png");
      expect(saved).toMatchObject({
        fileId: "11111111-1111-4111-8111-111111111111",
        name: "shot.png",
        size: 4,
        contentType: "image/png",
      });
      expect(saved.url).toContain("/files/");
      const read = await files.readStored(saved.fileId);
      expect(read?.buffer).toEqual(png);
      expect(await readFile(join(dir, rows[0].fileUrl))).toEqual(png);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
