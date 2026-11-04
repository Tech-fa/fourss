import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { hasPermission } from "../authentication/permission.decorator";
import { UserRequest } from "../permissions/dto";
import { playgroundsPermission } from "../permissions/permissions";
import { formatResponse } from "../util/helper-util";
import {
  CreatePlaygroundDto,
  CreateRecordDto,
  ListQueryDto,
  PutSourceDto,
  ResolveQueryDto,
  SetEnabledDto,
  TeamQueryDto,
} from "./dtos";
import { EntityResolver } from "./entity-resolver";
import { playgroundException } from "./playground.errors";
import { PlaygroundRunQueue } from "./playground-run.queue";
import { HandleRequest, PlaygroundRunner } from "./playground-runner";
import { PlaygroundService, SaveAction } from "./playground.service";

@ApiTags("Playgrounds")
@ApiBearerAuth()
@Controller("playgrounds")
export class PlaygroundController {
  private readonly logger = new Logger(PlaygroundController.name);

  constructor(
    private readonly playgrounds: PlaygroundService,
    private readonly resolver: EntityResolver,
    private readonly queue: PlaygroundRunQueue,
    private readonly runner: PlaygroundRunner,
  ) {}

  @Post()
  @ApiOperation({ summary: "Create a playground. It starts turned off." })
  @hasPermission({ subject: playgroundsPermission.subject, actions: ["create"] })
  async create(@Body() dto: CreatePlaygroundDto, @Req() req, @Res() res) {
    return formatResponse(
      this.logger,
      this.playgrounds.create(dto.name, dto.teamId, req.user),
      res,
      "Create playground",
    );
  }

  @Get("published")
  @ApiOperation({
    summary: "List playgrounds that have been published, including ones that are off.",
  })
  @hasPermission({ subject: playgroundsPermission.subject, actions: ["read"] })
  async published(@Query() query: TeamQueryDto, @Req() req, @Res() res) {
    return formatResponse(
      this.logger,
      this.playgrounds.listPublished(query.teamId, req.user),
      res,
      "List published playgrounds",
    );
  }

  @Get()
  @ApiOperation({ summary: "List every playground for a team, including drafts." })
  @hasPermission({ subject: playgroundsPermission.subject, actions: ["read"] })
  async list(@Query() query: TeamQueryDto, @Req() req, @Res() res) {
    return formatResponse(
      this.logger,
      this.playgrounds.list(query.teamId, req.user),
      res,
      "List playgrounds",
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Get one playground, including its program." })
  @hasPermission({ subject: playgroundsPermission.subject, actions: ["read"] })
  async get(@Param("id") id: string, @Req() req, @Res() res) {
    return formatResponse(
      this.logger,
      this.playgrounds.get(id, req.user),
      res,
      "Get playground",
    );
  }

  @Put(":id/source")
  @ApiOperation({ summary: "Store the playground program. This does not publish it." })
  @hasPermission({ subject: playgroundsPermission.subject, actions: ["update"] })
  async putSource(
    @Param("id") id: string,
    @Body() dto: PutSourceDto,
    @Req() req,
    @Res() res,
  ) {
    return formatResponse(
      this.logger,
      this.playgrounds.putSource(id, dto.source, req.user),
      res,
      "Store playground source",
    );
  }

  @Post(":id/publish")
  @ApiOperation({ summary: "Publish the playground and turn it on." })
  @hasPermission({ subject: playgroundsPermission.subject, actions: ["update"] })
  async publish(@Param("id") id: string, @Req() req, @Res() res) {
    return formatResponse(
      this.logger,
      this.playgrounds.publish(id, req.user),
      res,
      "Publish playground",
    );
  }

  @Post(":id/enabled")
  @ApiOperation({ summary: "Turn a playground on or off without clearing its publisher." })
  @hasPermission({ subject: playgroundsPermission.subject, actions: ["update"] })
  async setEnabled(
    @Param("id") id: string,
    @Body() dto: SetEnabledDto,
    @Req() req,
    @Res() res,
  ) {
    return formatResponse(
      this.logger,
      this.playgrounds.setEnabled(id, dto.enabled, req.user),
      res,
      "Set playground enabled",
    );
  }

  @Get(":id/resolve")
  @ApiOperation({ summary: "Resolve one entity_type and entity_id the caller may see." })
  @hasPermission({ subject: playgroundsPermission.subject, actions: ["read"] })
  async resolve(
    @Param("id") id: string,
    @Query() query: ResolveQueryDto,
    @Req() req,
    @Res() res,
  ) {
    return formatResponse(
      this.logger,
      this.resolveFor(id, req.user, query.entityType, query.entityId),
      res,
      "Resolve playground target",
    );
  }

  @Get(":id/list")
  @ApiOperation({ summary: "List records of one kind the caller may see." })
  @hasPermission({ subject: playgroundsPermission.subject, actions: ["read"] })
  async listEntities(
    @Param("id") id: string,
    @Query() query: ListQueryDto,
    @Req() req,
    @Res() res,
  ) {
    return formatResponse(
      this.logger,
      this.listFor(id, req.user, query),
      res,
      "List playground targets",
    );
  }

  @Post(":id/records")
  @ApiOperation({ summary: "Run handle, then store the record it returns." })
  @hasPermission({ subject: playgroundsPermission.subject, actions: ["create"] })
  async createRecord(
    @Param("id") id: string,
    @Body() dto: CreateRecordDto,
    @Req() req,
    @Res() res,
  ) {
    return formatResponse(
      this.logger,
      this.saveRecord(id, dto, req.user),
      res,
      "Create playground record",
    );
  }

  @Delete(":id/records/:recordId")
  @ApiOperation({ summary: "Run handle, then soft-delete a playground record." })
  @hasPermission({ subject: playgroundsPermission.subject, actions: ["delete"] })
  async deleteRecord(
    @Param("id") id: string,
    @Param("recordId") recordId: string,
    @Req() req,
    @Res() res,
  ) {
    return formatResponse(
      this.logger,
      this.removeRecord(id, recordId, req.user),
      res,
      "Delete playground record",
    );
  }

  private async resolveFor(
    id: string,
    user: UserRequest,
    entityType: string,
    entityId: string,
  ) {
    const playground = await this.playgrounds.requirePlayground(id, user);
    return this.resolver.resolve(user, playground, entityType, entityId);
  }

  private async listFor(id: string, user: UserRequest, query: ListQueryDto) {
    const playground = await this.playgrounds.requirePlayground(id, user);
    return this.resolver.list(
      user,
      playground,
      query.entityType,
      query.limit,
      query.cursor,
    );
  }

  private bridge(user: UserRequest, playgroundId: string) {
    return {
      get: async (entityType: string, entityId: string) => {
        const playground = await this.playgrounds.requirePlayground(playgroundId, user);
        return this.resolver.resolve(user, playground, entityType, entityId);
      },
      list: async (
        entityType: string,
        query: { limit?: number; cursor?: string },
      ) => {
        const playground = await this.playgrounds.requirePlayground(playgroundId, user);
        return this.resolver.list(
          user,
          playground,
          entityType,
          query.limit,
          query.cursor,
        );
      },
    };
  }

  private async saveRecord(id: string, dto: CreateRecordDto, user: UserRequest) {
    const playground = await this.playgrounds.requireWritable(id, user);
    const request: HandleRequest = {
      action: "save",
      entityType: dto.entityType,
      data: dto.data,
      refs: dto.refs || [],
      page: dto.page || {},
    };
    const result = await this.queue.schedule(() =>
      this.runner.runHandle(playground.source, request, this.bridge(user, id)),
    );
    const action = this.readSave(result);
    return this.playgrounds.commitSave(playground, user, action);
  }

  private async removeRecord(id: string, recordId: string, user: UserRequest) {
    const { playground, record } = await this.playgrounds.requireRecord(
      id,
      recordId,
      user,
    );
    if (!(playground.enabled === true || Number(playground.enabled) === 1)) {
      throw playgroundException("PG_018");
    }
    const request: HandleRequest = {
      action: "remove",
      entityType: record.entityType,
      entityId: record.id,
      page: {},
    };
    const result = await this.queue.schedule(() =>
      this.runner.runHandle(playground.source, request, this.bridge(user, id)),
    );
    if (
      !result ||
      result.action !== "remove" ||
      result.entityId !== record.id ||
      result.entityType !== record.entityType
    ) {
      throw playgroundException("PG_014");
    }
    return this.playgrounds.softDelete(record);
  }

  private readSave(result: unknown): SaveAction {
    if (!result || typeof result !== "object") throw playgroundException("PG_014");
    const action = result as SaveAction;
    if (action.action !== "save" || typeof action.entityType !== "string") {
      throw playgroundException("PG_014");
    }
    return {
      action: "save",
      entityType: action.entityType,
      data: (action.data || {}) as SaveAction["data"],
      refs: Array.isArray(action.refs) ? action.refs : [],
    };
  }
}
