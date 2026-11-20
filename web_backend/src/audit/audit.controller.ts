import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Req,
  Res,
  Logger,
  Query,
  Put,
  UploadedFiles,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuditService } from './audit.service';
import {
  CreateAuditRoleDto,
  UpdateAuditRoleDto,
  AddAuditActivityTypeDto,
  UpdateAuditActivityTypeDto,
  CreateAuditDocumentTypeDto,
  UpdateAuditDocumentTypeDto,
  AuditPersonnelDto,
  CreateAuditProgramDto,
  CreateAuditProgramScheduleEntryDto,
  UpdateAuditProgramDto,
  CreateChecklistDefinitionDto,
  UpdateChecklistDefinitionDto,
  CreateAuditInstanceDto,
  UpdateAuditInstanceDto,
  CreateAuditFindingDto,
  UpdateAuditFindingDto,
  BulkCreateUpdateAuditChecklistResponseDto,
  CreateAuditReportDto,
  UpdateAuditReportDto,
  ChangeAuditInstanceStatusDto,
  AuditRoleResponseDto,
  AuditActivityTypeDto,
  StandardDto,
  AuditDocumentTypeResponseDto,
  AuditProgramDto,
  ChecklistDefinitionResponseDto,
  AllAuditInstanceResponseDto,
  AuditInstanceResponseDto,
  AuditFindingResponseDTO,
  AuditFindingDetailResponseDTO,
  AuditReportResponseDto,
  AuditInstanceAttachmentResponseDto,
} from './dtos';
import {
  AuditFindingQueryDto,
  AuditIdResponseDto,
  AuditInstanceQueryDto,
  AuditPersonnelQueryDto,
  AuditPersonnelRecordResponseDto,
  AuditProgramQueryDto,
  AuditSearchQueryDto,
  BulkChecklistResponseBodyDto,
  BulkChecklistResultResponseDto,
  ChecklistDefinitionQueryDto,
  ChecklistDefinitionSavedResponseDto,
  ChecklistDefinitionVersionQueryDto,
  CreateAuditFindingBodyDto,
  CreateAuditReportBodyDto,
  CreateAuditInstanceAttachmentBodyDto,
  GroupedAuditChecklistResponseDto,
  PaginatedAuditPersonnelResponseDto,
  UpdateAuditFindingBodyDto,
} from './audit.responses';
import { hasPermission } from '../authentication/permission.decorator';
import { formatResponse } from '../util/helper-util';
import type { Response } from 'express';
import {
  auditRolePermission,
  auditPersonnelPermission,
  auditDocumentTypePermission,
  auditActivityTypePermission,
  auditProgramPermission,
  auditInstancePermission,
  auditChecklistResponsePermission,
  auditFindingPermission,
  auditChecklistDefinitionPermission,
} from '../permissions/permissions';
import type { PaginationParams } from '../common/pagination';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  CatalogErrorResponseDto,
  UnauthorizedResponseDto,
} from '../authentication/auth.dto';

@ApiTags('Audits')
@ApiBearerAuth()
@Controller('audits')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}
  private logger = new Logger(AuditController.name);

  @Post('roles')
  @ApiOperation({ summary: 'Create an audit role.' })
  @ApiBody({ type: CreateAuditRoleDto })
  @ApiOkResponse({ type: AuditRoleResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditRolePermission.subject,
    actions: ['create'],
  })
  async createAuditRole(
    @Body() createAuditRoleDto: CreateAuditRoleDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.create(createAuditRoleDto, req.user),
      res,
      'Audit role created successfully',
    );
  }

  @Get('roles')
  @ApiOperation({ summary: 'List audit roles.' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Matches the role name.',
  })
  @ApiOkResponse({ type: AuditRoleResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditRolePermission.subject,
    actions: ['read'],
  })
  async findAllAuditRoles(
    @Res() res: Response,
    @Req() req,
    @Query() query: AuditSearchQueryDto,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.findAll(req.user, query as { [key: string]: string }),
      res,
      'Audit roles fetched successfully',
    );
  }

  @Get('roles/:id')
  @ApiOperation({ summary: 'Get one audit role.' })
  @ApiOkResponse({ type: AuditRoleResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditRolePermission.subject,
    actions: ['read'],
  })
  async findOneAuditRole(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.findOne(id),
      res,
      'Audit role fetched successfully',
    );
  }

  @Put('roles/:id')
  @ApiOperation({ summary: 'Update an audit role.' })
  @ApiBody({ type: UpdateAuditRoleDto })
  @ApiOkResponse({ type: AuditRoleResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditRolePermission.subject,
    actions: ['update'],
  })
  async updateAuditRole(
    @Param('id') id: string,
    @Body() updateAuditRoleDto: UpdateAuditRoleDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.update(id, updateAuditRoleDto, req.user),
      res,
      'Audit role updated successfully',
    );
  }

  @Delete('roles/:id')
  @ApiOperation({ summary: 'Delete an audit role.' })
  @ApiOkResponse({ description: 'Audit role deleted. Response body is empty.' })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditRolePermission.subject,
    actions: ['delete'],
  })
  async removeAuditRole(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.remove(id),
      res,
      'Audit role deleted successfully',
    );
  }

  @Get('standards')
  @ApiOperation({ summary: 'List standards available to audit programs.' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Matches the standard name.',
  })
  @ApiOkResponse({ type: StandardDto, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditProgramPermission.subject,
    actions: ['read'],
  })
  async getStandards(
    @Res() res: Response,
    @Req() req,
    @Query() query: AuditSearchQueryDto,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.getStandards(
        req.user,
        query as { [key: string]: string },
      ),
      res,
      'Standards fetched successfully',
    );
  }

  @Get('activity-types')
  @ApiOperation({ summary: 'List audit activity types.' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Matches the activity type name.',
  })
  @ApiOkResponse({ type: AuditActivityTypeDto, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditActivityTypePermission.subject,
    actions: ['read'],
  })
  async getActivityTypes(
    @Res() res: Response,
    @Req() req,
    @Query() query: AuditSearchQueryDto,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.getActivityTypes(
        req.user,
        query as { [key: string]: string },
      ),
      res,
      'Activity types fetched successfully',
    );
  }

  @Get('activity-types/:id')
  @ApiOperation({ summary: 'Get one audit activity type.' })
  @ApiOkResponse({ type: AuditActivityTypeDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditActivityTypePermission.subject,
    actions: ['read'],
  })
  async getActivityTypeById(@Res() res: Response, @Req() req) {
    return formatResponse(
      this.logger,
      this.auditService.getActivityTypeById(req.user, req.params.id),
      res,
      'Activity type fetched successfully',
    );
  }

  @Post('activity-types')
  @ApiOperation({ summary: 'Create an audit activity type.' })
  @ApiBody({ type: AddAuditActivityTypeDto })
  @ApiOkResponse({ type: AuditActivityTypeDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditActivityTypePermission.subject,
    actions: ['create'],
  })
  async addActivityType(
    @Res() res: Response,
    @Req() req,
    @Body() addAuditActivityTypeDto: AddAuditActivityTypeDto,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.addActivityType(req.user, addAuditActivityTypeDto),
      res,
      'Activity type added successfully',
    );
  }

  @Put('activity-types/:id')
  @ApiOperation({ summary: 'Update an audit activity type.' })
  @ApiBody({ type: UpdateAuditActivityTypeDto })
  @ApiOkResponse({ type: AuditActivityTypeDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditActivityTypePermission.subject,
    actions: ['update'],
  })
  async updateActivityType(
    @Res() res: Response,
    @Req() req,
    @Body() updateAuditActivityTypeDto: UpdateAuditActivityTypeDto,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.updateActivityType(
        req.user,
        req.params.id,
        updateAuditActivityTypeDto,
      ),
      res,
      'Activity type updated successfully',
    );
  }

  @Delete('activity-types/:id')
  @ApiOperation({ summary: 'Delete an audit activity type.' })
  @ApiOkResponse({
    schema: {
      type: 'string',
      example: 'Audit activity type deleted successfully',
    },
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditActivityTypePermission.subject,
    actions: ['delete'],
  })
  async deleteActivityType(@Res() res: Response, @Req() req) {
    return formatResponse(
      this.logger,
      this.auditService.deleteActivityType(req.user, req.params.id),
      res,
      'Activity type deleted successfully',
    );
  }

  @Get('personnels')
  @ApiOperation({ summary: 'List audit personnel.' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Matches the person name or email.',
  })
  @ApiQuery({
    name: 'isExternal',
    required: false,
    type: String,
    description:
      'Internal returns people linked to a user. Any other value returns external people.',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: String,
    description:
      'Active returns active people. Any other value returns inactive people.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number, starting at 1.',
  })
  @ApiQuery({
    name: 'perPage',
    required: false,
    type: Number,
    description: 'Number of people per page.',
  })
  @ApiOkResponse({ type: PaginatedAuditPersonnelResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditPersonnelPermission.subject,
    actions: ['read'],
  })
  async findAllAuditPersonnel(
    @Res() res,
    @Req() req,
    @Query() query: AuditPersonnelQueryDto,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.findAllAuditPersonnel(
        req.user,
        query,
      ),
      res,
      'Audit personnel fetched successfully',
    );
  }

  @Get('personnels/:id')
  @ApiOperation({ summary: 'Get one audit personnel record.' })
  @ApiOkResponse({ type: AuditPersonnelRecordResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditPersonnelPermission.subject,
    actions: ['read'],
  })
  async findOneAuditPersonnel(@Res() res, @Req() req, @Param('id') id: string) {
    return formatResponse(
      this.logger,
      this.auditService.findOneAuditPersonnel(id),
      res,
      'Audit personnel fetched successfully',
    );
  }

  @Post('personnels')
  @ApiOperation({ summary: 'Create audit personnel.' })
  @ApiBody({ type: AuditPersonnelDto })
  @ApiOkResponse({ type: AuditIdResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditPersonnelPermission.subject,
    actions: ['create'],
  })
  async createAuditPersonnel(
    @Res() res,
    @Req() req,
    @Body() auditPersonnelDto: AuditPersonnelDto,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.createAuditPersonnel(auditPersonnelDto, req.user),
      res,
      'Audit personnel created successfully',
    );
  }

  @Put('personnels/:id')
  @ApiOperation({ summary: 'Update audit personnel.' })
  @ApiBody({ type: AuditPersonnelDto })
  @ApiOkResponse({ type: AuditIdResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditPersonnelPermission.subject,
    actions: ['update'],
  })
  async updateAuditPersonnel(
    @Res() res,
    @Req() req,
    @Param('id') id: string,
    @Body() auditPersonnelDto: AuditPersonnelDto,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.updateAuditPersonnel(id, auditPersonnelDto, req.user),
      res,
      'Audit personnel updated successfully',
    );
  }

  @Delete('personnels/:id')
  @ApiOperation({ summary: 'Delete audit personnel.' })
  @ApiOkResponse({ type: AuditIdResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditPersonnelPermission.subject,
    actions: ['delete'],
  })
  async deleteAuditPersonnel(@Res() res, @Req() req, @Param('id') id: string) {
    return formatResponse(
      this.logger,
      this.auditService.deleteAuditPersonnel(id),
      res,
      'Audit personnel deleted successfully',
    );
  }

  @Post('document-types')
  @ApiOperation({ summary: 'Create an audit document type.' })
  @ApiBody({ type: CreateAuditDocumentTypeDto })
  @ApiOkResponse({ type: AuditDocumentTypeResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditDocumentTypePermission.subject,
    actions: ['create'],
  })
  async createAuditDocumentType(
    @Body() createAuditDocumentTypeDto: CreateAuditDocumentTypeDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.createAuditDocumentType(
        createAuditDocumentTypeDto,
        req.user,
      ),
      res,
      'Audit document type created successfully',
    );
  }

  @Get('document-types')
  @ApiOperation({ summary: 'List audit document types.' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Matches the document type name.',
  })
  @ApiOkResponse({ type: AuditDocumentTypeResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditDocumentTypePermission.subject,
    actions: ['read'],
  })
  async findAllAuditDocumentTypes(
    @Res() res: Response,
    @Req() req,
    @Query() query: AuditSearchQueryDto,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.findAllAuditDocumentTypes(
        query as { [key: string]: string },
      ),
      res,
      'Audit document types fetched successfully',
    );
  }

  @Get('document-types/:id')
  @ApiOperation({ summary: 'Get one audit document type.' })
  @ApiOkResponse({ type: AuditDocumentTypeResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditDocumentTypePermission.subject,
    actions: ['read'],
  })
  async findOneAuditDocumentType(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.findOneAuditDocumentType(id),
      res,
      'Audit document type fetched successfully',
    );
  }

  @Put('document-types/:id')
  @ApiOperation({ summary: 'Update an audit document type.' })
  @ApiBody({ type: UpdateAuditDocumentTypeDto })
  @ApiOkResponse({ type: AuditDocumentTypeResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditDocumentTypePermission.subject,
    actions: ['update'],
  })
  async updateAuditDocumentType(
    @Param('id') id: string,
    @Body() updateAuditDocumentTypeDto: UpdateAuditDocumentTypeDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.updateAuditDocumentType(id, updateAuditDocumentTypeDto),
      res,
      'Audit document type updated successfully',
    );
  }

  @Delete('document-types/:id')
  @ApiOperation({ summary: 'Delete an audit document type.' })
  @ApiOkResponse({
    description: 'Audit document type deleted. Response body is empty.',
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditDocumentTypePermission.subject,
    actions: ['delete'],
  })
  async removeAuditDocumentType(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.removeAuditDocumentType(id),
      res,
      'Audit document type deleted successfully',
    );
  }

  @Post('programs')
  @ApiOperation({ summary: 'Create an audit program.' })
  @ApiBody({ type: CreateAuditProgramDto })
  @ApiOkResponse({ type: AuditIdResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditProgramPermission.subject,
    actions: ['create'],
  })
  async createAuditProgram(
    @Body() createAuditProgramDto: CreateAuditProgramDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.createAuditProgram(createAuditProgramDto, req.user),
      res,
      'Audit program created successfully',
    );
  }

  @Get('programs')
  @ApiOperation({ summary: 'List audit programs.' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['DRAFT', 'PLANNED', 'SCHEDULED', 'CANCELLED_PLAN'],
    description: 'Limits the list to one program status.',
  })
  @ApiQuery({
    name: 'excludeDraft',
    required: false,
    type: String,
    description: 'When true, programs in DRAFT are omitted.',
  })
  @ApiQuery({
    name: 'auditActivityTypeId',
    required: false,
    type: String,
    description: 'Limits the list to one activity type.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Matches the program title.',
  })
  @ApiOkResponse({ type: AuditProgramDto, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditProgramPermission.subject,
    actions: ['read'],
  })
  async findAllAuditPrograms(
    @Res() res: Response,
    @Req() req,
    @Query() query: AuditProgramQueryDto,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.findAllAuditPrograms(query, req.user),
      res,
      'Audit programs fetched successfully',
    );
  }

  @Post('programs/:id/schedule-entries')
  @ApiOperation({
    summary: 'Add an unplanned schedule entry to an audit program.',
  })
  @ApiBody({ type: CreateAuditProgramScheduleEntryDto })
  @ApiOkResponse({ type: AuditProgramDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditProgramPermission.subject,
    actions: ['update'],
  })
  async createAuditProgramScheduleEntry(
    @Param('id') id: string,
    @Body() createScheduleEntryDto: CreateAuditProgramScheduleEntryDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.createAuditProgramScheduleEntry(
        id,
        createScheduleEntryDto,
        req.user,
      ),
      res,
      'Audit program schedule entry created successfully',
    );
  }

  @Put('programs/:id/schedule-entries/:entryId')
  @ApiOperation({ summary: 'Update an audit program schedule entry.' })
  @ApiBody({ type: CreateAuditProgramScheduleEntryDto })
  @ApiOkResponse({ type: AuditProgramDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditProgramPermission.subject,
    actions: ['update'],
  })
  async updateAuditProgramScheduleEntry(
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @Body() updateScheduleEntryDto: CreateAuditProgramScheduleEntryDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.updateAuditProgramScheduleEntry(
        id,
        entryId,
        updateScheduleEntryDto,
        req.user,
      ),
      res,
      'Audit program schedule entry updated successfully',
    );
  }

  @Delete('programs/:id/schedule-entries/:entryId')
  @ApiOperation({ summary: 'Delete an audit program schedule entry.' })
  @ApiOkResponse({ type: AuditProgramDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditProgramPermission.subject,
    actions: ['update'],
  })
  async deleteAuditProgramScheduleEntry(
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.deleteAuditProgramScheduleEntry(id, entryId, req.user),
      res,
      'Audit program schedule entry deleted successfully',
    );
  }

  @Get('programs/:id')
  @ApiOperation({ summary: 'Get one audit program.' })
  @ApiOkResponse({ type: AuditProgramDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditProgramPermission.subject,
    actions: ['read'],
  })
  async findOneAuditProgram(
    @Res() res: Response,
    @Req() req,
    @Param('id') id: string,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.findOneAuditProgram(id, req.user),
      res,
      'Audit program fetched successfully',
    );
  }

  @Put('programs/:id')
  @ApiOperation({ summary: 'Update an audit program.' })
  @ApiBody({ type: UpdateAuditProgramDto })
  @ApiOkResponse({ type: AuditIdResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditProgramPermission.subject,
    actions: ['update'],
  })
  async updateAuditProgram(
    @Param('id') id: string,
    @Body() updateAuditProgramDto: UpdateAuditProgramDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.updateAuditProgram(id, updateAuditProgramDto, req.user),
      res,
      'Audit program updated successfully',
    );
  }

  @Delete('programs/:id')
  @ApiOperation({ summary: 'Delete an audit program.' })
  @ApiOkResponse({ type: AuditIdResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditProgramPermission.subject,
    actions: ['delete'],
  })
  async deleteAuditProgram(
    @Res() res: Response,
    @Req() req,
    @Param('id') id: string,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.deleteAuditProgram(id, req.user),
      res,
      'Audit program deleted successfully',
    );
  }

  @Post('checklist-definitions')
  @ApiOperation({ summary: 'Create a checklist definition.' })
  @ApiBody({ type: CreateChecklistDefinitionDto })
  @ApiOkResponse({ type: AuditIdResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditChecklistDefinitionPermission.subject, // TODO: Create specific permission for checklist definitions
    actions: ['create'],
  })
  async createChecklistDefinition(
    @Body() createChecklistDefinitionDto: CreateChecklistDefinitionDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.createChecklistDefinition(
        createChecklistDefinitionDto,
        req.user,
      ),
      res,
      'Checklist definition created successfully',
    );
  }

  @Get('checklist-definitions')
  @ApiOperation({ summary: 'List checklist definitions.' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Matches the checklist title.',
  })
  @ApiQuery({
    name: 'auditProgramId',
    required: false,
    type: String,
    description:
      'Limits the list to published checklists for this program activity type.',
  })
  @ApiOkResponse({ type: ChecklistDefinitionResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditChecklistDefinitionPermission.subject, // TODO: Create specific permission for checklist definitions
    actions: ['read'],
  })
  async findAllChecklistDefinitions(
    @Res() res: Response,
    @Req() req,
    @Query() query: ChecklistDefinitionQueryDto,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.findAllChecklistDefinitions(
        req.user,
        query as { [key: string]: string },
      ),
      res,
      'Checklist definitions fetched successfully',
    );
  }

  @Get('checklist-definitions/:id')
  @ApiOperation({ summary: 'Get one checklist definition.' })
  @ApiQuery({
    name: 'version',
    required: false,
    type: String,
    description: 'Checklist version to load. Omit to load the latest version.',
  })
  @ApiOkResponse({ type: ChecklistDefinitionResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditChecklistDefinitionPermission.subject, // TODO: Create specific permission for checklist definitions
    actions: ['read'],
  })
  async findOneChecklistDefinition(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
    @Query() query: ChecklistDefinitionVersionQueryDto,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.findOneChecklistDefinition(id, query.version),
      res,
      'Checklist definition fetched successfully',
    );
  }

  @Put('checklist-definitions/:id')
  @ApiOperation({ summary: 'Update a checklist definition.' })
  @ApiBody({ type: UpdateChecklistDefinitionDto })
  @ApiOkResponse({ type: ChecklistDefinitionSavedResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditChecklistDefinitionPermission.subject, // TODO: Create specific permission for checklist definitions
    actions: ['update'],
  })
  async updateChecklistDefinition(
    @Param('id') id: string,
    @Body() updateChecklistDefinitionDto: UpdateChecklistDefinitionDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.updateChecklistDefinition(
        id,
        updateChecklistDefinitionDto,
        req.user,
      ),
      res,
      'Checklist definition updated successfully',
    );
  }

  @Put('checklist-definitions/:id/publish')
  @ApiOperation({ summary: 'Publish a checklist definition.' })
  @ApiOkResponse({ type: ChecklistDefinitionSavedResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditChecklistDefinitionPermission.subject,
    actions: ['update'],
  })
  async publishChecklistDefinition(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.publishChecklistDefinition(id, req.user),
      res,
      'Checklist definition published successfully',
    );
  }

  @Delete('checklist-definitions/:id')
  @ApiOperation({ summary: 'Delete a checklist definition.' })
  @ApiOkResponse({
    description: 'Checklist definition deleted. Response body is empty.',
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditChecklistDefinitionPermission.subject, // TODO: Create specific permission for checklist definitions
    actions: ['delete'],
  })
  async removeChecklistDefinition(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.removeChecklistDefinition(id),
      res,
      'Checklist definition deleted successfully',
    );
  }

  @Post('instances')
  @ApiOperation({ summary: 'Create an audit instance.' })
  @ApiBody({ type: CreateAuditInstanceDto })
  @ApiOkResponse({ type: AuditIdResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditInstancePermission.subject,
    actions: ['create'],
  })
  async createAuditInstance(
    @Body() createAuditInstanceDto: CreateAuditInstanceDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.createAuditInstance(createAuditInstanceDto, req.user),
      res,
      'Audit instance created successfully',
    );
  }

  @Get('instances')
  @ApiOperation({ summary: 'List audit instances.' })
  @ApiQuery({
    name: 'excludeDraft',
    required: false,
    type: String,
    description: 'When set, draft instances and draft programs are omitted.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [
      'DRAFT',
      'SCHEDULED',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
      'ON_HOLD',
    ],
    description: 'Limits the list to one instance status.',
  })
  @ApiQuery({
    name: 'auditProgramId',
    required: false,
    type: String,
    description: 'Limits the list to one audit program.',
  })
  @ApiQuery({
    name: 'criteria',
    required: false,
    type: String,
    description: 'Matches the instance criteria.',
  })
  @ApiQuery({
    name: 'location',
    required: false,
    type: String,
    description: 'Matches the instance location.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Matches the audit id.',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['startDate'],
    description: 'Sorts the list by start date.',
  })
  @ApiQuery({
    name: 'sortDir',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort direction. Used with sortBy.',
  })
  @ApiOkResponse({ type: AllAuditInstanceResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditInstancePermission.subject,
    actions: ['read'],
  })
  async findAllAuditInstances(
    @Res() res: Response,
    @Req() req,
    @Query() query: AuditInstanceQueryDto,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.findAllAuditInstances(req.user, query),
      res,
      'Audit instances fetched successfully',
    );
  }

  @Get('instances/:id')
  @ApiOperation({ summary: 'Get one audit instance.' })
  @ApiOkResponse({ type: AuditInstanceResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditInstancePermission.subject,
    actions: ['read'],
  })
  async findOneAuditInstance(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.findOneAuditInstance(id, req.user),
      res,
      'Audit instance fetched successfully',
    );
  }

  @Put('instances/:id')
  @ApiOperation({ summary: 'Update an audit instance.' })
  @ApiBody({ type: UpdateAuditInstanceDto })
  @ApiOkResponse({ type: AuditIdResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditInstancePermission.subject,
    actions: ['update'],
  })
  async updateAuditInstance(
    @Param('id') id: string,
    @Body() updateAuditInstanceDto: UpdateAuditInstanceDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.updateAuditInstance(
        id,
        updateAuditInstanceDto,
        req.user,
      ),
      res,
      'Audit instance updated successfully',
    );
  }

  @Delete('instances/:id')
  @ApiOperation({ summary: 'Delete an audit instance.' })
  @ApiOkResponse({ type: AuditIdResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditInstancePermission.subject,
    actions: ['delete'],
  })
  async deleteAuditInstance(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.deleteAuditInstance(id, req.user),
      res,
      'Audit instance deleted successfully',
    );
  }

  @Put('instances/:id/status')
  @ApiOperation({ summary: 'Change an audit instance status.' })
  @ApiBody({ type: ChangeAuditInstanceStatusDto })
  @ApiOkResponse({ type: AuditInstanceResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditInstancePermission.subject,
    actions: ['update'],
  })
  async changeAuditInstanceStatus(
    @Param('id') id: string,
    @Body() changeStatusDto: ChangeAuditInstanceStatusDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.changeAuditInstanceStatus(
        id,
        changeStatusDto.status,
        req.user,
      ),
      res,
      'Audit instance status updated successfully',
    );
  }

  @Post('findings')
  @ApiOperation({
    summary: 'Create an audit finding.',
    description: 'For a file already stored by a connection, send JSON and set evidences[].fileId. A new file can still be uploaded as multipart.',
  })
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiBody({ type: CreateAuditFindingBodyDto })
  @ApiOkResponse({ type: AuditIdResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditFindingPermission.subject,
    actions: ['create'],
  })
  @UseInterceptors(FilesInterceptor('files'))
  async createAuditFinding(
    @Body() createAuditFindingDto: CreateAuditFindingDto,
    @Res() res,
    @Req() req,
    @UploadedFiles() files?: any[],
  ) {
    return formatResponse(
      this.logger,
      this.auditService.createAuditFinding(
        createAuditFindingDto,
        req.user,
        files,
      ),
      res,
      'Audit finding created successfully',
    );
  }

  @Get('findings')
  @ApiOperation({ summary: 'List audit findings for an instance.' })
  @ApiQuery({
    name: 'auditInstanceId',
    required: true,
    type: String,
    description: 'Audit instance whose findings are listed.',
  })
  @ApiQuery({
    name: 'classification',
    required: false,
    enum: ['NON_CONFORMITY', 'OBSERVATION', 'OPPORTUNITY_FOR_IMPROVEMENT'],
    description: 'Limits the list to one finding classification.',
  })
  @ApiQuery({
    name: 'teamMemberId',
    required: false,
    type: String,
    description: 'Limits the list to one audit team member.',
  })
  @ApiQuery({
    name: 'raisedNc',
    required: false,
    type: String,
    description:
      'When true, only findings that raised a nonconformity are returned.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Matches the finding title.',
  })
  @ApiOkResponse({ type: AuditFindingResponseDTO, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditFindingPermission.subject,
    actions: ['read'],
  })
  async findAllAuditFindings(
    @Res() res: Response,
    @Req() req,
    @Query() query: AuditFindingQueryDto,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.findAllAuditFindings(req.user, query),
      res,
      'Audit finding created successfully',
    );
  }

  @Get('findings/:id')
  @ApiOperation({ summary: 'Get one audit finding.' })
  @ApiQuery({
    name: 'instanceId',
    required: true,
    type: String,
    description: 'Audit instance that owns the finding.',
  })
  @ApiOkResponse({ type: AuditFindingDetailResponseDTO })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditFindingPermission.subject,
    actions: ['read'],
  })
  async findOneAuditFinding(
    @Res() res: Response,
    @Req() req,
    @Param('id') id: string,
    @Query('instanceId') instanceId: string,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.findOneAuditFinding(id, req.user, instanceId),
      res,
      'Audit finding fetched successfully',
    );
  }

  @Put('findings/:id')
  @ApiOperation({ summary: 'Update an audit finding.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateAuditFindingBodyDto })
  @ApiOkResponse({ type: AuditIdResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditFindingPermission.subject,
    actions: ['update'],
  })
  @UseInterceptors(FilesInterceptor('files'))
  async updateAuditFinding(
    @Res() res: Response,
    @Req() req,
    @Param('id') id: string,
    @Body() updateAuditFindingDto: UpdateAuditFindingDto,
    @UploadedFiles() files?: any[],
  ) {
    return formatResponse(
      this.logger,
      this.auditService.updateAuditFinding(
        id,
        updateAuditFindingDto,
        req.user,
        files,
      ),
      res,
      'Audit finding updated successfully',
    );
  }

  @Delete('findings/:id')
  @ApiOperation({ summary: 'Delete an audit finding.' })
  @ApiOkResponse({ type: AuditIdResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditFindingPermission.subject,
    actions: ['delete'],
  })
  async deleteAuditFinding(
    @Res() res: Response,
    @Req() req,
    @Param('id') id: string,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.deleteAuditFinding(id, req.user),
      res,
      'Audit finding deleted successfully',
    );
  }

  @Post('instances/:instanceId/reports')
  @ApiOperation({ summary: 'Create an audit report for an instance.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateAuditReportBodyDto })
  @ApiOkResponse({ type: AuditIdResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditInstancePermission.subject,
    actions: ['create'],
  })
  @UseInterceptors(FileInterceptor('file'))
  async createAuditReport(
    @Param('instanceId') instanceId: string,
    @Body() createAuditReportDto: CreateAuditReportDto,
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
    @Req() req,
  ) {
    // Set the instanceId from the URL parameter
    createAuditReportDto.auditInstanceId = instanceId;

    return formatResponse(
      this.logger,
      this.auditService.createAuditReport(createAuditReportDto, req.user, file),
      res,
      'Audit report created successfully',
    );
  }

  @Get('instances/:instanceId/reports')
  @ApiOperation({ summary: 'List reports for an audit instance.' })
  @ApiOkResponse({ type: AuditReportResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditInstancePermission.subject,
    actions: ['read'],
  })
  async findAuditReportsByInstance(
    @Param('instanceId') instanceId: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.findAuditReportsByInstance(instanceId, req.user),
      res,
      'Audit reports fetched successfully',
    );
  }

  @Get('reports/:id')
  @ApiOperation({ summary: 'Get one audit report.' })
  @ApiOkResponse({ type: AuditReportResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditInstancePermission.subject,
    actions: ['read'],
  })
  async findOneAuditReport(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.findOneAuditReport(id, req.user),
      res,
      'Audit report fetched successfully',
    );
  }

  @Put('reports/:id')
  @ApiOperation({ summary: 'Update an audit report.' })
  @ApiBody({ type: UpdateAuditReportDto })
  @ApiOkResponse({ type: AuditReportResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditInstancePermission.subject,
    actions: ['update'],
  })
  async updateAuditReport(
    @Param('id') id: string,
    @Body() updateAuditReportDto: UpdateAuditReportDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.updateAuditReport(id, updateAuditReportDto, req.user),
      res,
      'Audit report updated successfully',
    );
  }

  @Delete('reports/:id')
  @ApiOperation({ summary: 'Delete an audit report.' })
  @ApiOkResponse({
    description: 'Audit report deleted. Response body is empty.',
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditInstancePermission.subject,
    actions: ['delete'],
  })
  async deleteAuditReport(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.deleteAuditReport(id, req.user),
      res,
      'Audit report deleted successfully',
    );
  }

  @Delete('checklist-responses/:id')
  @ApiOperation({ summary: 'Delete a checklist response.' })
  @ApiOkResponse({
    description: 'Checklist response deleted. Response body is empty.',
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditChecklistResponsePermission.subject,
    actions: ['delete'],
  })
  async deleteAuditChecklistResponse(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.deleteAuditChecklistResponse(id, req.user),
      res,
      'Audit checklist response deleted successfully',
    );
  }

  @Get('instances/:auditInstanceId/checklist-responses-grouped')
  @ApiOperation({
    summary: 'Get checklist answers for an instance, grouped by section.',
  })
  @ApiOkResponse({ type: GroupedAuditChecklistResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditChecklistResponsePermission.subject,
    actions: ['read'],
  })
  async getAuditChecklistResponsesGrouped(
    @Param('auditInstanceId') auditInstanceId: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.getAuditChecklistResponsesGrouped(
        auditInstanceId,
        req.user,
      ),
      res,
      'Grouped audit checklist responses fetched successfully',
    );
  }

  @Get('instances/:instanceId/attachments')
  @ApiOperation({ summary: 'List checklist attachments for an audit instance.' })
  @ApiOkResponse({ type: AuditInstanceAttachmentResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditChecklistResponsePermission.subject,
    actions: ['read'],
  })
  async findAuditInstanceAttachments(
    @Param('instanceId') instanceId: string,
    @Res() res: Response,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.findAuditInstanceAttachments(instanceId),
      res,
      'Audit instance attachments fetched successfully',
    );
  }

  @Post('instances/:instanceId/attachments')
  @ApiOperation({
    summary: 'Add a checklist attachment to an audit instance.',
    description: 'Send a multipart file, or JSON { fileId } for a file already stored by a connection.',
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({ type: CreateAuditInstanceAttachmentBodyDto })
  @ApiOkResponse({ type: AuditInstanceAttachmentResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditChecklistResponsePermission.subject,
    actions: ['create', 'update'],
  })
  @UseInterceptors(FileInterceptor('file'))
  async createAuditInstanceAttachment(
    @Param('instanceId') instanceId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateAuditInstanceAttachmentBodyDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.createAuditInstanceAttachment(
        instanceId,
        req.user,
        file,
        body?.fileId,
      ),
      res,
      'Audit instance attachment created successfully',
    );
  }

  @Delete('instances/:instanceId/attachments/:attachmentId')
  @ApiOperation({ summary: 'Remove a checklist attachment from an audit instance.' })
  @ApiOkResponse({
    description: 'Attachment deleted. Response body is empty.',
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditChecklistResponsePermission.subject,
    actions: ['delete'],
  })
  async deleteAuditInstanceAttachment(
    @Param('instanceId') instanceId: string,
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
  ) {
    return formatResponse(
      this.logger,
      this.auditService.deleteAuditInstanceAttachment(instanceId, attachmentId),
      res,
      'Audit instance attachment deleted successfully',
    );
  }

  @Post('checklist-responses/bulk')
  @ApiOperation({ summary: 'Create or update checklist answers in bulk.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: BulkChecklistResponseBodyDto })
  @ApiOkResponse({ type: BulkChecklistResultResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: auditChecklistResponsePermission.subject,
    actions: ['create', 'update'],
  })
  @UseInterceptors(FilesInterceptor('files'))
  async bulkCreateUpdateAuditChecklistResponses(
    @Body() bulkDto: BulkCreateUpdateAuditChecklistResponseDto,
    @Res() res: Response,
    @Req() req,
    @UploadedFiles() files?: any[],
  ) {
    return formatResponse(
      this.logger,
      this.auditService.bulkCreateUpdateAuditChecklistResponses(
        bulkDto,
        req.user,
        files,
      ),
      res,
      'Audit checklist responses processed successfully',
    );
  }
}
