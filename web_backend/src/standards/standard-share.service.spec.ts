import { BadRequestException, NotFoundException } from "@nestjs/common";
import { openShareCode, sealShareCode } from "./share-code";
import { restoreChunk } from "./share-content";
import { StandardShareService } from "./standard-share.service";

jest.mock("../common/email.service", () => ({
  EmailService: class EmailService {},
}));

jest.mock("../common/local-file.service", () => ({
  LocalFileService: class LocalFileService {},
}));

describe("StandardShareService", () => {
  const secret = "test-secret";
  let shares: any[];
  let service: StandardShareService;
  let standardsService: { getImplementation: jest.Mock };
  let emailService: { sendHtml: jest.Mock };
  let fileService: { getFileBuffer: jest.Mock; getStoredFileName: jest.Mock };
  let documentRepository: { find: jest.Mock; findOne: jest.Mock };
  let versionRepository: { find: jest.Mock; findOne: jest.Mock };
  const fileBytes = Buffer.from("%PDF-1.4 hello shared document");

  beforeEach(() => {
    shares = [];
    standardsService = {
      getImplementation: jest.fn(async () => ({
        id: 4,
        standardName: "ISO 9001:2015",
        status: "in_progress",
        completedCount: 0,
        totalCount: 1,
        documents: [
          {
            id: 7,
            clause: "5.2",
            title: "Quality policy",
            description: "Maintain the policy",
            kind: "maintain",
            status: "not_started",
            linkedDocument: {
              id: "doc-1",
              title: "Policy",
              documentCode: "QP-1",
            },
          },
        ],
      })),
    };
    emailService = { sendHtml: jest.fn(async () => true) };
    fileService = {
      getFileBuffer: jest.fn(async () => fileBytes),
      getStoredFileName: jest.fn(async () => "policy.pdf"),
    };
    documentRepository = {
      find: jest.fn(async () => [
        {
          id: "doc-1",
          deleted: false,
          contentType: "FILE",
          title: "Policy",
          documentCode: "QP-1",
        },
      ]),
      findOne: jest.fn(async () => ({
        id: "doc-1",
        deleted: false,
        contentType: "FILE",
        title: "Policy",
        documentCode: "QP-1",
      })),
    };
    versionRepository = {
      find: jest.fn(async () => [
        {
          id: 9,
          documentId: "doc-1",
          versionNumber: 3,
          createdAt: 1600000000000,
          status: "published",
          file: "file-key",
          content: "file-key",
        },
      ]),
      findOne: jest.fn(async () => ({
        id: 9,
        checklist: {
          questions: [
            {
              questionText: "Is the policy approved?",
              questionType: "YES_NO",
              required: true,
              orderIndex: 1,
            },
            {
              questionText: "Who owns it?",
              questionType: "TEXT",
              required: false,
              orderIndex: 0,
            },
          ],
        },
      })),
    };
    const contributorRepository = {
      find: jest.fn(async () => [
        {
          documentVersionId: 9,
          actions: [{ type: "published", createdDate: "1700000000000" }],
        },
      ]),
    };
    const shareRepository = {
      create: jest.fn((value) => ({ ...value })),
      save: jest.fn(async (value) => {
        const saved = { ...value, id: value.id ?? "share-1" };
        shares.push(saved);
        return saved;
      }),
      findOne: jest.fn(async ({ where }) =>
        shares.find((share) => share.id === where.id) ?? null,
      ),
      delete: jest.fn(async ({ id }) => {
        shares = shares.filter((share) => share.id !== id);
      }),
    };
    service = new StandardShareService(
      shareRepository as any,
      documentRepository as any,
      versionRepository as any,
      contributorRepository as any,
      standardsService as any,
      emailService as any,
      fileService as any,
      {
        get: (key: string) =>
          ({
            SHARE_CODE_SECRET: secret,
            FRONTEND_URL: "http://localhost:3003",
          })[key],
      } as any,
    );
  });

  it("emails a code that encrypts the recipient address", async () => {
    const created = await service.createShare(4, " Ada@Example.com ", "user-1");
    const link = sentLink(emailService);
    const code = link.split("/share/standards/")[1];

    expect(link).not.toContain("ada@example.com");
    expect(code.length).toBeGreaterThan(600);
    expect(openShareCode(code, secret)?.email).toBe("ada@example.com");
    expect(emailService.sendHtml).toHaveBeenCalledWith(
      "ada@example.com",
      expect.stringContaining("ISO 9001:2015"),
      expect.stringContaining(link),
      expect.objectContaining({ link }),
    );
    if (process.env.NODE_ENV === "production") {
      expect(created.previewLink).toBeUndefined();
    } else {
      expect(created.previewLink).toBe(link);
    }
  });

  it("opens the list and a document only with the matching code", async () => {
    const created = await service.createShare(4, "ada@example.com", "user-1");
    const listCode = sentLink(emailService).split("/share/standards/")[1];
    const list = await service.openList(listCode);

    expect(list.documents[0]).toMatchObject({
      clause: "5.2",
      linkedTitle: "Policy",
      linkedCode: "QP-1",
      versionNumber: 3,
      publishedAt: 1700000000000,
    });
    expect(list.documents[0].viewCode).not.toContain("ada@example.com");

    await expect(service.openDocument(listCode)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    const opened = await service.openDocument(list.documents[0].viewCode);
    expect(opened.linked).toMatchObject({
      versionNumber: 3,
      publishedAt: 1700000000000,
      contentKind: "pdf",
      byteLength: fileBytes.length,
      chunkCount: 1,
    });

    const sessionId = opened.linked?.sessionId ?? "";
    await expect(service.readKeys(sessionId, "0")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    const material = await service.readPart(sessionId, "0", "material");
    const cover = await service.readPart(sessionId, "0", "cover");
    expect(Object.keys(material).sort()).toEqual(["data", "index", "iv", "tag"]);
    const keys = await service.readKeys(sessionId, "0");
    expect(
      restoreChunk(material, cover, keys.materialKey, keys.coverKey).equals(fileBytes),
    ).toBe(true);
  });

  it("rejects expired, tampered, and rebound codes", async () => {
    await service.createShare(4, "ada@example.com", "user-1");
    const listCode = sentLink(emailService).split("/share/standards/")[1];
    const tampered = `${listCode.slice(0, -1)}${listCode.endsWith("a") ? "b" : "a"}`;

    await expect(service.openList(tampered)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    shares[0].expiresAt = 1;
    await expect(service.openList(listCode)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    const rebound = sealShareCode(
      {
        v: 1,
        sid: "share-1",
        email: "other@example.com",
        impl: 4,
        scope: "list",
        exp: Date.now() + 1000,
      },
      secret,
    );
    shares[0].expiresAt = Date.now() + 1000;
    await expect(service.openList(rebound)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("removes the share when email delivery fails", async () => {
    emailService.sendHtml.mockResolvedValue(false);

    await expect(
      service.createShare(4, "ada@example.com", "user-1"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(shares).toHaveLength(0);
  });

  it("renders a published checklist without exposing a file", async () => {
    documentRepository.find.mockResolvedValue([
      {
        id: "doc-1",
        deleted: false,
        contentType: "CHECKLIST",
        title: "Policy",
        documentCode: "QP-1",
      },
    ]);
    documentRepository.findOne.mockResolvedValue({
      id: "doc-1",
      deleted: false,
      contentType: "CHECKLIST",
      title: "Policy",
      documentCode: "QP-1",
    });
    const created = await service.createShare(4, "ada@example.com", "user-1");
    const listCode = sentLink(emailService).split("/share/standards/")[1];
    const list = await service.openList(listCode);
    const opened = await service.openDocument(list.documents[0].viewCode);
    const sessionId = opened.linked?.sessionId ?? "";
    const material = await service.readPart(sessionId, "0", "material");
    const cover = await service.readPart(sessionId, "0", "cover");
    const keys = await service.readKeys(sessionId, "0");
    const questions = JSON.parse(
      restoreChunk(material, cover, keys.materialKey, keys.coverKey).toString("utf8"),
    );

    expect(opened.linked?.contentKind).toBe("checklist");
    expect(fileService.getFileBuffer).not.toHaveBeenCalled();
    expect(questions.questions.map((question: { text: string }) => question.text)).toEqual([
      "Who owns it?",
      "Is the policy approved?",
    ]);
  });
});

function sentLink(emailService: { sendHtml: jest.Mock }): string {
  return emailService.sendHtml.mock.calls.at(-1)?.[3]?.link;
}
