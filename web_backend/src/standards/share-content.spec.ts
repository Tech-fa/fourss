import * as crypto from "crypto";
import {
  buildChunkParts,
  classifySharedContent,
  decryptBuffer,
  encryptBuffer,
  restoreChunk,
} from "./share-content";

describe("shared document content", () => {
  it("restores a file only after both split parts are combined", () => {
    const bytes = Buffer.from("%PDF-1.4 abcdefghijklmnopqrstuvwxyz");
    const secret = crypto.randomBytes(32);
    const restored: Buffer[] = [];

    for (let index = 0, start = 0; start < bytes.length; index += 1, start += 8) {
      const built = buildChunkParts(bytes.subarray(start, start + 8), secret, index);
      expect(built.material.data).not.toEqual(bytes.subarray(start, start + 8).toString("base64url"));
      restored.push(
        restoreChunk(
          built.material,
          built.cover,
          built.materialKey,
          built.coverKey,
        ),
      );
    }

    expect(Buffer.concat(restored).equals(bytes)).toBe(true);
  });

  it("uses a ciphertext layout webcrypto can decrypt", async () => {
    const key = crypto.randomBytes(32);
    const plain = Buffer.from("shared-bytes");
    const part = encryptBuffer(plain, key);
    const subtleKey = await crypto.subtle.importKey("raw", key, "AES-GCM", false, [
      "decrypt",
    ]);
    const combined = Buffer.concat([
      Buffer.from(part.data, "base64url"),
      Buffer.from(part.tag, "base64url"),
    ]);
    const out = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: Buffer.from(part.iv, "base64url") },
      subtleKey,
      combined,
    );

    expect(Buffer.from(out).equals(plain)).toBe(true);
    expect(decryptBuffer(part, key).equals(plain)).toBe(true);
  });

  it("classifies previewable files and refuses the rest", () => {
    expect(classifySharedContent("policy.pdf", Buffer.from("%PDF-1.4")).kind).toBe("pdf");
    expect(
      classifySharedContent(
        "scan.png",
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ).mime,
    ).toBe("image/png");
    expect(classifySharedContent("policy.docx", Buffer.from("PK")).kind).toBe("docx");
    expect(classifySharedContent("logo.svg", Buffer.from("<svg></svg>")).kind).toBe(
      "unsupported",
    );
    expect(classifySharedContent("sheet.xlsx", Buffer.from([0x50, 0x4b, 0x03, 0x04])).kind).toBe(
      "unsupported",
    );
    expect(classifySharedContent("note.html", Buffer.from("<p>Hello</p>")).kind).toBe("html");
  });
});
