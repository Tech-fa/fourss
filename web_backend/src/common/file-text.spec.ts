import { extractStoredFileText } from "./file-text";

describe("stored file text", () => {
  it("reads text, json, and csv as extracted text", async () => {
    const text = await extractStoredFileText(Buffer.from("policy,open"), "policy.csv", "text/csv");
    expect(text).toEqual({ text: "policy,open", source: "extracted" });
    const json = await extractStoredFileText(Buffer.from('{"ok":true}'), "note.json", "application/json");
    expect(json.source).toBe("extracted");
    expect(json.text).toContain("ok");
  });

  it("marks a picture as OCR and keeps a pdf text layer", async () => {
    const image = await extractStoredFileText(Buffer.from("png"), "shot.png", "image/png", {
      image: async () => ({ text: "security policy", confidence: 87.5 }),
    });
    expect(image).toEqual({ text: "security policy", source: "ocr", confidence: 87.5 });

    const pdf = await extractStoredFileText(Buffer.from("pdf"), "policy.pdf", "application/pdf", {
      pdf: async () => ({ text: "clause 7", pages: 2 }),
    });
    expect(pdf).toEqual({ text: "clause 7", source: "extracted", pages: 2 });
  });

  it("says when a file has no reader", async () => {
    await expect(extractStoredFileText(Buffer.from("zip"), "bundle.bin", "application/octet-stream")).rejects.toThrow(
      "cannot be read as text",
    );
  });
});
