jest.mock('./document.entity', () => ({
  ContentType: { FILE: 'FILE', EDITOR: 'EDITOR', CHECKLIST: 'CHECKLIST' },
  Document: class Document {},
}));
jest.mock('./document-version.entity', () => ({
  DocumentVersion: class DocumentVersion {},
}));
jest.mock('./document-ai-source.entity', () => ({
  DocumentAiIndexStatus: {
    PENDING: 'pending',
    READY: 'ready',
    SKIPPED: 'skipped',
    FAILED: 'failed',
  },
  DocumentAiSourceKind: {
    CHECKLIST: 'checklist',
    DOCX: 'docx',
    PDF: 'pdf',
    IMAGE: 'image',
    UNSUPPORTED: 'unsupported',
  },
  DocumentAiSource: class DocumentAiSource {},
}));
jest.mock('../common/local-file.service', () => ({
  LocalFileService: class LocalFileService {},
}));

import { ContentType } from './document.entity';
import { DocumentAiIndexService } from './document-ai-index.service';
import {
  DocumentAiIndexStatus,
  DocumentAiSourceKind,
} from './document-ai-source.entity';

describe('DocumentAiIndexService', () => {
  const document = {
    id: 'doc-1',
    title: 'Incoming inspection',
    documentCode: 'SOP-12',
    contentType: ContentType.CHECKLIST,
    currentVersion: 1,
    isAiAccessible: true,
    isPublic: false,
    team: { id: 9 },
  };
  const version = {
    id: 44,
    documentId: 'doc-1',
    versionNumber: 1,
    status: 'published',
    file: '',
    content: '',
    checklist: {
      questions: [
        {
          questionText: 'Is the lot identified?',
          questionType: 'YES_NO',
          required: true,
          orderIndex: 0,
        },
      ],
    },
  };

  function createService(overrides?: {
    document?: unknown;
    version?: unknown;
    existingSource?: unknown;
  }) {
    const saved: unknown[] = [];
    const documentRepository = {
      findOne: jest.fn().mockResolvedValue(overrides?.document ?? document),
    };
    const versionRepository = {
      findOne: jest.fn().mockResolvedValue(overrides?.version ?? version),
    };
    const sourceRepository = {
      findOne: jest.fn().mockResolvedValue(overrides?.existingSource ?? null),
      create: jest.fn().mockImplementation((row) => row || {}),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      save: jest.fn().mockImplementation(async (row) => {
        saved.push(row);
        return row;
      }),
    };
    const s3Service = {
      getFileBuffer: jest.fn(),
      getStoredFileName: jest
        .fn()
        .mockImplementation(async (key: string) => key),
    };
    const service = new DocumentAiIndexService(
      documentRepository as never,
      versionRepository as never,
      sourceRepository as never,
      s3Service as never,
    );
    return { service, saved, s3Service, sourceRepository };
  }

  it('deletes stored extraction for a document', async () => {
    const { service, sourceRepository } = createService();

    await service.deleteExtractedSources('doc-1');

    expect(sourceRepository.delete).toHaveBeenCalledWith({ documentId: 'doc-1' });
  });

  it('stores checklist text for the published version', async () => {
    const { service, saved, sourceRepository } = createService();

    await service.indexDocumentVersion({
      documentId: 'doc-1',
      versionId: 44,
    });

    expect(saved).toHaveLength(1);
    const row = saved[0] as {
      status: string;
      sourceKind: string;
      fullText: string;
      teamId: number;
    };
    expect(row.status).toBe(DocumentAiIndexStatus.READY);
    expect(row.sourceKind).toBe(DocumentAiSourceKind.CHECKLIST);
    expect(row.teamId).toBe(9);
    expect(row.fullText).toContain('Is the lot identified?');
    expect(sourceRepository.delete).toHaveBeenCalledWith(
      expect.objectContaining({ documentId: 'doc-1' }),
    );
  });

  it('extracts a published version even when it was not marked AI accessible', async () => {
    const { service, saved, s3Service } = createService({
      document: { ...document, isAiAccessible: false },
    });

    await service.indexDocumentVersion({
      documentId: 'doc-1',
      versionId: 44,
    });

    expect(s3Service.getFileBuffer).not.toHaveBeenCalled();
    expect(saved[0]).toEqual(
      expect.objectContaining({
        status: DocumentAiIndexStatus.READY,
        sourceKind: DocumentAiSourceKind.CHECKLIST,
      }),
    );
  });

  it('extracts a pdf through the file extractor', async () => {
    const { service, saved, s3Service } = createService({
      document: {
        ...document,
        contentType: ContentType.FILE,
        isAiAccessible: true,
      },
      version: {
        ...version,
        file: 'uploads/file.pdf',
        checklist: null,
      },
    });
    s3Service.getFileBuffer.mockResolvedValue(Buffer.from('%PDF'));
    service.useExtractors({
      extractDocx: jest.fn(),
      extractPdf: jest.fn().mockResolvedValue('Quality policy text'),
      extractImage: jest.fn(),
    });

    await service.indexDocumentVersion({
      documentId: 'doc-1',
      versionId: 44,
    });

    expect(saved[0]).toEqual(
      expect.objectContaining({
        status: DocumentAiIndexStatus.READY,
        sourceKind: DocumentAiSourceKind.PDF,
        fullText: 'Quality policy text',
      }),
    );
  });

  it('reads checklist text for the current version without saving', async () => {
    const { service, saved } = createService();
    const result = await service.readCurrentVersionText({
      documentId: 'doc-1',
    });
    expect(result.status).toBe(DocumentAiIndexStatus.READY);
    expect(result.sourceKind).toBe(DocumentAiSourceKind.CHECKLIST);
    expect(result.fullText).toContain('Is the lot identified?');
    expect(result.versionId).toBe(44);
    expect(saved).toHaveLength(0);
  });

  it('returns indexed full text when already ready', async () => {
    const { service, s3Service } = createService({
      document: {
        ...document,
        contentType: ContentType.FILE,
      },
      version: { ...version, file: 'uploads/file.pdf', checklist: null },
      existingSource: {
        status: DocumentAiIndexStatus.READY,
        sourceKind: DocumentAiSourceKind.PDF,
        fullText: 'Cached policy',
      },
    });
    const result = await service.readCurrentVersionText({
      documentId: 'doc-1',
    });
    expect(result.fullText).toBe('Cached policy');
    expect(s3Service.getFileBuffer).not.toHaveBeenCalled();
  });

  it('returns stored text without opening the file', async () => {
    const { service, s3Service } = createService({
      existingSource: {
        status: DocumentAiIndexStatus.READY,
        fullText: 'Cached policy',
      },
    });
    const result = await service.readStoredText({
      id: 'doc-1',
      isAiAccessible: true,
      currentVersion: 1,
    });
    expect(result).toEqual({ versionId: 44, text: 'Cached policy' });
    expect(s3Service.getFileBuffer).not.toHaveBeenCalled();
  });

  it('returns nothing when extraction is missing and still reads stored text', async () => {
    const missing = createService();
    await expect(
      missing.service.readStoredText({
        id: 'doc-1',
        isAiAccessible: false,
        currentVersion: 1,
      }),
    ).resolves.toBeNull();

    const stored = createService({
      existingSource: {
        status: DocumentAiIndexStatus.READY,
        fullText: 'Cached policy',
      },
    });
    await expect(
      stored.service.readStoredText({
        id: 'doc-1',
        isAiAccessible: false,
        currentVersion: 1,
      }),
    ).resolves.toEqual({ versionId: 44, text: 'Cached policy' });
    expect(stored.s3Service.getFileBuffer).not.toHaveBeenCalled();
  });

  it('extracts the current version when the document was not marked AI accessible', async () => {
    const { service, s3Service } = createService({
      document: { ...document, isAiAccessible: false },
    });
    const result = await service.readCurrentVersionText({
      documentId: 'doc-1',
    });
    expect(result.status).toBe(DocumentAiIndexStatus.READY);
    expect(result.fullText).toContain('Is the lot identified?');
    expect(s3Service.getFileBuffer).not.toHaveBeenCalled();
  });
});
