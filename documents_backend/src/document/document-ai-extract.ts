export type DocumentAiSourceKind =
  | 'checklist'
  | 'docx'
  | 'pdf'
  | 'image'
  | 'unsupported';

export type DocumentAiChecklistQuestion = {
  questionText: string;
  questionType: string;
  required: boolean;
  orderIndex: number;
};

export type FileTextExtractors = {
  extractDocx: (buffer: Buffer) => Promise<string>;
  extractPdf: (buffer: Buffer) => Promise<string>;
  extractImage: (buffer: Buffer) => Promise<string>;
};

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp|tiff?)$/i;

export function detectSourceKind(fileName: string): DocumentAiSourceKind {
  const name = (fileName || '').trim().toLowerCase();
  if (name.endsWith('.pdf')) {
    return 'pdf';
  }
  if (name.endsWith('.docx')) {
    return 'docx';
  }
  if (IMAGE_EXT.test(name)) {
    return 'image';
  }
  return 'unsupported';
}

export function extractChecklistText(input: {
  title: string;
  documentCode: string;
  questions: DocumentAiChecklistQuestion[];
}): string {
  const questions = [...(input.questions || [])].sort(
    (left, right) => left.orderIndex - right.orderIndex,
  );
  const lines = [
    `# ${input.title}`,
    `Code: ${input.documentCode}`,
    'Type: CHECKLIST',
    '',
    ...questions.map((question, index) => {
      const flags = [
        question.questionType,
        question.required ? 'required' : null,
      ]
        .filter(Boolean)
        .join(', ');
      return `${index + 1}. [${flags}] ${question.questionText}`;
    }),
  ];
  return lines.join('\n').trim();
}

export async function extractFileText(
  kind: DocumentAiSourceKind,
  buffer: Buffer,
  extractors: FileTextExtractors,
): Promise<string> {
  if (kind === 'docx') {
    return extractors.extractDocx(buffer);
  }
  if (kind === 'pdf') {
    return extractors.extractPdf(buffer);
  }
  if (kind === 'image') {
    return extractors.extractImage(buffer);
  }
  throw new Error(`unsupported source kind: ${kind}`);
}
