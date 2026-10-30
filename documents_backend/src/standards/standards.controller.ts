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
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { hasPermission } from "../authentication/permission.decorator";
import { PermissionEnum, standardsPermission } from "../permissions/permissions";
import { formatResponse } from "../util/helper-util";
import { CreateImplementationDto, UpdateImplementationDocumentDto } from "./dtos";
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
  @hasPermission({
    subject: standardsPermission.subject,
    actions: [PermissionEnum.READ],
  })
  async listStandards(@Res() res) {
    return formatResponse(
      this.logger,
      this.standardsService.listStandardsWithImplementations(),
      res,
      "Standards fetched successfully",
    );
  }

  @Get("implementations")
  @ApiOperation({ summary: "List standard implementations and document tracking." })
  @hasPermission({
    subject: standardsPermission.subject,
    actions: [PermissionEnum.READ],
  })
  async listImplementations(@Res() res) {
    return formatResponse(
      this.logger,
      this.standardsService.listImplementations(),
      res,
      "Standard implementations fetched successfully",
    );
  }

  @Post("implementations")
  @ApiOperation({ summary: "Start implementing a standard." })
  @hasPermission({
    subject: standardsPermission.subject,
    actions: [PermissionEnum.CREATE],
  })
  async createImplementation(
    @Res() res,
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
  @hasPermission({
    subject: standardsPermission.subject,
    actions: [PermissionEnum.READ],
  })
  async getImplementation(@Param("id") id: string, @Res() res) {
    return formatResponse(
      this.logger,
      this.standardsService.getImplementation(Number(id)),
      res,
      "Standard implementation fetched successfully",
    );
  }

  @Patch("implementations/:id/documents/:documentId")
  @ApiOperation({
    summary: "Update tracking for a required implementation document.",
  })
  @hasPermission({
    subject: standardsPermission.subject,
    actions: [PermissionEnum.UPDATE],
  })
  async updateImplementationDocument(
    @Param("id") id: string,
    @Param("documentId") documentId: string,
    @Body() dto: UpdateImplementationDocumentDto,
    @Res() res,
  ) {
    return formatResponse(
      this.logger,
      this.standardsService.updateImplementationDocument(
        Number(id),
        Number(documentId),
        dto,
      ),
      res,
      "Implementation document updated successfully",
    );
  }

  @Delete("implementations/:id")
  @ApiOperation({ summary: "Delete a standard implementation." })
  @hasPermission({
    subject: standardsPermission.subject,
    actions: [PermissionEnum.DELETE],
  })
  async deleteImplementation(@Param("id") id: string, @Res() res) {
    return formatResponse(
      this.logger,
      this.standardsService.deleteImplementation(Number(id)),
      res,
      "Standard implementation deleted successfully",
    );
  }
}
