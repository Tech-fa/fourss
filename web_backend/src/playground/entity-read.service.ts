import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { UserRequest } from "../permissions/dto";
import { PermissionService } from "../permissions/permission.service";
import { permissions, playgroundsPermission } from "../permissions/permissions";
import {
  applyScope,
  assertReadQuery,
  describeEntity,
  EntitySchema,
  entitySubjects,
  filterSql,
  findScope,
  MetaEntity,
  presentRow,
  ReadQuery,
  relationAlias,
} from "./entity-read";
import { playgroundException } from "./playground.errors";

type QueryBuilder = {
  andWhere(sql: string, params?: object): QueryBuilder;
  innerJoin(path: string, alias: string): QueryBuilder;
  leftJoin(path: string, alias: string): QueryBuilder;
  leftJoinAndSelect(path: string, alias: string): QueryBuilder;
  addSelect(fields: string[]): QueryBuilder;
  select(fields: string[]): QueryBuilder;
  orderBy(field: string, direction: "ASC" | "DESC"): QueryBuilder;
  take(limit: number): QueryBuilder;
  skip(offset: number): QueryBuilder;
  distinct(distinct: boolean): QueryBuilder;
  getMany(): Promise<unknown[]>;
};

@Injectable()
export class EntityReadService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly permissionService: PermissionService,
  ) {}

  schema(user: UserRequest): Promise<{ entities: EntitySchema[] }>;
  schema(user: UserRequest, entity: string): Promise<EntitySchema>;
  async schema(user: UserRequest, entity?: string) {
    const { metas, visible, subjects } = await this.access(user);
    if (!entity) {
      return {
        entities: metas
          .filter((meta) => visible.has(meta.name))
          .map((meta) => this.schemaFor(meta, metas, visible, subjects)),
      };
    }
    const meta = metas.find((item) => item.name === entity);
    if (!meta || !visible.has(meta.name)) throw playgroundException("PG_020");
    return this.schemaFor(meta, metas, visible, subjects);
  }

  async query(user: UserRequest, query: ReadQuery) {
    const { metas, visible } = await this.access(user);
    const meta = metas.find((item) => item.name === query.entity);
    if (!meta || !visible.has(meta.name)) throw playgroundException("PG_020");
    const byName = new Map(metas.map((item) => [item.name, item]));
    const scope = findScope(meta, byName);
    if (!scope) throw playgroundException("PG_021");
    try {
      assertReadQuery(meta, byName, query);
    } catch {
      throw playgroundException("PG_022");
    }
    const qb = this.dataSource
      .getRepository(meta.name)
      .createQueryBuilder("row") as unknown as QueryBuilder;
    applyScope(qb, meta, scope, visible.get(meta.name) || []);
    const joined = new Set<string>();
    for (const relation of query.relations || []) {
      qb.leftJoinAndSelect(`row.${relation}`, relation);
      joined.add(relation);
    }
    if (query.select?.length) {
      const primary = meta.columns.filter((column) => column.isPrimary).map((column) => `row.${column.propertyName}`);
      const fields = query.select.filter((field) => !field.includes(".")).map((field) => `row.${field}`);
      qb.select([...new Set([...primary, ...fields])]);
      for (const field of query.select.filter((item) => item.includes("."))) {
        const relation = relationAlias(field);
        if (relation && !joined.has(relation)) {
          qb.leftJoin(`row.${relation}`, relation);
          joined.add(relation);
        }
        qb.addSelect([field]);
      }
    }
    (query.where || []).forEach((filter, index) => {
      const relation = relationAlias(filter.field);
      if (relation && !joined.has(relation)) {
        qb.leftJoin(`row.${relation}`, relation);
        joined.add(relation);
      }
      const param = `q${index}`;
      const sql = filterSql(filter.field, filter.op, param);
      if (filter.op === "isNull" || filter.op === "isNotNull") qb.andWhere(sql);
      else qb.andWhere(sql, { [param]: filter.value });
    });
    if (query.orderBy) {
      qb.orderBy(
        query.orderBy.field.includes(".") ? query.orderBy.field : `row.${query.orderBy.field}`,
        query.orderBy.direction,
      );
    }
    qb.take(query.limit || 20);
    if (query.offset) qb.skip(query.offset);
    const rows = await qb.getMany();
    return { data: rows.map((row) => presentRow(row)) };
  }

  private schemaFor(
    meta: MetaEntity,
    metas: MetaEntity[],
    visible: Map<string, number[]>,
    subjects: Map<string, string>,
  ) {
    const byName = new Map(metas.map((item) => [item.name, item]));
    return describeEntity(meta, subjects.get(meta.name) || this.ownerSubject(meta, metas, subjects), !!findScope(meta, byName) && visible.has(meta.name));
  }

  private ownerSubject(meta: MetaEntity, metas: MetaEntity[], subjects: Map<string, string>) {
    for (const parent of metas) {
      const subject = subjects.get(parent.name);
      if (!subject) continue;
      const owns = parent.relations.some(
        (relation) =>
          (relation.relationType === "one-to-many" || relation.relationType === "one-to-one") &&
          relation.inverseEntityMetadata.name === meta.name,
      );
      if (owns) return subject;
    }
    return "";
  }

  private async access(user: UserRequest) {
    const metas = this.dataSource.entityMetadatas.map(toMeta);
    const subjects = entitySubjects(Object.values(permissions).map((permission) => ({
      subject: permission.subject,
      entityName: permission.entityName,
      submodules: permission.submodules?.map((submodule) => ({
        subject: submodule.subject,
        entityName: submodule.entityName,
      })),
    })));
    const access = await this.permissionService.hasPermissions(user, playgroundsPermission.subject, ["read"]);
    if (!access.hasPermission) return { metas, subjects, visible: new Map<string, number[]>() };
    return {
      metas,
      subjects,
      visible: new Map(metas.map((meta) => [meta.name, access.teamIds])),
    };
  }
}

function toMeta(meta: DataSource["entityMetadatas"][number]): MetaEntity {
  return {
    name: meta.name,
    tableName: meta.tableName,
    columns: meta.columns.map((column) => ({
      propertyName: column.propertyName,
      type: column.type,
      isNullable: column.isNullable,
      isPrimary: column.isPrimary,
      enum: column.enum,
    })),
    relations: meta.relations.map((relation) => ({
      propertyName: relation.propertyName,
      relationType: relation.relationType,
      inverseEntityMetadata: { name: relation.inverseEntityMetadata.name },
    })),
  };
}
