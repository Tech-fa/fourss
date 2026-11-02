import { EntityResolver } from "./entity-resolver";
import { Playground } from "./playground.entity";

function queryBuilder(row: unknown) {
  const calls: Array<{ sql: string; params?: unknown }> = [];
  const chain = {
    leftJoinAndSelect: jest.fn(() => chain),
    where: jest.fn((sql: string, params?: unknown) => {
      calls.push({ sql, params });
      return chain;
    }),
    andWhere: jest.fn((sql: unknown, params?: unknown) => {
      calls.push({ sql: typeof sql === "string" ? sql : "brackets", params });
      return chain;
    }),
    orderBy: jest.fn(() => chain),
    addOrderBy: jest.fn(() => chain),
    take: jest.fn(() => chain),
    getOne: jest.fn(async () => row),
    getMany: jest.fn(async () => (row ? [row] : [])),
  };
  return { chain, calls };
}

describe("EntityResolver", () => {
  const playground = { id: "pg-1", teamId: 7 } as Playground;
  const caller = { id: "user-1", username: "ada", teamIds: [7] };

  function resolverFor(options: {
    document?: unknown;
    record?: unknown;
    recordCalls?: Array<{ sql: string; params?: unknown }>;
  }) {
    const documents = queryBuilder(options.document ?? null);
    const records = queryBuilder(options.record ?? null);
    if (options.recordCalls) options.recordCalls.push(...records.calls);
    const documentRepository = {
      createQueryBuilder: jest.fn(() => documents.chain),
      findOne: jest.fn(async () => options.document),
    };
    const recordRepository = {
      createQueryBuilder: jest.fn(() => records.chain),
      findOne: jest.fn(async () => options.record),
    };
    const permissionService = {
      hasPermissions: jest.fn(async () => ({ hasPermission: true, teamIds: [7] })),
    };
    const resolver = new EntityResolver(
      documentRepository as never,
      { findOne: jest.fn() } as never,
      { findOne: jest.fn(), createQueryBuilder: jest.fn() } as never,
      { find: jest.fn(async () => []), createQueryBuilder: jest.fn() } as never,
      recordRepository as never,
      permissionService as never,
    );
    return { resolver, documents, records, documentRepository, recordRepository };
  }

  it("resolves a visible document and hides one on another team", async () => {
    const visible = resolverFor({
      document: {
        id: "doc-1",
        title: "Policy",
        documentCode: "P-1",
        team: { id: 7 },
      },
    });
    await expect(
      visible.resolver.resolve(caller, playground, "document", "doc-1"),
    ).resolves.toEqual({
      entityType: "document",
      entityId: "doc-1",
      title: "Policy",
      documentCode: "P-1",
      teamId: 7,
    });

    const hidden = resolverFor({ document: null });
    await expect(
      hidden.resolver.resolve({ ...caller, teamIds: [9] }, playground, "document", "doc-1"),
    ).rejects.toMatchObject({ response: { key: "PG_006" } });
    expect(JSON.stringify(hidden.documents.calls)).not.toContain("Policy");
  });

  it("binds an agent kind instead of concatenating it into SQL", async () => {
    const { resolver, records } = resolverFor({
      record: {
        id: "rec-1",
        entityType: "inspection_note",
        data: { note: "Torque" },
      },
    });
    await resolver.resolve(caller, playground, "inspection_note", "rec-1");
    const sql = records.calls.map((call) => call.sql).join(" ");
    expect(sql).toContain(":entityType");
    expect(sql).not.toContain("inspection_note");
    expect(records.calls.some((call) => (call.params as { entityType?: string })?.entityType === "inspection_note")).toBe(true);
  });

  it("does not build an empty IN list when the caller has no teams", async () => {
    const { resolver, recordRepository, documents } = resolverFor({});
    await expect(
      resolver.list({ ...caller, teamIds: [] }, playground, "inspection_note"),
    ).resolves.toEqual({ data: [], nextCursor: null });
    expect(recordRepository.createQueryBuilder).not.toHaveBeenCalled();

    await resolver.list({ ...caller, teamIds: [] }, playground, "document");
    const sql = documents.calls.map((call) => call.sql).join(" ");
    expect(sql).not.toContain("IN (:...teamIds)");
    expect(sql).toContain("isPublic");
  });

  it("returns not found after the document row is gone", async () => {
    const refs = [{ entityType: "document", entityId: "doc-1" }];
    const { resolver } = resolverFor({ document: null });
    await expect(
      resolver.resolve(caller, playground, "document", "doc-1"),
    ).rejects.toMatchObject({ response: { key: "PG_006" } });
    expect(refs).toEqual([{ entityType: "document", entityId: "doc-1" }]);
  });
});
