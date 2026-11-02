import JSZip from "jszip";

/** Same fill the editor stores for read-only masks. Not a Word highlight keyword, so it is saved as run shading. */
export const READER_MASK_FILL = "6D28D9";

const REDACTION_CHAR = "\u2588";
const WORD_XML = /^word\/[^/]+\.xml$/i;

type RunRange = { start: number; end: number };

function decodeXml(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number(num)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function encodeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function isSpace(char: string): boolean {
  return char === " " || char === "\n" || char === "\t" || char === "\u00a0";
}

function redactPlain(text: string): string {
  return [...text].map((char) => (isSpace(char) ? char : REDACTION_CHAR)).join("");
}

function isRedactionText(text: string): boolean {
  let sawBar = false;
  for (const char of text) {
    if (char === REDACTION_CHAR) {
      sawBar = true;
      continue;
    }
    if (isSpace(char)) continue;
    return false;
  }
  return sawBar;
}

function leafRunRanges(xml: string): RunRange[] {
  const pattern = /<(\/?)w:r(?=[\s>/])/g;
  const stack: Array<{ start: number; hasChild: boolean }> = [];
  const leaves: RunRange[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(xml))) {
    const tagStart = match.index;
    const close = xml.indexOf(">", tagStart);
    if (close === -1) break;
    if (match[1] !== "/" && xml[close - 1] === "/") continue;
    if (match[1] !== "/") {
      stack.push({ start: tagStart, hasChild: false });
      continue;
    }
    const open = stack.pop();
    if (!open) continue;
    if (stack.length > 0) stack[stack.length - 1].hasChild = true;
    if (!open.hasChild) leaves.push({ start: open.start, end: close + 1 });
  }
  return leaves;
}

function mapLeafRuns(xml: string, map: (runXml: string) => string): string {
  const runs = leafRunRanges(xml);
  let cursor = 0;
  let out = "";
  for (const run of runs) {
    out += xml.slice(cursor, run.start);
    out += map(xml.slice(run.start, run.end));
    cursor = run.end;
  }
  return out + xml.slice(cursor);
}

function runProperties(runXml: string): string {
  return runXml.match(/<w:rPr\b[^>]*>[\s\S]*?<\/w:rPr>/)?.[0] ?? "";
}

function runIsMasked(runXml: string): boolean {
  const properties = runProperties(runXml);
  if (!properties) return false;
  for (const fill of properties.matchAll(/\bw:fill="([^"]+)"/gi)) {
    if (fill[1].replace(/^#/, "").toUpperCase() === READER_MASK_FILL) return true;
  }
  for (const highlight of properties.matchAll(
    /<w:highlight\b[^>]*\bw:val="([^"]+)"/gi,
  )) {
    if (highlight[1].replace(/^#/, "").toUpperCase() === READER_MASK_FILL) {
      return true;
    }
  }
  return false;
}

function runPlainText(runXml: string): string {
  let text = "";
  for (const part of runXml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)) {
    text += decodeXml(part[1]);
  }
  return text;
}

function withMaskShading(properties: string): string {
  const shading = `<w:shd w:val="clear" w:color="auto" w:fill="${READER_MASK_FILL}"/>`;
  if (!properties) return `<w:rPr>${shading}</w:rPr>`;
  if (/<w:shd\b/i.test(properties)) {
    return properties.replace(/<w:shd\b[^>]*\/?>/i, shading);
  }
  return properties.replace(/<\/w:rPr>/i, `${shading}</w:rPr>`);
}

function runWithText(runXml: string, text: string, masked: boolean): string {
  const open = runXml.match(/^<w:r\b[^>]*>/)?.[0] ?? "<w:r>";
  const properties = masked
    ? withMaskShading(runProperties(runXml))
    : runProperties(runXml);
  return `${open}${properties}<w:t xml:space="preserve">${encodeXml(text)}</w:t></w:r>`;
}

function redactRun(runXml: string): string {
  if (!runIsMasked(runXml)) return runXml;
  return runXml.replace(
    /<w:(t|delText)(\b[^>]*)>([\s\S]*?)<\/w:\1>/g,
    (_all, tag: string, attrs: string, text: string) => {
      const space = /\bxml:space=/.test(attrs)
        ? attrs
        : `${attrs} xml:space="preserve"`;
      return `<w:${tag}${space}>${encodeXml(redactPlain(decodeXml(text)))}</w:${tag}>`;
    },
  );
}

function restoreRun(
  runXml: string,
  secrets: string[],
  cursor: { index: number },
): string {
  const plain = runPlainText(runXml);
  const masked = runIsMasked(runXml);
  if (!plain.includes(REDACTION_CHAR)) {
    if (masked && secrets[cursor.index] === plain) cursor.index += 1;
    return runXml;
  }
  if (!isRedactionText(plain)) {
    const pieces = plain.split(/(\u2588+)/);
    return pieces
      .filter((piece) => piece.length > 0)
      .map((piece) => {
        if (!isRedactionText(piece)) return runWithText(runXml, piece, false);
        const secret = secrets[cursor.index];
        if (secret === undefined) return runWithText(runXml, piece, true);
        cursor.index += 1;
        return runWithText(runXml, secret, true);
      })
      .join("");
  }
  const secret = secrets[cursor.index];
  if (secret === undefined) return runXml;
  cursor.index += 1;
  return runWithText(runXml, secret, masked || true);
}

async function wordXmlNames(zip: JSZip): Promise<string[]> {
  return Object.keys(zip.files).filter(
    (name) => WORD_XML.test(name) && !zip.files[name].dir,
  );
}

async function editWordXml(
  buffer: Buffer,
  edit: (name: string, xml: string, zip: JSZip) => Promise<string | null>,
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer);
  for (const name of await wordXmlNames(zip)) {
    const file = zip.file(name);
    if (!file) continue;
    const xml = await file.async("string");
    const next = await edit(name, xml, zip);
    if (next != null && next !== xml) zip.file(name, next);
  }
  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
}

export async function redactMaskedDocx(buffer: Buffer): Promise<Buffer> {
  return editWordXml(buffer, async (_name, xml) =>
    mapLeafRuns(xml, (run) => redactRun(run)),
  );
}

/**
 * Puts the original masked words back into a file that was saved from a
 * redacted preview, and keeps the mask shading. Reviewers can change
 * comments and ordinary highlights without replacing the stored words.
 * If a part no longer contains every mask placeholder, that part is kept
 * from the original so the words are not dropped.
 */
export async function restoreMaskedDocx(
  original: Buffer,
  uploaded: Buffer,
): Promise<Buffer> {
  const originalZip = await JSZip.loadAsync(original);
  const secretsByPart = new Map<string, string[]>();
  const originalXml = new Map<string, string>();
  for (const name of await wordXmlNames(originalZip)) {
    const file = originalZip.file(name);
    if (!file) continue;
    const xml = await file.async("string");
    originalXml.set(name, xml);
    const secrets: string[] = [];
    mapLeafRuns(xml, (run) => {
      if (runIsMasked(run)) secrets.push(runPlainText(run));
      return run;
    });
    if (secrets.length > 0) secretsByPart.set(name, secrets);
  }
  if (secretsByPart.size === 0) return uploaded;

  const uploadedZip = await JSZip.loadAsync(uploaded);
  for (const [name, secrets] of secretsByPart) {
    const originalPart = originalXml.get(name);
    const uploadedFile = uploadedZip.file(name);
    if (!originalPart || !uploadedFile) {
      if (originalPart) uploadedZip.file(name, originalPart);
      continue;
    }
    const xml = await uploadedFile.async("string");
    const cursor = { index: 0 };
    const next = mapLeafRuns(xml, (run) => restoreRun(run, secrets, cursor));
    uploadedZip.file(
      name,
      cursor.index === secrets.length ? next : originalPart,
    );
  }
  return uploadedZip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
}
