import {
  All,
  ArgumentsHost,
  Body,
  Catch,
  Controller,
  Delete,
  ExceptionFilter,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import multer, { MulterError } from "multer";
import { hasPermission } from "../authentication/permission.decorator";
import { UserRequest } from "../permissions/dto";
import { playgroundsPermission } from "../permissions/permissions";
import { formatResponse } from "../util/helper-util";
import {
  CallDto,
  CreatePlaygroundDto,
  CreateRecordDto,
  ListQueryDto,
  PlaygroundFetchDto,
  PlaygroundFileDto,
  PlaygroundFileQueryDto,
  PutAppFileDto,
  PutSourceDto,
  ReadQueryDto,
  ResolveQueryDto,
  SetEnabledDto,
  SqlDto,
  TeamQueryDto,
} from "./dtos";
import { EntityReadService } from "./entity-read.service";
import { EntityResolver } from "./entity-resolver";
import { playgroundException } from "./playground.errors";
import { PlaygroundRunQueue } from "./playground-run.queue";
import { HandleRequest, PlaygroundRunner } from "./playground-runner";
import { PlaygroundAppService } from "./playground-app.service";
import { PLAYGROUND_FILE_BYTES } from "./playground-disk";
import { PlaygroundService, SaveAction } from "./playground.service";

@Catch(MulterError)
class PlaygroundUploadFilter implements ExceptionFilter {
  catch(error: MulterError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const exception = playgroundException(error.code === "LIMIT_FILE_SIZE" ? "PG_026" : "PG_025");
    const status = exception.getStatus();
    const body = exception.getResponse();
    response.status(status).json(typeof body === "string" ? { message: body } : body);
  }
} 

@ApiTags("Playgrounds")
@ApiBearerAuth()
@Controller("playgrounds")
export class PlaygroundController {
  private readonly logger = new Logger(PlaygroundController.name);

  constructor(
    private readonly playgrounds: PlaygroundService,
    private readonly resolver: EntityResolver,
    private readonly reader: EntityReadService,
    private readonly queue: PlaygroundRunQueue,
    private readonly runner: PlaygroundRunner,
    private readonly apps: PlaygroundAppService,
  ) {}

  @Post()
  @ApiOperation({ summary: "Create a playground. It starts turned off." })
  @hasPermission({ subject: playgroundsPermission.subject, actions: ["create"] })
  async create(@Body() dto: CreatePlaygroundDto, @Req() req, @Res() res) {
    return formatResponse(
      this.logger,
      this.createWithFolder(dto, req.user),
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

  @Get("schema")
  @ApiOperation({
    summary: "Describe every existing model the caller can read, including enum values. This is best for ai agents.",
  })
  @hasPermission({ subject: playgroundsPermission.subject, actions: ["read"] })
  async schemas(@Req() req, @Res() res) {
    return formatResponse(
      this.logger,
      this.reader.schema(req.user),
      res,
      "Read entity schema",
    );
  }

  @Get("schema/:entity")
  @ApiOperation({ summary: "Describe one existing model, including enum values." })
  @hasPermission({ subject: playgroundsPermission.subject, actions: ["read"] })
  async schema(@Param("entity") entity: string, @Req() req, @Res() res) {
    return formatResponse(
      this.logger,
      this.reader.schema(req.user, entity),
      res,
      "Read one entity schema",
    );
  }

  @Post("query")
  @ApiOperation({
    summary: "Run a read-only query over an existing model. This does not write.",
  })
  @hasPermission({ subject: playgroundsPermission.subject, actions: ["read"] })
  async query(@Body() dto: ReadQueryDto, @Req() req, @Res() res) {
    return formatResponse(
      this.logger,
      this.reader.query(req.user, dto),
      res,
      "Read entity query",
    );
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a playground and its files." })
  @hasPermission({ subject: playgroundsPermission.subject, actions: ["delete"] })
  async remove(@Param("id") id: string, @Req() req, @Res() res) {
    return formatResponse(
      this.logger,
      this.removePlayground(id, req.user),
      res,
      "Delete playground",
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

  @Get(":id/app")
  @ApiOperation({ summary: "Read the playground page, script, and optional server file." })
  @hasPermission({ subject: playgroundsPermission.subject, actions: ["read"] })
  async readApp(@Param("id") id: string, @Req() req, @Res() res) {
    return formatResponse(
      this.logger,
      this.apps.readApp(id, req.user),
      res,
      "Read playground app",
    );
  }

  @Put(":id/app/:name")
  @ApiOperation({ summary: "Store one playground file. This does not publish it." })
  @hasPermission({ subject: playgroundsPermission.subject, actions: ["update"] })
  async writeApp(
    @Param("id") id: string,
    @Param("name") name: string,
    @Body() dto: PutAppFileDto,
    @Req() req,
    @Res() res,
  ) {
    return formatResponse(
      this.logger,
      this.apps.writeApp(id, req.user, name, dto.text),
      res,
      "Store playground file",
    );
  }

  @Post(":id/sql")
  @ApiOperation({ summary: "Run one statement on this playground's database." })
  @hasPermission({ subject: playgroundsPermission.subject, actions: ["read"] })
  async sql(@Param("id") id: string, @Body() dto: SqlDto, @Req() req, @Res() res) {
    return formatResponse(
      this.logger,
      this.apps.query(id, req.user, dto.statement, dto.params),
      res,
      "Run playground statement",
    );
  }

  @Post(":id/call/:fn")
  @ApiOperation({ summary: "Run one server function while this playground is open." })
  @hasPermission({ subject: playgroundsPermission.subject, actions: ["read"] })
  async call(
    @Param("id") id: string,
    @Param("fn") fn: string,
    @Body() dto: CallDto,
    @Req() req,
    @Res() res,
  ) {
    return formatResponse(
      this.logger,
      this.apps.call(
        id,
        req.user,
        fn,
        dto.argument ?? null,
        headerValue(req.headers?.authorization),
        headerValue(req.headers?.["x-locale"]),
      ),
      res,
      "Call playground function",
    );
  }

  @Post(":id/fetch")
  @ApiOperation({ summary: "Fetch one path on this app with the caller's session." })
  @hasPermission({ subject: playgroundsPermission.subject, actions: ["read"] })
  async fetchPath(
    @Param("id") id: string,
    @Body() dto: PlaygroundFetchDto,
    @Req() req,
    @Res() res,
  ) {
    return formatResponse(
      this.logger,
      this.apps.fetch(
        id,
        req.user,
        dto.path,
        dto.method,
        dto.body,
        headerValue(req.headers?.authorization),
        headerValue(req.headers?.["x-locale"]),
      ),
      res,
      "Fetch playground endpoint",
    );
  }

  @Get(":id/file")
  @ApiOperation({ summary: "Read one file stored by this playground." })
  @hasPermission({ subject: playgroundsPermission.subject, actions: ["read"] })
  async readFile(
    @Param("id") id: string,
    @Query() query: PlaygroundFileQueryDto,
    @Req() req,
    @Res() res,
  ) {
    try {
      const file = await this.apps.readFile(id, req.user, query.name);
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Type", file.mime);
      res.setHeader("Content-Length", String(file.bytes.length));
      res.status(200).send(file.bytes);
      return;
    } catch (error) {
      return formatResponse(this.logger, Promise.reject(error), res, "Read playground file");
    }
  }

  @Put(":id/file")
  @ApiOperation({ summary: "Store one attachment for this playground." })
  @hasPermission({ subject: playgroundsPermission.subject, actions: ["read"] })
  @UseFilters(PlaygroundUploadFilter)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: PLAYGROUND_FILE_BYTES } }))
  async writeFile(
    @Param("id") id: string,
    @Body() dto: PlaygroundFileDto,
    @UploadedFile() file: { buffer?: Buffer; mimetype?: string } | undefined,
    @Req() req,
    @Res() res,
  ) {
    if (!file?.buffer?.length) {
      return formatResponse(
        this.logger,
        Promise.reject(playgroundException("PG_025")),
        res,
        "Write playground file",
      );
    }
    return formatResponse(
      this.logger,
      this.apps.writeFile(id, req.user, dto.name, file.buffer, file.mimetype),
      res,
      "Write playground file",
    );
  }

  @All([":id/api", ":id/api/*path"])
  @ApiOperation({ summary: "Run one route defined by this playground." })
  @hasPermission({ subject: playgroundsPermission.subject, actions: ["read"] })
  async api(@Param("id") id: string, @Param("path") pathParam: unknown, @Req() req, @Res() res) {
    let upload: { bytes: Buffer; mime?: string; filename?: string } | null = null;
    try {
      upload = await readApiUpload(req, res);
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code) : "";
      return formatResponse(
        this.logger,
        Promise.reject(playgroundException(code === "LIMIT_FILE_SIZE" ? "PG_026" : "PG_025")),
        res,
        "Run playground route",
      );
    }
    const method = String(req.method || "GET").toUpperCase();
    try {
      const body = upload
        ? parseApiBody(req.body?.body)
        : method === "GET" || method === "HEAD"
          ? null
          : req.body;
      const result = await this.apps.dispatch(
        id,
        req.user,
        method,
        pathParam,
        body,
        stringQuery(req.query),
        upload,
        headerValue(req.headers?.authorization),
        headerValue(req.headers?.["x-locale"]),
      );
      if (result.kind === "file") {
        sendPlaygroundFile(res, result.bytes, result.mime);
        return;
      }
      return formatResponse(this.logger, Promise.resolve(result.value), res, "Run playground route");
    } catch (error) {
      return formatResponse(this.logger, Promise.reject(error), res, "Run playground route");
    }
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

  private async removePlayground(id: string, user: UserRequest) {
    const removed = await this.playgrounds.remove(id, user);
    await this.apps.discard(id);
    return removed;
  }

  private async createWithFolder(dto: CreatePlaygroundDto, user: UserRequest) {
    const created = await this.playgrounds.create(dto.name, dto.teamId, user);
    await this.apps.prepare(created.id, user);
    return created;
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
      schema: async (entity?: string) => this.reader.schema(user, entity || ""),
      query: async (query: Record<string, unknown>) =>
        this.reader.query(user, query as never),
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

const apiUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PLAYGROUND_FILE_BYTES, files: 1 },
}).single("file");

function readApiUpload(
  req,
  res,
): Promise<{ bytes: Buffer; mime?: string; filename?: string } | null> {
  const type = String(req.headers?.["content-type"] || "");
  if (!type.includes("multipart/form-data")) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    apiUpload(req, res, (error?: unknown) => {
      if (error) {
        reject(error);
        return;
      }
      const file = req.file as { buffer?: Buffer; mimetype?: string; originalname?: string } | undefined;
      if (!file?.buffer?.length) {
        resolve(null);
        return;
      }
      resolve({ bytes: file.buffer, mime: file.mimetype, filename: file.originalname });
    });
  });
}

function parseApiBody(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw playgroundException("PG_029");
  }
}

function stringQuery(query: unknown) {
  const out: Record<string, string> = {};
  if (!query || typeof query !== "object") return out;
  for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
    if (Object.keys(out).length >= 20) break;
    if (!/^[A-Za-z0-9._-]{1,64}$/.test(key)) continue;
    const text = Array.isArray(value) ? value[0] : value;
    if (typeof text !== "string" || text.length > 200) continue;
    out[key] = text;
  }
  return out;
}

function sendPlaygroundFile(res, bytes: Buffer, mime: string) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Type", mime);
  res.setHeader("Content-Length", String(bytes.length));
  res.status(200).send(bytes);
}

function headerValue(value: unknown) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}


