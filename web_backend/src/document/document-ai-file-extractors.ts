import { createHash } from 'crypto';
import * as mammoth from 'mammoth';
import { createWorker } from 'tesseract.js';
import { FileTextExtractors } from './document-ai-extract';

// Tesseract.js Node OCR. Official API: createWorker(lang) then worker.recognize(image)
// Source: https://github.com/naptha/tesseract.js#readme
// Image types (bmp, jpg, png, pbm, webp, gif) as Buffer:
// https://github.com/naptha/tesseract.js/blob/master/docs/image-format.md

export function hashContent(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

export async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return (result.value || '').trim();
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  return (await extractPdfDetails(buffer)).text;
}

export async function extractPdfDetails(buffer: Buffer): Promise<{ text: string; pages: number }> {
  // pdf-parse v2: new PDFParse({ data: buffer }).getText() returns text and total pages.
  // Source: https://github.com/mehmet-kozan/pdf-parse#getting-started-with-v2-coming-from-v1
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return { text: (result.text || '').trim(), pages: result.total };
  } finally {
    await parser.destroy();
  }
}

export async function extractImageText(buffer: Buffer): Promise<string> {
  return (await extractImageDetails(buffer)).text;
}

export async function extractImageDetails(buffer: Buffer): Promise<{ text: string; confidence?: number }> {
  // worker.recognize returns data.text and data.confidence (0-100).
  // Source: https://github.com/naptha/tesseract.js#readme
  const worker = await createWorker('eng');
  try {
    const { data } = await worker.recognize(buffer);
    const confidence = typeof data.confidence === 'number' ? data.confidence : undefined;
    return { text: (data.text || '').trim(), confidence };
  } finally {
    await worker.terminate();
  }
}

export const defaultFileTextExtractors: FileTextExtractors = {
  extractDocx: extractDocxText,
  extractPdf: extractPdfText,
  extractImage: extractImageText,
};
