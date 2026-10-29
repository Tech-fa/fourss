import { Logger } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { DataSource } from "typeorm";
import { Document } from "../document/document.entity";
import { DocumentContributor } from "../document/document-contributor.entity";
import { User } from "./user.entity";

export type UserLinkedRelation =
  | "created"
  | "owner"
  | "assigned"
  | "responsible"
  | "contributor"
  | "attendee"
  | "enrolled"
  | "trainer"
  | "assignee"
  | "internal_representative"
  | "scheduled"
  | "team_member"
  | "participant";

export class UserLinkedRecordDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ isArray: true, enum: ["created", "owner", "assigned", "responsible", "contributor", "attendee", "enrolled", "trainer", "assignee", "internal_representative", "scheduled", "team_member", "participant"] })
  relations: UserLinkedRelation[];

  @ApiProperty({ nullable: true })
  createdAt: number | null;

  @ApiProperty({ nullable: true })
  route: string | null;
}

export class UserLinkedRecordsGroupDto {
  @ApiProperty()
  type: string;

  @ApiProperty()
  count: number;

  @ApiProperty({ type: [UserLinkedRecordDto] })
  items: UserLinkedRecordDto[];
}

export class UserLinkedRecordsResponseDto {
  @ApiProperty({ type: [UserLinkedRecordsGroupDto] })
  groups: UserLinkedRecordsGroupDto[];
}

const ITEM_LIMIT = 50;
const GROUP_ORDER = ["documents", "processes", "users"] as const;

const logger = new Logger("UserLinkedRecords");

function clip(text: string | null | undefined, max = 120): string {
  const value = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!value) return "—";
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function toMillis(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function record(
  type: string,
  id: unknown,
  title: unknown,
  relation: UserLinkedRelation,
  createdAt: unknown,
  route: string | null,
): UserLinkedRecordDto {
  return {
    id: String(id),
    type,
    title: clip(title as string),
    relations: [relation],
    createdAt: toMillis(createdAt),
    route,
  };
}

function mergeRecords(items: UserLinkedRecordDto[]): UserLinkedRecordDto[] {
  const map = new Map<string, UserLinkedRecordDto>();
  for (const item of items) {
    const key = `${item.type}:${item.id}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...item, relations: [...item.relations] });
      continue;
    }
    for (const relation of item.relations) {
      if (!existing.relations.includes(relation)) {
        existing.relations.push(relation);
      }
    }
    if (!existing.createdAt && item.createdAt) {
      existing.createdAt = item.createdAt;
    }
    if (!existing.route && item.route) {
      existing.route = item.route;
    }
  }
  return [...map.values()];
}

function groupRecords(
  items: UserLinkedRecordDto[],
): UserLinkedRecordsGroupDto[] {
  const grouped = new Map<string, UserLinkedRecordDto[]>();
  for (const item of items) {
    const list = grouped.get(item.type) ?? [];
    list.push(item);
    grouped.set(item.type, list);
  }
  const orderedTypes = [
    ...GROUP_ORDER.filter((type) => grouped.has(type)),
    ...[...grouped.keys()].filter(
      (type) => !GROUP_ORDER.includes(type as typeof GROUP_ORDER[number]),
    ),
  ];
  return orderedTypes.map((type) => {
    const groupItems = (grouped.get(type) ?? []).sort(
      (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0),
    );
    return { type, count: groupItems.length, items: groupItems };
  });
}

async function safe(
  label: string,
  fn: () => Promise<UserLinkedRecordDto[]>,
): Promise<UserLinkedRecordDto[]> {
  try {
    return await fn();
  } catch (error) {
    logger.warn(
      `Failed to load ${label} for profile: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return [];
  }
}

export async function fetchUserLinkedRecords(
  dataSource: DataSource,
  userId: string,
): Promise<UserLinkedRecordsResponseDto> {
  const params = { userId };

  const batches = await Promise.all([
    safe("documents", async () => {
      const created = await dataSource
        .getRepository(Document)
        .createQueryBuilder("doc")
        .innerJoin("doc.createdBy", "createdBy")
        .where("doc.deleted = false")
        .andWhere("createdBy.id = :userId", params)
        .select(["doc.id", "doc.title", "doc.createdAt"])
        .orderBy("doc.createdAt", "DESC")
        .take(ITEM_LIMIT)
        .getMany();
      const contributed = await dataSource
        .getRepository(DocumentContributor)
        .createQueryBuilder("dc")
        .innerJoin("dc.user", "user")
        .innerJoin("dc.document", "doc")
        .where("user.id = :userId", params)
        .andWhere("doc.deleted = false")
        .select("doc.id", "id")
        .addSelect("doc.title", "title")
        .addSelect("doc.createdAt", "createdAt")
        .distinct(true)
        .take(ITEM_LIMIT)
        .getRawMany();
      return [
        ...created.map((doc) =>
          record(
            "documents",
            doc.id,
            doc.title,
            "created",
            doc.createdAt,
            `/plan/documents/${doc.id}`,
          ),
        ),
        ...contributed.map((row) =>
          record(
            "documents",
            row.id,
            row.title,
            "contributor",
            row.createdAt,
            `/plan/documents/${row.id}`,
          ),
        ),
      ];
    }),

    safe("users", async () => {
      const rows = await dataSource
        .getRepository(User)
        .createQueryBuilder("member")
        .innerJoin("member.createdBy", "createdBy")
        .where("member.deleted = false")
        .andWhere("createdBy.id = :userId", params)
        .select([
          "member.id",
          "member.fname",
          "member.lname",
          "member.createdAt",
        ])
        .orderBy("member.createdAt", "DESC")
        .take(ITEM_LIMIT)
        .getMany();
      return rows.map((member) =>
        record(
          "users",
          member.id,
          `${member.fname} ${member.lname}`.trim(),
          "created",
          member.createdAt,
          `/admin/users/${member.id}`,
        ),
      );
    }),
  ]);

  return { groups: groupRecords(mergeRecords(batches.flat())) };
}
