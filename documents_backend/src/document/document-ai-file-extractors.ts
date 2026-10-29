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
  // pdf-parse v2: new PDFParse({ data: buffer }).getText()
  // Source: https://github.com/mehmet-kozan/pdf-parse#getting-started-with-v2-coming-from-v1
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return (result.text || '').trim();
  } finally {
    await parser.destroy();
  }
}

export async function extractImageText(buffer: Buffer): Promise<string> {
  const worker = await createWorker('eng');
  try {
    const { data } = await worker.recognize(buffer);
    return (data.text || '').trim();
  } finally {
    await worker.terminate();
  }
}

export const defaultFileTextExtractors: FileTextExtractors = {
  extractDocx: extractDocxText,
  extractPdf: extractPdfText,
  extractImage: extractImageText,
};
