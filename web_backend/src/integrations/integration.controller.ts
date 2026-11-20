import { All, Body, Controller, Get, Logger, Param, Post, Req, Res } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { Request, Response } from "express";
import { UnauthorizedResponseDto } from "../authentication/auth.dto";
import { hasPermission } from "../authentication/permission.decorator";
import { integrationsPermission } from "../permissions/permissions";
import { Public } from "../util/constants";
import { formatResponse } from "../util/helper-util";
import {
  CallRouteDto,
  CreateIntegrationDto,
  ProposeIntegrationDto,
  RestoreRevisionDto,
  SaveValuesDto,
  SetStatusDto,
  TryHookDto,
} from "./dtos";
import {
  IntegrationDetailResponseDto,
  IntegrationErrorResponseDto,
  IntegrationFailureResponseDto,
  IntegrationSummaryResponseDto,
} from "./integration.responses";
import { IntegrationService } from "./integration.service";

const connectionId = () =>
  ApiParam({ name: "id", format: "uuid", description: "Connection id." });

@ApiTags("Integrations")
@ApiBearerAuth()
@Controller("integrations")
export class IntegrationController {
  private readonly logger = new Logger(IntegrationController.name);

  constructor(private readonly integrations: IntegrationService) {}

  @Public()
  @All("hooks/*path")
  @ApiOperation({
    summary: "Inbound URL a third party calls.",
    description:
      "The provider calls /integrations/hooks/{connectionId}/{route}. The agent does not call this. The connection program's matching route handles it.",
  })
  async hook(@Req() req: Request, @Res() res: Response) {
    const prefix = "/integrations/hooks/";
    const url = (req.originalUrl || req.url || "").split("?")[0];
    const path = decodeURIComponent(url.startsWith(prefix) ? url.slice(prefix.length) : "").replace(/^\/+|\/+$/g, "");
    const result = await this.integrations.receiveHttp(path, {
      method: req.method,
      headers: req.headers,
      query: req.query,
      body: req.body,
    });
    res.status(result.status).send(result.body);
  }

  @Post()
  @ApiOperation({ summary: "Create a connection. It starts as a draft with no program." })
  @ApiBody({ type: CreateIntegrationDto })
  @ApiOkResponse({ type: IntegrationDetailResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: IntegrationErrorResponseDto })
  @hasPermission({ subject: integrationsPermission.subject, actions: ["create"] })
  async create(@Body() dto: CreateIntegrationDto, @Req() req, @Res() res: Response) {
    return formatResponse(
      this.logger,
      this.integrations.create(String(req.user?.id || ""), dto.name),
      res,
      "Create integration",
    );
  }

  @Get()
  @ApiOperation({ summary: "List connections and the status text each one shows." })
  @ApiOkResponse({ type: IntegrationSummaryResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @hasPermission({ subject: integrationsPermission.subject, actions: ["read"] })
  async list(@Res() res: Response) {
    return formatResponse(this.logger, this.integrations.list(), res, "List integrations");
  }

  @Get(":id")
  @connectionId()
  @ApiOperation({
    summary: "Read one connection.",
    description:
      "Returns the steps the user follows, the page, and the program. Secret values are omitted. missing lists required keys that still need an answer. copyValue for webhookUrl and oauthRedirectUrl is filled by the server.",
  })
  @ApiOkResponse({ type: IntegrationDetailResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiNotFoundResponse({ type: IntegrationErrorResponseDto })
  @hasPermission({ subject: integrationsPermission.subject, actions: ["read"] })
  async read(@Param("id") id: string, @Res() res: Response) {
    return formatResponse(this.logger, this.integrations.read(id), res, "Read integration");
  }

  @Post(":id/status")
  @connectionId()
  @ApiOperation({ summary: "Set the status text shown for this connection." })
  @ApiBody({ type: SetStatusDto })
  @ApiOkResponse({ type: IntegrationDetailResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: IntegrationErrorResponseDto })
  @ApiNotFoundResponse({ type: IntegrationErrorResponseDto })
  @hasPermission({ subject: integrationsPermission.subject, actions: ["update"] })
  async status(@Param("id") id: string, @Body() dto: SetStatusDto, @Res() res: Response) {
    return formatResponse(
      this.logger,
      this.integrations.setConnectionStatus(id, dto.status),
      res,
      "Set integration status",
    );
  }

  @Post(":id/call")
  @connectionId()
  @ApiOperation({
    summary: "Call a route the connection program registered.",
    description: "Runs route() from the revision the user is looking at. This does not accept the draft. When the route throws, the response message is that error.",
  })
  @ApiBody({ type: CallRouteDto })
  @ApiOkResponse({ description: "The value the route returned." })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: IntegrationErrorResponseDto })
  @ApiNotFoundResponse({ type: IntegrationErrorResponseDto })
  @hasPermission({ subject: integrationsPermission.subject, actions: ["update"] })
  async call(@Param("id") id: string, @Body() dto: CallRouteDto, @Res() res: Response) {
    return formatResponse(
      this.logger,
      this.integrations.callRoute(id, dto.method || "POST", dto.path, dto.body),
      res,
      "Call integration route",
    );
  }

  @Post(":id/proposal")
  @connectionId()
  @ApiOperation({
    summary: "Write a draft of the questions, the page, and the program.",
    description:
      "Send inputs and steps first so the user can answer them. Send source, html, and js after the values are saved. Omitted parts stay as they are. The accepted revision keeps running.",
  })
  @ApiBody({ type: ProposeIntegrationDto })
  @ApiOkResponse({ type: IntegrationDetailResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: IntegrationErrorResponseDto })
  @ApiNotFoundResponse({ type: IntegrationErrorResponseDto })
  @hasPermission({ subject: integrationsPermission.subject, actions: ["update"] })
  async propose(@Param("id") id: string, @Body() dto: ProposeIntegrationDto, @Res() res: Response) {
    return formatResponse(this.logger, this.integrations.propose(id, dto), res, "Propose integration");
  }

  @Post(":id/values")
  @connectionId()
  @ApiOperation({
    summary: "Save answers for one step.",
    description: "The user submits this from the connection page. The agent does not send secret values.",
  })
  @ApiBody({ type: SaveValuesDto })
  @ApiOkResponse({ type: IntegrationDetailResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: IntegrationErrorResponseDto })
  @hasPermission({ subject: integrationsPermission.subject, actions: ["update"] })
  async save(@Param("id") id: string, @Body() dto: SaveValuesDto, @Res() res: Response) {
    return formatResponse(
      this.logger,
      this.integrations.save(id, dto.values, dto.stepId),
      res,
      "Save integration values",
    );
  }

  @Post(":id/steps/:stepId/done")
  @connectionId()
  @ApiParam({ name: "stepId", description: "Id of a manual step the user has finished." })
  @ApiOperation({ summary: "Mark a manual step done." })
  @ApiOkResponse({ type: IntegrationDetailResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: IntegrationErrorResponseDto })
  @hasPermission({ subject: integrationsPermission.subject, actions: ["update"] })
  async done(@Param("id") id: string, @Param("stepId") stepId: string, @Res() res: Response) {
    return formatResponse(this.logger, this.integrations.markDone(id, stepId), res, "Mark integration step done");
  }

  @Post(":id/try")
  @connectionId()
  @ApiOperation({ summary: "Run one exported hook from the latest draft. This does not accept the draft." })
  @ApiBody({ type: TryHookDto })
  @ApiOkResponse({ description: "ok and the value the hook returned." })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: IntegrationErrorResponseDto })
  @hasPermission({ subject: integrationsPermission.subject, actions: ["update"] })
  async tryHook(@Param("id") id: string, @Body() dto: TryHookDto, @Res() res: Response) {
    return formatResponse(
      this.logger,
      this.integrations.tryHook(id, dto.hook, dto.payload),
      res,
      "Try integration hook",
    );
  }

  @Post(":id/accept")
  @connectionId()
  @ApiOperation({
    summary: "Accept the latest draft and start its schedules.",
    description: "Required keys must already be saved. An inbound path still needs a step that copies the webhook URL.",
  })
  @ApiOkResponse({ type: IntegrationDetailResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: IntegrationErrorResponseDto })
  @hasPermission({ subject: integrationsPermission.subject, actions: ["update"] })
  async accept(@Param("id") id: string, @Res() res: Response) {
    return formatResponse(this.logger, this.integrations.acceptDraft(id), res, "Accept integration");
  }

  @Post(":id/restore")
  @connectionId()
  @ApiOperation({ summary: "Point the connection back at an older accepted revision." })
  @ApiBody({ type: RestoreRevisionDto })
  @ApiOkResponse({ type: IntegrationDetailResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: IntegrationErrorResponseDto })
  @hasPermission({ subject: integrationsPermission.subject, actions: ["update"] })
  async restore(@Param("id") id: string, @Body() dto: RestoreRevisionDto, @Res() res: Response) {
    return formatResponse(
      this.logger,
      this.integrations.restoreRevision(id, dto.revisionId),
      res,
      "Restore integration",
    );
  }

  @Get(":id/failures")
  @connectionId()
  @ApiOperation({ summary: "List recent failures and log lines. Messages are redacted." })
  @ApiOkResponse({ type: IntegrationFailureResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiNotFoundResponse({ type: IntegrationErrorResponseDto })
  @hasPermission({ subject: integrationsPermission.subject, actions: ["read"] })
  async failures(@Param("id") id: string, @Res() res: Response) {
    return formatResponse(this.logger, this.integrations.failuresFor(id), res, "List integration failures");
  }
}
