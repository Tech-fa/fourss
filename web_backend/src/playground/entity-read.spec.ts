import { findScope, MetaEntity } from "./entity-read";
import { EntityReadService } from "./entity-read.service";

const document: MetaEntity = {
  name: "Document",
  tableName: "documents",
  columns: [
    { propertyName: "id", type: String, isNullable: false, isPrimary: true },
    { propertyName: "title", type: String, isNullable: false, isPrimary: false },
    { propertyName: "isPublic", type: Boolean, isNullable: false, isPrimary: false },
    { propertyName: "deleted", type: Boolean, isNullable: false, isPrimary: false },
    {
      propertyName: "contentType",
      type: "enum",
      isNullable: true,
      isPrimary: false,
      enum: ["FILE", "EDITOR", "CHECKLIST"],
    },
    { propertyName: "password", type: String, isNullable: true, isPrimary: false },
  ],
  relations: [
    { propertyName: "team", relationType: "many-to-one", inverseEntityMetadata: { name: "Team" } },
    { propertyName: "versions", relationType: "one-to-many", inverseEntityMetadata: { name: "DocumentVersion" } },
    { propertyName: "createdBy", relationType: "many-to-one", inverseEntityMetadata: { name: "User" } },
  ],
};

const version: MetaEntity = {
  name: "DocumentVersion",
  tableName: "document_versions",
  columns: [
    { propertyName: "id", type: Number, isNullable: false, isPrimary: true },
    { propertyName: "versionNumber", type: Number, isNullable: false, isPrimary: false },
    {
      propertyName: "status",
      type: "enum",
      isNullable: false,
      isPrimary: false,
      enum: { PENDING: "pending", PUBLISHED: "published" },
    },
  ],
  relations: [
    { propertyName: "document", relationType: "many-to-one", inverseEntityMetadata: { name: "Document" } },
  ],
};

const note: MetaEntity = {
  name: "LooseNote",
  tableName: "loose_notes",
  columns: [{ propertyName: "id", type: String, isNullable: false, isPrimary: true }],
  relations: [],
};

function queryBuilder() {
  const calls: Array<{ sql?: string; params?: object; join?: string; select?: string[] }> = [];
  const qb = {
    andWhere(sql: string, params?: object) {
      calls.push({ sql, params });
      return qb;
    },
    innerJoin(path: string) {
      calls.push({ join: path });
      return qb;
    },
    leftJoin(path: string) {
      calls.push({ join: path });
      return qb;
    },
    leftJoinAndSelect(path: string) {
      calls.push({ join: path });
      return qb;
    },
    addSelect(fields: string[]) {
      calls.push({ select: fields });
      return qb;
    },
    select(fields: string[]) {
      calls.push({ select: fields });
      return qb;
    },
    orderBy() {
      return qb;
    },
    take() {
      return qb;
    },
    skip() {
      return qb;
    },
    distinct() {
      return qb;
    },
    async getMany() {
      return [
        {
          id: 1,
          status: "pending",
          password: "hidden",
          document: { id: "doc-1", title: "Statement of Applicability", password: "hidden" },
        },
      ];
    },
  };
  return { qb, calls };
}

function serviceFor(grants: Record<string, number[]>) {
  const built = queryBuilder();
  const dataSource = {
    entityMetadatas: [document, version, note],
    getRepository: () => ({ createQueryBuilder: () => built.qb }),
  };
  const permissionService = {
    hasPermissions: jest.fn(async (_user: unknown, subject: string) => ({
      hasPermission: subject in grants,
      teamIds: grants[subject] || [],
    })),
  };
  const service = new EntityReadService(dataSource as never, permissionService as never);
  return { service, calls: built.calls, permissionService };
}

describe("entity read", () => {
  const user = { id: "user-1" };

  it("describes enum values and hides secret columns", async () => {
    const { service } = serviceFor({ playgrounds: [7] });
    const schema = await service.schema(user as never, "Document");
    expect(schema).toMatchObject({
      entity: "Document",
      subject: "documents",
      queryable: true,
    });
    expect(schema.columns.map((column) => column.name)).not.toContain("password");
    expect(schema.columns.find((column) => column.name === "contentType")?.enum).toEqual([
      "FILE",
      "EDITOR",
      "CHECKLIST",
    ]);
    const versionSchema = await service.schema(user as never, "DocumentVersion");
    expect(versionSchema.columns.find((column) => column.name === "status")?.enum).toEqual([
      "pending",
      "published",
    ]);
    expect(versionSchema.queryable).toBe(true);
  });

  it("rejects a caller without the playground permission", async () => {
    const { service } = serviceFor({ documents: [7] });
    await expect(service.schema(user as never, "Document")).rejects.toMatchObject({
      response: { key: "PG_020" },
    });
  });

  it("runs a read scoped through the parent team and drops secrets", async () => {
    const { service, calls } = serviceFor({ playgrounds: [7] });
    const result = await service.query(user as never, {
      entity: "DocumentVersion",
      relations: ["document"],
      where: [{ field: "status", op: "in", value: ["pending", "in_review"] }],
      limit: 20,
    });
    expect(calls.some((call) => call.join === "row.document")).toBe(true);
    expect(calls.some((call) => call.sql?.includes("scope_team.id IN (:...teamIds)"))).toBe(true);
    expect(calls.some((call) => call.sql?.includes("status IN (:...q0)"))).toBe(true);
    expect(JSON.stringify(result)).not.toContain("hidden");
    expect(result.data).toEqual([
      { id: 1, status: "pending", document: { id: "doc-1", title: "Statement of Applicability" } },
    ]);
  });

  it("rejects a field that is not on the model", async () => {
    const { service } = serviceFor({ playgrounds: [7] });
    await expect(
      service.query(user as never, {
        entity: "Document",
        where: [{ field: "password", op: "eq", value: "secret" }],
      }),
    ).rejects.toMatchObject({ response: { key: "PG_022" } });
  });

  it("describes an unscoped model but refuses to query it", async () => {
    const { service } = serviceFor({ playgrounds: [7] });
    const listed = await service.schema(user as never);
    expect(listed.entities.find((entity) => entity.entity === "LooseNote")?.queryable).toBe(false);
    await expect(service.query(user as never, { entity: "LooseNote" })).rejects.toMatchObject({
      response: { key: "PG_021" },
    });
    expect(findScope(note, new Map([[note.name, note]]))).toBeNull();
  });
});
