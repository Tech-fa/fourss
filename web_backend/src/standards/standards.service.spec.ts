import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ImplementationDocumentStatus } from "./standards.enums";
import { StandardsService } from "./standards.service";

describe("StandardsService", () => {
  const user = { id: "user-1", fname: "Ada", lname: "Lovelace" };
  let implementations: any[];
  let nextId: number;
  let service: StandardsService;
  let implementationRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let implementationDocumentRepository: { save: jest.Mock };
  let documentRepository: { findOne: jest.Mock };

  beforeEach(() => {
    implementations = [];
    nextId = 1;
    implementationRepository = {
      find: jest.fn(async ({ relations } = {}) =>
        implementations.map((item) => cloneImplementation(item, relations)),
      ),
      findOne: jest.fn(async ({ where, relations } = { where: {} }) => {
        const found = implementations.find((item) =>
          where.id != null ? item.id === where.id : item.standardKey === where.standardKey,
        );
        return found ? cloneImplementation(found, relations) : null;
      }),
      create: jest.fn((value) => ({ ...value })),
      save: jest.fn(async (value) => {
        if (value.id) {
          const index = implementations.findIndex((item) => item.id === value.id);
          implementations[index] = { ...implementations[index], ...value };
          return implementations[index];
        }
        const created = {
          ...value,
          id: nextId++,
          documents: (value.documents ?? []).map((document: any, index: number) => ({
            ...document,
            id: index + 1,
            implementationId: nextId - 1,
            linkedDocument: document.linkedDocument ?? null,
          })),
          createdBy: user,
        };
        implementations.push(created);
        return created;
      }),
      remove: jest.fn(async (value) => {
        implementations = implementations.filter((item) => item.id !== value.id);
      }),
    };
    implementationDocumentRepository = {
      save: jest.fn(async (value) => {
        const implementation = implementations.find(
          (item) => item.id === value.implementationId,
        );
        const index = implementation.documents.findIndex(
          (document: any) => document.id === value.id,
        );
        implementation.documents[index] = {
          ...implementation.documents[index],
          ...value,
        };
        return implementation.documents[index];
      }),
    };
    documentRepository = {
      findOne: jest.fn(async ({ where }) =>
        where.id === "doc-1" && where.deleted === false
          ? { id: "doc-1", title: "Quality policy", documentCode: "QP-1" }
          : null,
      ),
    };
    service = new StandardsService(
      implementationRepository as any,
      implementationDocumentRepository as any,
      documentRepository as any,
    );
  });

  it("creates an implementation with the standard's required documents", async () => {
    const created = await service.createImplementation(
      { standardKey: "iso-9001-2015" },
      user as any,
    );

    expect(created.standardName).toBe("ISO 9001:2015");
    expect(created.totalCount).toBeGreaterThan(0);
    expect(created.completedCount).toBe(0);
    expect(created.documents[0].status).toBe(
      ImplementationDocumentStatus.NOT_STARTED,
    );
  });

  it("rejects an unknown standard and a duplicate implementation", async () => {
    await expect(
      service.createImplementation({ standardKey: "iso-00000" }, user as any),
    ).rejects.toBeInstanceOf(NotFoundException);

    await service.createImplementation(
      { standardKey: "iso-14001-2026" },
      user as any,
    );
    await expect(
      service.createImplementation(
        { standardKey: "iso-14001-2026" },
        user as any,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("updates document tracking and marks the implementation complete", async () => {
    const created = await service.createImplementation(
      { standardKey: "iso-27001-2022" },
      user as any,
    );

    const first = await service.updateImplementationDocument(created.id, 1, {
      status: ImplementationDocumentStatus.IMPLEMENTED,
      linkedDocumentId: "doc-1",
    });
    expect(first.documents[0].status).toBe(
      ImplementationDocumentStatus.IMPLEMENTED,
    );
    expect(first.documents[0].linkedDocument).toEqual({
      id: "doc-1",
      title: "Quality policy",
      documentCode: "QP-1",
    });
    expect(first.status).toBe("in_progress");

    let current = first;
    for (const document of current.documents.slice(1)) {
      current = await service.updateImplementationDocument(created.id, document.id, {
        status: ImplementationDocumentStatus.IMPLEMENTED,
      });
    }
    expect(current.status).toBe("completed");
    expect(current.completedCount).toBe(current.totalCount);
  });

  it("rejects a missing linked document", async () => {
    const created = await service.createImplementation(
      { standardKey: "iso-45001-2018" },
      user as any,
    );
    await expect(
      service.updateImplementationDocument(created.id, 1, {
        linkedDocumentId: "missing",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function cloneImplementation(item: any, relations?: string[]) {
  const cloned = {
    ...item,
    documents: (item.documents ?? []).map((document: any) => ({ ...document })),
    createdBy: item.createdBy,
  };
  if (relations && !relations.includes("documents")) {
    delete cloned.documents;
  }
  return cloned;
}
