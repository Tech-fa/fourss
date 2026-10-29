import {
  detectSourceKind,
  extractChecklistText,
  extractFileText,
} from './document-ai-extract';

describe('document-ai-extract', () => {
  describe('detectSourceKind', () => {
    it('classifies pdf, docx, and images', () => {
      expect(detectSourceKind('policy.PDF')).toBe('pdf');
      expect(detectSourceKind('sop.docx')).toBe('docx');
      expect(detectSourceKind('scan.PNG')).toBe('image');
      expect(detectSourceKind('photo.jpeg')).toBe('image');
    });

    it('marks other files unsupported', () => {
      expect(detectSourceKind('notes.xlsx')).toBe('unsupported');
      expect(detectSourceKind('')).toBe('unsupported');
    });
  });

  describe('extractChecklistText', () => {
    it('serializes questions in order with type flags', () => {
      const text = extractChecklistText({
        title: 'Incoming inspection',
        documentCode: 'SOP-12',
        questions: [
          {
            questionText: 'Record defects',
            questionType: 'TEXTAREA',
            required: false,
            orderIndex: 1,
          },
          {
            questionText: 'Is the lot identified?',
            questionType: 'YES_NO',
            required: true,
            orderIndex: 0,
          },
        ],
      });

      expect(text).toBe(
        [
          '# Incoming inspection',
          'Code: SOP-12',
          'Type: CHECKLIST',
          '',
          '1. [YES_NO, required] Is the lot identified?',
          '2. [TEXTAREA] Record defects',
        ].join('\n'),
      );
    });
  });

  describe('extractFileText', () => {
    it('routes buffers to the matching extractor', async () => {
      const extractors = {
        extractDocx: jest.fn().mockResolvedValue('docx text'),
        extractPdf: jest.fn().mockResolvedValue('pdf text'),
        extractImage: jest.fn().mockResolvedValue('ocr text'),
      };
      const buffer = Buffer.from('file');

      await expect(extractFileText('docx', buffer, extractors)).resolves.toBe(
        'docx text',
      );
      await expect(extractFileText('pdf', buffer, extractors)).resolves.toBe(
        'pdf text',
      );
      await expect(extractFileText('image', buffer, extractors)).resolves.toBe(
        'ocr text',
      );
      expect(extractors.extractDocx).toHaveBeenCalledWith(buffer);
      expect(extractors.extractPdf).toHaveBeenCalledWith(buffer);
      expect(extractors.extractImage).toHaveBeenCalledWith(buffer);
    });

    it('rejects unsupported kinds', async () => {
      await expect(
        extractFileText('unsupported', Buffer.from('x'), {
          extractDocx: jest.fn(),
          extractPdf: jest.fn(),
          extractImage: jest.fn(),
        }),
      ).rejects.toThrow('unsupported source kind');
    });
  });
});
