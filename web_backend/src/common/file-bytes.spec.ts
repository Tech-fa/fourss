import { assertFileSize, bytesFromProgram, CONNECTION_FILE_BYTES } from "./file-bytes";

describe("connection file bytes", () => {
  it("keeps a binary string byte for byte", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(bytesFromProgram(png.toString("latin1"))).toEqual(png);
  });

  it("reads a Uint8Array and a byte list", () => {
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47]);
    expect(bytesFromProgram(png)).toEqual(Buffer.from(png));
    expect(bytesFromProgram([0x89, 0x50])).toEqual(Buffer.from([0x89, 0x50]));
  });

  it("rejects a file over 20 MB", () => {
    expect(() => assertFileSize(Buffer.alloc(CONNECTION_FILE_BYTES + 1))).toThrow("larger than 20 MB");
  });
});
