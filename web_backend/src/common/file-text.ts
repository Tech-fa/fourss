import { extractDocxText, extractImageDetails, extractPdfDetails } from "../document/document-ai-file-extractors";

export type StoredFileText = {
  text: string;
  source: "extracted" | "ocr";
  confidence?: number;
  pages?: number;
};

type Readers = {
  docx: (buffer: Buffer) => Promise<string>;
  pdf: (buffer: Buffer) => Promise<{ text: string; pages: number }>;
  image: (buffer: Buffer) => Promise<{ text: string; confidence?: number }>;
};

const readers: Readers = {
  docx: extractDocxText,
  pdf: extractPdfDetails,
  image: extractImageDetails,
};

export async function extractStoredFileText(
  buffer: Buffer,
  name: string,
  contentType: string | null,
  custom: Partial<Readers> = {},
): Promise<StoredFileText> {
  const read = { ...readers, ...custom };
  const kind = fileKind(name, contentType);
  if (kind === "text") return { text: buffer.toString("utf8"), source: "extracted" };
  if (kind === "docx") return { text: (await read.docx(buffer)).trim(), source: "extracted" };
  if (kind === "pdf") {
    const result = await read.pdf(buffer);
    return { text: result.text.trim(), source: "extracted", pages: result.pages };
  }
  if (kind === "image") {
    const result = await read.image(buffer);
    return { text: result.text.trim(), source: "ocr", confidence: result.confidence };
  }
  throw new Error("This file cannot be read as text.");
}

function fileKind(name: string, contentType: string | null): "text" | "docx" | "pdf" | "image" | "unknown" {
  const type = String(contentType || "").toLowerCase().split(";")[0].trim();
  const file = String(name || "").toLowerCase();
  if (
    type.startsWith("text/") ||
    type === "application/json" ||
    type === "application/csv" ||
    file.endsWith(".csv") ||
    file.endsWith(".json") ||
    file.endsWith(".txt")
  ) {
    return "text";
  }
  if (type.includes("wordprocessingml") || file.endsWith(".docx")) return "docx";
  if (type === "application/pdf" || file.endsWith(".pdf")) return "pdf";
  if (type === "image/png" || type === "image/jpeg" || type === "image/jpg" || /\.jpe?g$/.test(file) || file.endsWith(".png")) {
    return "image";
  }
  return "unknown";
}
