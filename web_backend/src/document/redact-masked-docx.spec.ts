import JSZip from "jszip";
import { redactMaskedDocx, restoreMaskedDocx } from "./redact-masked-docx";

const DOCUMENT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:t>Hello </w:t></w:r>
      <w:r>
        <w:rPr><w:shd w:val="clear" w:color="auto" w:fill="6D28D9"/></w:rPr>
        <w:t>secret</w:t>
      </w:r>
      <w:r><w:t> world</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;

async function docxWith(documentXml: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("word/document.xml", documentXml);
  return zip.generateAsync({ type: "nodebuffer" });
}

async function documentXml(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  return zip.file("word/document.xml")!.async("string");
}

describe("redactMaskedDocx", () => {
  it("replaces masked words and leaves the rest of the paragraph", async () => {
    const redacted = await documentXml(await redactMaskedDocx(await docxWith(DOCUMENT)));

    expect(redacted).not.toContain("secret");
    expect(redacted).toContain("Hello ");
    expect(redacted).toContain(" world");
    expect(redacted).toContain("\u2588".repeat("secret".length));
    expect(redacted).toContain('w:fill="6D28D9"');
  });
});

describe("restoreMaskedDocx", () => {
  it("keeps an upload that still has the masked words", async () => {
    const original = await docxWith(DOCUMENT);
    const edited = DOCUMENT.replace(" world", " edited");
    const restored = await documentXml(
      await restoreMaskedDocx(original, await docxWith(edited)),
    );

    expect(restored).toContain("secret");
    expect(restored).toContain(" edited");
    expect(restored).toContain('w:fill="6D28D9"');
  });

  it("puts the original words back when a preview save has only the redaction bars", async () => {
    const original = await docxWith(DOCUMENT);
    const redactedXml = await documentXml(await redactMaskedDocx(original));
    const unshaded = redactedXml.replace(/<w:rPr>[\s\S]*?<\/w:rPr>/, "");
    const uploaded = await docxWith(unshaded);

    const restored = await documentXml(await restoreMaskedDocx(original, uploaded));

    expect(restored).toContain("secret");
    expect(restored).toContain('w:fill="6D28D9"');
    expect(restored).toContain("Hello ");
    expect(restored).not.toContain("\u2588");
  });
});
