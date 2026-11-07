export type MetaColumn = {
  propertyName: string;
  type: unknown;
  isNullable: boolean;
  isPrimary: boolean;
  enum?: unknown[] | object | null;
};

export type MetaRelation = {
  propertyName: string;
  relationType: string;
  inverseEntityMetadata: { name: string };
};

export type MetaEntity = {
  name: string;
  tableName: string;
  columns: MetaColumn[];
  relations: MetaRelation[];
};

export type EntityColumnSchema = {
  name: string;
  type: string;
  nullable: boolean;
  primary: boolean;
  enum?: string[];
};

export type EntityRelationSchema = {
  name: string;
  entity: string;
  kind: string;
};

export type EntitySchema = {
  entity: string;
  table: string;
  subject: string;
  queryable: boolean;
  columns: EntityColumnSchema[];
  relations: EntityRelationSchema[];
};

export type ReadFilter = {
  field: string;
  op: "eq" | "neq" | "in" | "gt" | "gte" | "lt" | "lte" | "isNull" | "isNotNull";
  value?: unknown;
};

export type ReadQuery = {
  entity: string;
  select?: string[];
  where?: ReadFilter[];
  relations?: string[];
  orderBy?: { field: string; direction: "ASC" | "DESC" };
  limit?: number;
  offset?: number;
};

type TeamFlags = {
  teamColumn?: string;
  teamRelation?: string;
  publicColumn?: string;
  deletedColumn?: string;
};

export type TeamScope =
  | ({ kind: "self" } & TeamFlags)
  | { kind: "through"; relation: string; parent: TeamFlags };

export type ScopeBuilder = {
  andWhere(sql: string, params?: object): unknown;
  innerJoin(path: string, alias: string): unknown;
  leftJoin(path: string, alias: string): unknown;
  distinct(distinct: boolean): unknown;
};

const SECRET = /password|token|secret|hash|apikey/i;
const FIELD = /^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9]*)?$/;
const OPS = new Set(["eq", "neq", "in", "gt", "gte", "lt", "lte", "isNull", "isNotNull"]);

export function isSecret(name: string) {
  return SECRET.test(name);
}

export function entitySubjects(
  nodes: Array<{ subject: string; entityName?: string; submodules?: Array<{ subject: string; entityName?: string; submodules?: never }> }>,
) {
  const map = new Map<string, string>();
  const visit = (node: { subject: string; entityName?: string; submodules?: Array<{ subject: string; entityName?: string }> }) => {
    if (node.entityName && !map.has(node.entityName)) map.set(node.entityName, node.subject);
    for (const child of node.submodules || []) visit(child);
  };
  for (const node of nodes) visit(node);
  return map;
}

export function columnSchema(column: MetaColumn): EntityColumnSchema | null {
  if (isSecret(column.propertyName)) return null;
  const values = enumValues(column.enum);
  return {
    name: column.propertyName,
    type: values ? "enum" : columnType(column.type),
    nullable: column.isNullable,
    primary: column.isPrimary,
    ...(values ? { enum: values } : {}),
  };
}

export function describeEntity(meta: MetaEntity, subject: string, queryable: boolean): EntitySchema {
  return {
    entity: meta.name,
    table: meta.tableName,
    subject,
    queryable,
    columns: meta.columns.map(columnSchema).filter((column): column is EntityColumnSchema => !!column),
    relations: meta.relations.map((relation) => ({
      name: relation.propertyName,
      entity: relation.inverseEntityMetadata.name,
      kind: relation.relationType,
    })),
  };
}

export function findScope(meta: MetaEntity, byName: Map<string, MetaEntity>): TeamScope | null {
  const self = teamFlags(meta);
  if (self.teamColumn || self.teamRelation) return { kind: "self", ...self };
  const through = scopedRelation(meta, byName);
  if (!through) return null;
  return { kind: "through", relation: through.relation, parent: through.flags };
}

export function applyScope(
  qb: ScopeBuilder,
  meta: MetaEntity,
  scope: TeamScope,
  teamIds: number[],
) {
  if (teamFlags(meta).deletedColumn) {
    qb.andWhere("row.deleted = :deleted", { deleted: false });
  }
  if (scope.kind === "self") {
    applyTeam(qb, "row", scope, teamIds);
    return;
  }
  qb.innerJoin(`row.${scope.relation}`, "scope_parent");
  qb.distinct(true);
  if (scope.parent.deletedColumn) {
    qb.andWhere("scope_parent.deleted = :parentDeleted", { parentDeleted: false });
  }
  applyTeam(qb, "scope_parent", scope.parent, teamIds);
}

export function assertReadQuery(meta: MetaEntity, byName: Map<string, MetaEntity>, query: ReadQuery) {
  const relations = query.relations || [];
  if (relations.length > 8) throw new Error("That query is not valid");
  for (const relation of relations) {
    if (!meta.relations.some((item) => item.propertyName === relation)) {
      throw new Error("That query is not valid");
    }
  }
  for (const field of query.select || []) assertField(meta, byName, field);
  for (const filter of query.where || []) {
    if (!OPS.has(filter.op) || !FIELD.test(filter.field)) throw new Error("That query is not valid");
    assertField(meta, byName, filter.field);
    assertValue(filter);
  }
  if (query.orderBy) {
    if (query.orderBy.direction !== "ASC" && query.orderBy.direction !== "DESC") {
      throw new Error("That query is not valid");
    }
    assertField(meta, byName, query.orderBy.field);
  }
}

export function filterSql(field: string, op: ReadFilter["op"], param: string) {
  const column = sqlField(field);
  if (op === "eq") return `${column} = :${param}`;
  if (op === "neq") return `${column} != :${param}`;
  if (op === "gt") return `${column} > :${param}`;
  if (op === "gte") return `${column} >= :${param}`;
  if (op === "lt") return `${column} < :${param}`;
  if (op === "lte") return `${column} <= :${param}`;
  if (op === "in") return `${column} IN (:...${param})`;
  if (op === "isNull") return `${column} IS NULL`;
  return `${column} IS NOT NULL`;
}

export function sqlField(field: string) {
  const [first, second] = field.split(".");
  return second ? `${first}.${second}` : `row.${first}`;
}

export function relationAlias(field: string) {
  const [relation, property] = field.split(".");
  return property ? relation : "";
}

export function presentRow(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(presentRow);
  if (!value || typeof value !== "object") return value;
  const copy: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (isSecret(key)) continue;
    copy[key] = presentRow(item);
  }
  return copy;
}

function assertField(meta: MetaEntity, byName: Map<string, MetaEntity>, field: string) {
  if (!FIELD.test(field)) throw new Error("That query is not valid");
  const [first, second] = field.split(".");
  if (!second) {
    if (!readableColumn(meta, first)) throw new Error("That query is not valid");
    return;
  }
  const relation = meta.relations.find((item) => item.propertyName === first);
  const target = relation && byName.get(relation.inverseEntityMetadata.name);
  if (!relation || !target || !readableColumn(target, second)) {
    throw new Error("That query is not valid");
  }
}

function readableColumn(meta: MetaEntity, name: string) {
  return meta.columns.some((column) => column.propertyName === name && !isSecret(name));
}

function assertValue(filter: ReadFilter) {
  if (filter.op === "isNull" || filter.op === "isNotNull") return;
  if (filter.op === "in") {
    if (!Array.isArray(filter.value) || !filter.value.length || filter.value.length > 50) {
      throw new Error("That query is not valid");
    }
    if (!filter.value.every(isScalar)) throw new Error("That query is not valid");
    return;
  }
  if (!isScalar(filter.value)) throw new Error("That query is not valid");
}

function isScalar(value: unknown) {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

function teamFlags(meta: MetaEntity): TeamFlags {
  return {
    teamColumn: meta.columns.some((column) => column.propertyName === "teamId") ? "teamId" : undefined,
    teamRelation: meta.relations.some((relation) => relation.propertyName === "team") ? "team" : undefined,
    publicColumn: meta.columns.some((column) => column.propertyName === "isPublic") ? "isPublic" : undefined,
    deletedColumn: meta.columns.some((column) => column.propertyName === "deleted") ? "deleted" : undefined,
  };
}

function scopedRelation(meta: MetaEntity, byName: Map<string, MetaEntity>) {
  const manyToOne = meta.relations.filter(
    (relation) => relation.relationType === "many-to-one" || relation.relationType === "one-to-one",
  );
  const ordered = [
    ...manyToOne.filter((relation) => relation.propertyName === "document"),
    ...manyToOne.filter((relation) => relation.propertyName !== "document"),
    ...meta.relations.filter((relation) => relation.relationType === "one-to-many"),
  ];
  for (const relation of ordered) {
    const parent = byName.get(relation.inverseEntityMetadata.name);
    if (!parent) continue;
    const flags = teamFlags(parent);
    if (flags.teamColumn || flags.teamRelation) return { relation: relation.propertyName, flags };
  }
  return null;
}

function applyTeam(qb: ScopeBuilder, alias: string, flags: TeamFlags, teamIds: number[]) {
  let teamSql = "";
  if (flags.teamColumn && teamIds.length) teamSql = `${alias}.${flags.teamColumn} IN (:...teamIds)`;
  if (!teamSql && flags.teamRelation && teamIds.length) {
    qb.leftJoin(`${alias}.${flags.teamRelation}`, "scope_team");
    teamSql = "scope_team.id IN (:...teamIds)";
  }
  const publicSql = flags.publicColumn ? `${alias}.${flags.publicColumn} = :isPublic` : "";
  if (teamSql && publicSql) {
    qb.andWhere(`(${teamSql} OR ${publicSql})`, { teamIds, isPublic: true });
  } else if (teamSql) {
    qb.andWhere(teamSql, { teamIds });
  } else if (publicSql) {
    qb.andWhere(publicSql, { isPublic: true });
  } else {
    qb.andWhere("1 = 0");
  }
}

function columnType(type: unknown) {
  if (typeof type === "function") {
    const name = type.name.toLowerCase();
    if (name === "string") return "string";
    if (name === "number") return "number";
    if (name === "boolean") return "boolean";
    if (name === "date") return "date";
    return name || "unknown";
  }
  return String(type || "unknown").toLowerCase();
}

function enumValues(value: MetaColumn["enum"]) {
  if (Array.isArray(value) && value.length) return value.map((item) => String(item));
  if (!value || typeof value !== "object") return undefined;
  const values = Object.values(value).filter((item) => typeof item === "string");
  return values.length ? (values as string[]) : undefined;
}
