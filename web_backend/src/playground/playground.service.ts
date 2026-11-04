import { Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { UserRequest } from "../permissions/dto";
import { ENTITY_TYPE_PATTERN, RefDto } from "./dtos";
import { EntityResolver, RESERVED_ENTITY_TYPES } from "./entity-resolver";
import { playgroundException } from "./playground.errors";
import { PlaygroundScalar, PlaygroundRecord } from "./playground-record.entity";
import { PlaygroundReference } from "./playground-reference.entity";
import { Playground } from "./playground.entity";

const SOURCE_LIMIT = 262144;
const DATA_LIMIT = 16384;
const REF_LIMIT = 20;

export type SaveAction = {
  action: "save";
  entityType: string;
  data: Record<string, PlaygroundScalar>;
  refs: RefDto[];
};

@Injectable()
export class PlaygroundService {
  constructor(
    @InjectRepository(Playground)
    private readonly playgroundRepository: Repository<Playground>,
    @InjectRepository(PlaygroundRecord)
    private readonly recordRepository: Repository<PlaygroundRecord>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly resolver: EntityResolver,
  ) {}

  async create(name: string, teamId: number, user: UserRequest) {
    this.assertTeam(user, teamId);
    const now = Date.now();
    const playground = this.playgroundRepository.create({
      id: uuidv4(),
      teamId,
      name: name.trim(),
      source: "",
      revision: 0,
      createdById: user.id,
      publisherId: null,
      enabled: false,
      lastPublishedAt: null,
      createdAt: now,
      updatedAt: now,
      deleted: false,
    });
    const saved = await this.playgroundRepository.save(playground);
    return this.toDetail(saved);
  }

  async list(teamId: number, user: UserRequest) {
    this.assertTeam(user, teamId);
    const rows = await this.playgroundRepository.find({
      where: { teamId, deleted: false },
      relations: ["publisher"],
      order: { updatedAt: "DESC" },
    });
    return rows.map((row) => this.toSummary(row));
  }

  async listPublished(teamId: number, user: UserRequest) {
    this.assertTeam(user, teamId);
    const rows = await this.playgroundRepository.find({
      where: { teamId, deleted: false },
      relations: ["publisher"],
      order: { lastPublishedAt: "DESC" },
    });
    return rows
      .filter((row) => this.asNumber(row.lastPublishedAt) != null)
      .map((row) => this.toPublished(row));
  }

  async get(id: string, user: UserRequest) {
    return this.toDetail(await this.requirePlayground(id, user));
  }

  async putSource(id: string, source: string, user: UserRequest) {
    if (source.length > SOURCE_LIMIT) throw playgroundException("PG_007");
    const playground = await this.requirePlayground(id, user);
    playground.source = source;
    playground.revision = Number(playground.revision || 0) + 1;
    playground.updatedAt = Date.now();
    const saved = await this.playgroundRepository.save(playground);
    return this.toDetail(saved);
  }

  async publish(id: string, user: UserRequest) {
    const playground = await this.requirePlayground(id, user);
    const now = Date.now();
    playground.publisherId = user.id;
    playground.publisher = { id: user.id } as Playground["publisher"];
    playground.lastPublishedAt = now;
    playground.enabled = true;
    playground.updatedAt = now;
    const saved = await this.playgroundRepository.save(playground);
    const reloaded = await this.playgroundRepository.findOne({
      where: { id: saved.id },
      relations: ["publisher"],
    });
    return this.toDetail(reloaded || saved);
  }

  async setEnabled(id: string, enabled: boolean, user: UserRequest) {
    const playground = await this.requirePlayground(id, user);
    playground.enabled = enabled;
    playground.updatedAt = Date.now();
    const saved = await this.playgroundRepository.save(playground);
    return this.toDetail(saved);
  }

  async requirePlayground(id: string, user: UserRequest) {
    const playground = await this.playgroundRepository.findOne({
      where: { id, deleted: false },
      relations: ["publisher"],
    });
    if (!playground || !this.teamIds(user).includes(Number(playground.teamId))) {
      throw playgroundException("PG_002");
    }
    return playground;
  }

  async requireWritable(id: string, user: UserRequest) {
    const playground = await this.requirePlayground(id, user);
    if (!this.isEnabled(playground)) throw playgroundException("PG_018");
    return playground;
  }

  async commitSave(playground: Playground, user: UserRequest, action: SaveAction) {
    if (!this.isEnabled(playground)) throw playgroundException("PG_018");
    if (RESERVED_ENTITY_TYPES.has(action.entityType)) {
      throw playgroundException("PG_004");
    }
    if (!ENTITY_TYPE_PATTERN.test(action.entityType)) {
      throw playgroundException("PG_005");
    }
    const data = this.scalarData(action.data);
    const refs = action.refs || [];
    if (refs.length > REF_LIMIT) throw playgroundException("PG_009");
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      for (const ref of refs) {
        await this.resolver.resolve(user, playground, ref.entityType, ref.entityId);
      }
      const now = Date.now();
      const records = queryRunner.manager.getRepository(PlaygroundRecord);
      const links = queryRunner.manager.getRepository(PlaygroundReference);
      const record = records.create({
        id: uuidv4(),
        playgroundId: playground.id,
        teamId: playground.teamId,
        entityType: action.entityType,
        data,
        createdById: user.id,
        createdAt: now,
        updatedAt: now,
        deleted: false,
      });
      await records.save(record);
      for (const ref of refs) {
        await links.save(
          links.create({
            playgroundId: playground.id,
            fromRecordId: record.id,
            entityType: ref.entityType,
            entityId: ref.entityId,
          }),
        );
      }
      await queryRunner.commitTransaction();
      return {
        id: record.id,
        entityType: record.entityType,
        data: record.data,
        refs: refs.map((ref) => ({
          entityType: ref.entityType,
          entityId: ref.entityId,
        })),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async requireRecord(playgroundId: string, recordId: string, user: UserRequest) {
    const playground = await this.requirePlayground(playgroundId, user);
    const record = await this.recordRepository.findOne({
      where: { id: recordId, playgroundId, deleted: false },
    });
    if (!record) throw playgroundException("PG_017");
    return { playground, record };
  }

  async softDelete(record: PlaygroundRecord) {
    record.deleted = true;
    record.updatedAt = Date.now();
    await this.recordRepository.save(record);
    return { id: record.id, deleted: true };
  }

  private assertTeam(user: UserRequest, teamId: number) {
    if (!this.teamIds(user).includes(Number(teamId))) {
      throw playgroundException("PG_001");
    }
  }

  private teamIds(user: UserRequest) {
    return Array.isArray(user.teamIds) ? user.teamIds.map((id) => Number(id)) : [];
  }

  private isEnabled(playground: Playground) {
    return playground.enabled === true || Number(playground.enabled) === 1;
  }

  private scalarData(value: unknown): Record<string, PlaygroundScalar> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw playgroundException("PG_008");
    }
    const entries = Object.entries(value as Record<string, unknown>);
    if (JSON.stringify(value).length > DATA_LIMIT) throw playgroundException("PG_008");
    const data: Record<string, PlaygroundScalar> = {};
    for (const [key, item] of entries) {
      if (
        item !== null &&
        typeof item !== "string" &&
        typeof item !== "number" &&
        typeof item !== "boolean"
      ) {
        throw playgroundException("PG_008");
      }
      data[key] = item as PlaygroundScalar;
    }
    return data;
  }

  private asNumber(value: number | string | null | undefined) {
    if (value == null || value === "") return null;
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private publisherOf(playground: Playground) {
    if (!playground.publisherId && !playground.publisher) return null;
    const publisher = playground.publisher;
    const fname = publisher?.fname || "";
    const lname = publisher?.lname || "";
    return {
      id: playground.publisherId || publisher?.id || "",
      fname,
      lname,
      name: `${fname} ${lname}`.trim(),
    };
  }

  private toSummary(playground: Playground) {
    return {
      id: playground.id,
      teamId: Number(playground.teamId),
      name: playground.name,
      enabled: this.isEnabled(playground),
      revision: Number(playground.revision || 0),
      lastPublishedAt: this.asNumber(playground.lastPublishedAt),
      publisher: this.publisherOf(playground),
      updatedAt: this.asNumber(playground.updatedAt),
    };
  }

  private toPublished(playground: Playground) {
    return {
      id: playground.id,
      name: playground.name,
      enabled: this.isEnabled(playground),
      publisher: this.publisherOf(playground),
      lastPublishedAt: this.asNumber(playground.lastPublishedAt),
    };
  }

  private toDetail(playground: Playground) {
    return {
      ...this.toSummary(playground),
      source: playground.source || "",
      createdById: playground.createdById,
    };
  }
}
