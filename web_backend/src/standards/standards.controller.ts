import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { Response } from "express";
import { hasPermission } from "../authentication/permission.decorator";
import {
  CatalogErrorResponseDto,
  UnauthorizedResponseDto,
} from "../authentication/auth.dto";
import { PermissionEnum, standardsPermission } from "../permissions/permissions";
import { formatResponse } from "../util/helper-util";
import {
  CreateImplementationDocumentDto,
  CreateImplementationDto,
  ImplementationDocumentParamDto,
  ImplementationIdParamDto,
  ImplementationResponseDto,
  StandardListItemResponseDto,
  UpdateImplementationDocumentDto,
} from "./dtos";
import { StandardsService } from "./standards.service";

@ApiTags("Standards")
@ApiBearerAuth()
@Controller("standards")
export class StandardsController {
  private readonly logger = new Logger(StandardsController.name);

  constructor(private readonly standardsService: StandardsService) {}

  @Get()
  @ApiOperation({
    summary: "List available standards and their required documents.",
  })
  @ApiOkResponse({ type: StandardListItemResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @hasPermission({
    subject: standardsPermission.subject,
    actions: [PermissionEnum.READ],
  })
  async listStandards(@Res() res: Response) {
    return formatResponse(
      this.logger,
      this.standardsService.listStandardsWithImplementations(),
      res,
      "Standards fetched successfully",
    );
  }

  @Get("implementations")
  @ApiOperation({ summary: "List standard implementations and document tracking." })
  @ApiOkResponse({ type: ImplementationResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @hasPermission({
    subject: standardsPermission.subject,
    actions: [PermissionEnum.READ],
  })
  async listImplementations(@Res() res: Response) {
    return formatResponse(
      this.logger,
      this.standardsService.listImplementations(),
      res,
      "Standard implementations fetched successfully",
    );
  }

  @Post("implementations")
  @ApiOperation({ summary: "Start implementing a standard." })
  @ApiBody({ type: CreateImplementationDto })
  @ApiOkResponse({ type: ImplementationResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: standardsPermission.subject,
    actions: [PermissionEnum.CREATE],
  })
  async createImplementation(
    @Res() res: Response,
    @Body() dto: CreateImplementationDto,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.standardsService.createImplementation(dto, req.user),
      res,
      "Standard implementation created successfully",
    );
  }

  @Get("implementations/:id")
  @ApiOperation({ summary: "Get one implementation and its document tracking." })
  @ApiOkResponse({ type: ImplementationResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: standardsPermission.subject,
    actions: [PermissionEnum.READ],
  })
  async getImplementation(
    @Param() params: ImplementationIdParamDto,
    @Res() res: Response,
  ) {
    return formatResponse(
      this.logger,
      this.standardsService.getImplementation(params.id),
      res,
      "Standard implementation fetched successfully",
    );
  }

  @Post("implementations/:id/documents")
  @ApiOperation({
    summary: "Track an extra clause or control on this implementation.",
  })
  @ApiBody({ type: CreateImplementationDocumentDto })
  @ApiOkResponse({ type: ImplementationResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: standardsPermission.subject,
    actions: [PermissionEnum.UPDATE],
  })
  async createImplementationDocument(
    @Param() params: ImplementationIdParamDto,
    @Body() dto: CreateImplementationDocumentDto,
    @Res() res: Response,
  ) {
    return formatResponse(
      this.logger,
      this.standardsService.createImplementationDocument(params.id, dto),
      res,
      "Clause or control added successfully",
    );
  }

  @Patch("implementations/:id/documents/:documentId")
  @ApiOperation({
    summary: "Update tracking for a required implementation document.",
  })
  @ApiBody({ type: UpdateImplementationDocumentDto })
  @ApiOkResponse({ type: ImplementationResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: standardsPermission.subject,
    actions: [PermissionEnum.UPDATE],
  })
  async updateImplementationDocument(
    @Param() params: ImplementationDocumentParamDto,
    @Body() dto: UpdateImplementationDocumentDto,
    @Res() res: Response,
  ) {
    return formatResponse(
      this.logger,
      this.standardsService.updateImplementationDocument(
        params.id,
        params.documentId,
        dto,
      ),
      res,
      "Implementation document updated successfully",
    );
  }

  @Delete("implementations/:id/documents/:documentId")
  @ApiOperation({
    summary: "Remove a clause or control that was added to this implementation.",
  })
  @ApiOkResponse({ type: ImplementationResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: standardsPermission.subject,
    actions: [PermissionEnum.UPDATE],
  })
  async deleteImplementationDocument(
    @Param() params: ImplementationDocumentParamDto,
    @Res() res: Response,
  ) {
    return formatResponse(
      this.logger,
      this.standardsService.deleteImplementationDocument(
        params.id,
        params.documentId,
      ),
      res,
      "Clause or control removed successfully",
    );
  }

  @Delete("implementations/:id")
  @ApiOperation({ summary: "Delete a standard implementation." })
  @ApiOkResponse({
    description: "Standard implementation deleted. Response body is empty.",
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: standardsPermission.subject,
    actions: [PermissionEnum.DELETE],
  })
  async deleteImplementation(
    @Param() params: ImplementationIdParamDto,
    @Res() res: Response,
  ) {
    return formatResponse(
      this.logger,
      this.standardsService.deleteImplementation(params.id),
      res,
      "Standard implementation deleted successfully",
    );
  }
}
