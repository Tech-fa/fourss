import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, Repository } from "typeorm";
import { Document } from "../document/document.entity";
import { PermissionService } from "../permissions/permission.service";
import { UserRequest } from "../permissions/dto";
import { Team } from "../teams/team.entity";
import { TeamMember } from "../teams/team-member.entity";
import { User } from "../user/user.entity";
import { ENTITY_TYPE_PATTERN } from "./dtos";
import { playgroundException } from "./playground.errors";
import { Playground } from "./playground.entity";
import { PlaygroundRecord, PlaygroundScalar } from "./playground-record.entity";

export const RESERVED_ENTITY_TYPES = new Set(["document", "user", "team"]);

export type ResolvedEntity = {
  entityType: string;
  entityId: string;
  title?: string;
  documentCode?: string;
  teamId?: number;
  fname?: string;
  lname?: string;
  name?: string;
  data?: Record<string, PlaygroundScalar>;
};

export type EntityPage = {
  data: ResolvedEntity[];
  nextCursor: string | null;
};

@Injectable()
export class EntityResolver {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(PlaygroundRecord)
    private readonly recordRepository: Repository<PlaygroundRecord>,
    private readonly permissionService: PermissionService,
  ) {}

  async resolve(
    caller: UserRequest,
    playground: Playground,
    entityType: string,
    entityId: string,
  ): Promise<ResolvedEntity> {
    this.assertType(entityType);
    if (!entityId?.trim()) throw playgroundException("PG_006");
    const found = await this.lookup(caller, playground, entityType, entityId);
    if (!found) throw playgroundException("PG_006");
    return found;
  }

  async list(
    caller: UserRequest,
    playground: Playground,
    entityType: string,
    limit = 20,
    cursor?: string,
  ): Promise<EntityPage> {
    this.assertType(entityType);
    const take = Math.min(Math.max(limit || 20, 1), 50);
    if (entityType === "document") return this.listDocuments(caller, take, cursor);
    if (entityType === "user") return this.listUsers(caller, take);
    if (entityType === "team") return this.listTeams(caller, take);
    return this.listRecords(caller, playground, entityType, take, cursor);
  }

  private assertType(entityType: string) {
    if (!ENTITY_TYPE_PATTERN.test(entityType)) {
      throw playgroundException("PG_005");
    }
  }

  private teamIds(caller: UserRequest): number[] {
    return Array.isArray(caller.teamIds) ? caller.teamIds : [];
  }

  private async lookup(
    caller: UserRequest,
    playground: Playground,
    entityType: string,
    entityId: string,
  ): Promise<ResolvedEntity | null> {
    if (entityType === "document") return this.findDocument(caller, entityId);
    if (entityType === "user") return this.findUser(caller, entityId);
    if (entityType === "team") return this.findTeam(caller, entityId);
    return this.findRecord(caller, playground, entityType, entityId);
  }

  private async findDocument(
    caller: UserRequest,
    entityId: string,
  ): Promise<ResolvedEntity | null> {
    const teamIds = this.teamIds(caller);
    const qb = this.documentRepository
      .createQueryBuilder("document")
      .leftJoinAndSelect("document.team", "team")
      .where("document.id = :id", { id: entityId })
      .andWhere("document.deleted = :deleted", { deleted: false });
    if (teamIds.length) {
      qb.andWhere(
        new Brackets((where) => {
          where
            .where("team.id IN (:...teamIds)", { teamIds })
            .orWhere("document.isPublic = :isPublic", { isPublic: true });
        }),
      );
    } else {
      qb.andWhere("document.isPublic = :isPublic", { isPublic: true });
    }
    const document = await qb.getOne();
    if (!document) return null;
    return {
      entityType: "document",
      entityId: document.id,
      title: document.title,
      documentCode: document.documentCode,
      teamId: document.team?.id,
    };
  }

  private async findUser(
    caller: UserRequest,
    entityId: string,
  ): Promise<ResolvedEntity | null> {
    const access = await this.permissionService.hasPermissions(caller, "users", [
      "read",
    ]);
    if (!access.hasPermission) return null;
    const user = await this.userRepository.findOne({
      where: { id: entityId, deleted: false },
    });
    if (!user) return null;
    const memberships = await this.teamMemberRepository.find({
      where: { userId: entityId },
    });
    const teamIds = this.teamIds(caller);
    const shares = memberships.some((membership) =>
      teamIds.includes(membership.teamId),
    );
    if (!shares) return null;
    return {
      entityType: "user",
      entityId: user.id,
      fname: user.fname,
      lname: user.lname,
      name: `${user.fname} ${user.lname}`.trim(),
    };
  }

  private async findTeam(
    caller: UserRequest,
    entityId: string,
  ): Promise<ResolvedEntity | null> {
    if (!/^[0-9]+$/.test(entityId)) return null;
    const teamId = Number(entityId);
    if (!this.teamIds(caller).includes(teamId)) return null;
    const team = await this.teamRepository.findOne({
      where: { id: teamId, deleted: false },
    });
    if (!team) return null;
    return { entityType: "team", entityId: String(team.id), name: team.name };
  }

  private async findRecord(
    caller: UserRequest,
    playground: Playground,
    entityType: string,
    entityId: string,
  ): Promise<ResolvedEntity | null> {
    const teamIds = this.teamIds(caller);
    if (!teamIds.length) return null;
    const qb = this.recordRepository
      .createQueryBuilder("record")
      .where("record.id = :id", { id: entityId })
      .andWhere("record.entityType = :entityType", { entityType })
      .andWhere("record.playgroundId = :playgroundId", {
        playgroundId: playground.id,
      })
      .andWhere("record.deleted = :deleted", { deleted: false })
      .andWhere("record.teamId IN (:...teamIds)", { teamIds });
    const record = await qb.getOne();
    if (!record) return null;
    return {
      entityType: record.entityType,
      entityId: record.id,
      data: record.data,
    };
  }

  private async listDocuments(
    caller: UserRequest,
    limit: number,
    cursor?: string,
  ): Promise<EntityPage> {
    const teamIds = this.teamIds(caller);
    const qb = this.documentRepository
      .createQueryBuilder("document")
      .leftJoinAndSelect("document.team", "team")
      .where("document.deleted = :deleted", { deleted: false });
    if (teamIds.length) {
      qb.andWhere(
        new Brackets((where) => {
          where
            .where("team.id IN (:...teamIds)", { teamIds })
            .orWhere("document.isPublic = :isPublic", { isPublic: true });
        }),
      );
    } else {
      qb.andWhere("document.isPublic = :isPublic", { isPublic: true });
    }
    qb.orderBy("document.createdAt", "DESC").addOrderBy("document.id", "DESC");
    if (cursor) {
      const current = await this.findDocument(caller, cursor);
      if (current) {
        const anchor = await this.documentRepository.findOne({
          where: { id: cursor },
        });
        if (anchor) {
          qb.andWhere(
            "(document.createdAt < :cursorAt OR (document.createdAt = :cursorAt AND document.id < :cursorId))",
            { cursorAt: anchor.createdAt, cursorId: anchor.id },
          );
        }
      }
    }
    const rows = await qb.take(limit + 1).getMany();
    const page = rows.slice(0, limit);
    return {
      data: page.map((document) => ({
        entityType: "document",
        entityId: document.id,
        title: document.title,
        documentCode: document.documentCode,
        teamId: document.team?.id,
      })),
      nextCursor: rows.length > limit ? page[page.length - 1].id : null,
    };
  }

  private async listUsers(caller: UserRequest, limit: number): Promise<EntityPage> {
    const access = await this.permissionService.hasPermissions(caller, "users", [
      "read",
    ]);
    if (!access.hasPermission) return { data: [], nextCursor: null };
    const teamIds = this.teamIds(caller);
    if (!teamIds.length) return { data: [], nextCursor: null };
    const memberships = await this.teamMemberRepository
      .createQueryBuilder("membership")
      .leftJoinAndSelect("membership.user", "user")
      .where("membership.teamId IN (:...teamIds)", { teamIds })
      .andWhere("user.deleted = :deleted", { deleted: false })
      .take(limit)
      .getMany();
    const seen = new Set<string>();
    const data: ResolvedEntity[] = [];
    for (const membership of memberships) {
      if (!membership.user || seen.has(membership.user.id)) continue;
      seen.add(membership.user.id);
      data.push({
        entityType: "user",
        entityId: membership.user.id,
        fname: membership.user.fname,
        lname: membership.user.lname,
        name: `${membership.user.fname} ${membership.user.lname}`.trim(),
      });
    }
    return { data, nextCursor: null };
  }

  private async listTeams(caller: UserRequest, limit: number): Promise<EntityPage> {
    const teamIds = this.teamIds(caller).slice(0, limit);
    if (!teamIds.length) return { data: [], nextCursor: null };
    const teams = await this.teamRepository
      .createQueryBuilder("team")
      .where("team.id IN (:...teamIds)", { teamIds })
      .andWhere("team.deleted = :deleted", { deleted: false })
      .getMany();
    return {
      data: teams.map((team) => ({
        entityType: "team",
        entityId: String(team.id),
        name: team.name,
      })),
      nextCursor: null,
    };
  }

  private async listRecords(
    caller: UserRequest,
    playground: Playground,
    entityType: string,
    limit: number,
    cursor?: string,
  ): Promise<EntityPage> {
    const teamIds = this.teamIds(caller);
    if (!teamIds.length) return { data: [], nextCursor: null };
    const qb = this.recordRepository
      .createQueryBuilder("record")
      .where("record.playgroundId = :playgroundId", { playgroundId: playground.id })
      .andWhere("record.entityType = :entityType", { entityType })
      .andWhere("record.deleted = :deleted", { deleted: false })
      .andWhere("record.teamId IN (:...teamIds)", { teamIds })
      .orderBy("record.createdAt", "DESC")
      .addOrderBy("record.id", "DESC");
    if (cursor) {
      const anchor = await this.recordRepository.findOne({ where: { id: cursor } });
      if (anchor) {
        qb.andWhere(
          "(record.createdAt < :cursorAt OR (record.createdAt = :cursorAt AND record.id < :cursorId))",
          { cursorAt: anchor.createdAt, cursorId: anchor.id },
        );
      }
    }
    const rows = await qb.take(limit + 1).getMany();
    const page = rows.slice(0, limit);
    return {
      data: page.map((record) => ({
        entityType: record.entityType,
        entityId: record.id,
        data: record.data,
      })),
      nextCursor: rows.length > limit ? page[page.length - 1].id : null,
    };
  }
}
