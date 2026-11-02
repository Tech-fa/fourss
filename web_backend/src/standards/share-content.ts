import * as crypto from "crypto";

// A shared file is never returned as one downloadable body. Each chunk is
// XOR-split into two halves, and each half is encrypted on its own. The keys
// are released only after both halves have been fetched.


export const SHARE_CHUNK_BYTES = 256 * 1024;
export const MAX_SHARED_PREVIEW_BYTES = 25 * 1024 * 1024;

export type SharedPreviewKind =
  | "pdf"
  | "image"
  | "docx"
  | "html"
  | "json"
  | "text"
  | "checklist"
  | "none"
  | "unsupported"
  | "too_large";

export type EncryptedPart = {
  iv: string;
  tag: string;
  data: string;
};

const BLOCKED_EXTENSIONS = new Set([
  "svg",
  "svgz",
  "doc",
  "docm",
  "xls",
  "xlsx",
  "xlsm",
  "ppt",
  "pptx",
  "zip",
  "rar",
  "7z",
  "exe",
  "dmg",
  "js",
  "mjs",
]);

const IMAGE_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
};

export function classifySharedContent(
  fileName: string,
  bytes: Buffer,
): { kind: SharedPreviewKind; mime: string } {
  const ext = extensionOf(fileName);
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return { kind: "unsupported", mime: "application/octet-stream" };
  }
  if (startsWithAscii(bytes, "%PDF")) {
    return { kind: "pdf", mime: "application/pdf" };
  }
  const imageMime = imageMimeFromMagic(bytes);
  if (imageMime) return { kind: "image", mime: imageMime };
  if (ext === "pdf") return { kind: "pdf", mime: "application/pdf" };
  if (IMAGE_MIME[ext]) return { kind: "image", mime: IMAGE_MIME[ext] };
  if (ext === "docx") {
    return {
      kind: "docx",
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  }
  if (isZip(bytes)) {
    return { kind: "unsupported", mime: "application/octet-stream" };
  }
  if (ext === "html" || ext === "htm" || looksLikeHtml(bytes)) {
    return { kind: "html", mime: "text/html" };
  }
  if (ext === "json" || (ext === "" && looksLikeJson(bytes))) {
    return { kind: "json", mime: "application/json" };
  }
  if (
    ext === "txt" ||
    ext === "md" ||
    ext === "csv" ||
    (ext === "" && !looksBinary(bytes))
  ) {
    return { kind: "text", mime: "text/plain" };
  }
  return { kind: "unsupported", mime: "application/octet-stream" };
}

export function buildChunkParts(
  chunk: Buffer,
  maskSecret: Buffer,
  index: number,
): {
  material: EncryptedPart;
  cover: EncryptedPart;
  materialKey: string;
  coverKey: string;
} {
  const secrets = chunkSecrets(maskSecret, index, chunk.length);
  return {
    material: encryptBuffer(xorBuffers(chunk, secrets.mask), secrets.materialKey),
    cover: encryptBuffer(secrets.mask, secrets.coverKey),
    materialKey: secrets.materialKey.toString("base64url"),
    coverKey: secrets.coverKey.toString("base64url"),
  };
}

export function chunkSecrets(
  maskSecret: Buffer,
  index: number,
  length: number,
): { mask: Buffer; materialKey: Buffer; coverKey: Buffer } {
  return {
    mask: deriveStream(maskSecret, `cover:${index}`, length),
    materialKey: deriveKey(maskSecret, `material-key:${index}`),
    coverKey: deriveKey(maskSecret, `cover-key:${index}`),
  };
}

export function restoreChunk(
  material: EncryptedPart,
  cover: EncryptedPart,
  materialKey: string,
  coverKey: string,
): Buffer {
  return xorBuffers(
    decryptBuffer(material, Buffer.from(materialKey, "base64url")),
    decryptBuffer(cover, Buffer.from(coverKey, "base64url")),
  );
}

export function encryptBuffer(plain: Buffer, key: Buffer): EncryptedPart {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain), cipher.final()]);
  return {
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    data: data.toString("base64url"),
  };
}

export function decryptBuffer(part: EncryptedPart, key: Buffer): Buffer {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(part.iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(part.tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(part.data, "base64url")),
    decipher.final(),
  ]);
}

export function xorBuffers(left: Buffer, right: Buffer): Buffer {
  if (left.length !== right.length) {
    throw new Error("Chunk length mismatch");
  }
  const out = Buffer.allocUnsafe(left.length);
  for (let index = 0; index < left.length; index += 1) {
    out[index] = left[index] ^ right[index];
  }
  return out;
}

function deriveKey(secret: Buffer, info: string): Buffer {
  return crypto.createHmac("sha256", secret).update(info).digest();
}

function deriveStream(secret: Buffer, info: string, length: number): Buffer {
  const blocks: Buffer[] = [];
  let counter = 0;
  while (Buffer.concat(blocks).length < length) {
    blocks.push(
      crypto
        .createHmac("sha256", secret)
        .update(`${info}:${counter}`)
        .digest(),
    );
    counter += 1;
  }
  return Buffer.concat(blocks).subarray(0, length);
}

function extensionOf(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() || "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

function startsWithAscii(bytes: Buffer, prefix: string): boolean {
  return bytes.subarray(0, prefix.length).toString("ascii") === prefix;
}

function looksBinary(bytes: Buffer): boolean {
  return bytes.subarray(0, 8000).includes(0);
}

function looksLikeHtml(bytes: Buffer): boolean {
  if (looksBinary(bytes)) return false;
  const start = bytes.subarray(0, 200).toString("utf8").trimStart().toLowerCase();
  return (
    start.startsWith("<!doctype html") ||
    start.startsWith("<html") ||
    start.startsWith("<body") ||
    start.startsWith("<div") ||
    start.startsWith("<p") ||
    start.startsWith("<h1") ||
    start.startsWith("<h2") ||
    start.startsWith("<table") ||
    start.startsWith("<section")
  );
}

function looksLikeJson(bytes: Buffer): boolean {
  if (looksBinary(bytes)) return false;
  const start = bytes.subarray(0, 32).toString("utf8").trimStart();
  return start.startsWith("{") || start.startsWith("[");
}

function isZip(bytes: Buffer): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07)
  );
}

function imageMimeFromMagic(bytes: Buffer): string | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  const gif = bytes.subarray(0, 6).toString("ascii");
  if (gif === "GIF87a" || gif === "GIF89a") return "image/gif";
  if (
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  if (bytes.subarray(0, 2).toString("ascii") === "BM") return "image/bmp";
  return null;
}
