import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Res,
  Logger,
  Query,
  Put,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
} from '@nestjs/common';
import type { Response } from 'express';
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
import { NonConformityService } from './non-conformity.service';
import { ImmediateActionStatus } from '../common/immediate-action.entity';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateCategoryCustomFieldDto,
  UpdateCategoryCustomFieldDto,
  CreateNCCustomFieldValueDto,
  UpdateNCCustomFieldValueDto,
  CreateCategoryWithCustomFieldsDto,
  UpdateCategoryWithCustomFieldsDto,
  CreateNonConformityTypeDto,
  UpdateNonConformityTypeDto,
  BulkCreateNonConformityRiskLevelDto,
  CreateNonConformityDto,
  UpdateNonConformityDto,
  CloseNonConformityDto,
  AmendNonConformityDueDateDto,
  CreateNonConformityRepresentativeDto,
  UpdateNonConformityRepresentativeDto,
  CreateNCCorrectiveActionDto,
  UpdateNCCorrectiveActionDto,
  CreateCaChangeRequestDto,
  CreateImmediateActionDto,
  UpdateImmediateActionDto,
  CreateRootCauseAnalysisDto,
  UpdateRootCauseAnalysisDto,
  CreateInvestigationDto,
  UpdateInvestigationDto,
  CreateInvestigationEvidenceDto,
  UpdateInvestigationEvidenceDto,
  UpdateCaChangeRequestDto,
  BulkCreateRCAFiveWhyStepDto,
  BulkCreateRCACeCategoryDto,
  CreateFishboneDto,
  UpdateFishboneDto,
  CategoryResponseDto,
  CategoryCustomFieldResponseDto,
  NCCustomFieldValueResponseDto,
  NonConformityTypeResponseDTO,
  NonConformityRiskLevelResponseDTO,
  NonConformityRepresentativeResponseDTO,
  NonConformityResponseDTO,
  RootCauseAnalysisResponseDTO,
  InvestigationResponseDTO,
  InvestigationEvidenceResponseDTO,
  RCAResponseDTO,
  RCACeCategoryResponseDTO,
} from './dtos';
import {
  BulkRCAFiveWhyResultResponseDto,
  CaChangeRequestResponseDto,
  CategoryQueryDto,
  ChangeRequestQueryDto,
  CloseNonConformityBodyDto,
  CorrectiveActionQueryDto,
  CreateInvestigationEvidenceBodyDto,
  CreateNonConformityBodyDto,
  CustomFieldQueryDto,
  ImmediateActionQueryDto,
  ImmediateActionRecordResponseDto,
  NCCorrectiveActionResponseDto,
  NCCustomFieldValueQueryDto,
  NameSearchQueryDto,
  NonConformityIdResponseDto,
  NonConformityListItemResponseDto,
  NonConformityQueryDto,
  NonConformitySuccessResponseDto,
  RCAFishboneRecordResponseDto,
  RepresentativeQueryDto,
  UpdateInvestigationEvidenceBodyDto,
  UpdateNonConformityBodyDto,
  UploadFileBodyDto,
} from './non-conformity.responses';
import { hasPermission } from '../authentication/permission.decorator';
import { formatResponse } from '../util/helper-util';
import {
  nonConformityRiskLevelPermission,
  nonConformityTypePermission,
  nonConformityPermission,
  nonConformityRepresentativePermission,
  nonConformityCorrectiveActionPermission,
  caChangeRequestPermission,
  immediateActionPermission,
  rootCauseAnalysisPermission,
  investigationPermission,
  investigationEvidencePermission,
  immediateActionEvidencePermission,
  caEffectivenessEvidencePermission,
  rcaFiveWhyStepPermission,
} from '../permissions/permissions';

import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import {
  CreateImmediateActionCommentDto,
  UpdateImmediateActionStatusDto,
} from '../common/immediate-action.dto';
import {
  CatalogErrorResponseDto,
  UnauthorizedResponseDto,
} from '../authentication/auth.dto';

@ApiTags('Non-conformities')
@ApiBearerAuth()
@Controller('non-conformities')
export class NonConformityController {
  constructor(private readonly nonConformityService: NonConformityService) {}

  private readonly logger = new Logger(NonConformityController.name);

  // Category Endpoints
  @Post('categories')
  @ApiOperation({ summary: 'Create a nonconformity category.' })
  @ApiBody({ type: CreateCategoryWithCustomFieldsDto })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: 'non_conformity_categories',
    actions: ['create'],
  })
  async createCategory(
    @Body() createCategoryDto: CreateCategoryWithCustomFieldsDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.createCategory(createCategoryDto, req.user),
      res,
      'Category created successfully',
    );
  }

  @Get('categories')
  @ApiOperation({ summary: 'List nonconformity categories.' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Matches the category name.',
  })
  @ApiQuery({
    name: 'parentId',
    required: false,
    type: String,
    description: 'Limits the list to children of this category.',
  })
  @ApiOkResponse({ type: CategoryResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: 'non_conformity_categories',
    actions: ['read'],
  })
  async findAllCategories(
    @Res() res: Response,
    @Req() req,
    @Query() filter: CategoryQueryDto,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.findAllCategories(req.user, filter),
      res,
      'Categories fetched successfully',
    );
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Get one nonconformity category.' })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: 'non_conformity_categories',
    actions: ['read'],
  })
  async findCategoryById(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.findCategoryById(id, req.user),
      res,
      'Category fetched successfully',
    );
  }

  @Put('categories/:id')
  @ApiOperation({ summary: 'Update a nonconformity category.' })
  @ApiBody({ type: UpdateCategoryWithCustomFieldsDto })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: 'non_conformity_categories',
    actions: ['update'],
  })
  async updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryWithCustomFieldsDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.updateCategory(id, updateCategoryDto, req.user),
      res,
      'Category updated successfully',
    );
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete a nonconformity category.' })
  @ApiOkResponse({
    description: 'Category deleted. Response body is empty.',
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: 'non_conformity_categories',
    actions: ['delete'],
  })
  async deleteCategory(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.deleteCategory(id, req.user),
      res,
      'Category deleted successfully',
    );
  }

  // Category Custom Field Endpoints
  @Post('custom-fields')
  @ApiOperation({ summary: 'Create a category custom field.' })
  @ApiBody({ type: CreateCategoryCustomFieldDto })
  @ApiOkResponse({ type: CategoryCustomFieldResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: 'non_conformity_category_custom_fields',
    actions: ['create'],
  })
  async createCategoryCustomField(
    @Body() createDto: CreateCategoryCustomFieldDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.createCategoryCustomField(createDto, req.user),
      res,
      'Custom field created successfully',
    );
  }

  @Get('custom-fields')
  @ApiOperation({ summary: 'List category custom fields.' })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: String,
    description: 'Limits the list to one category.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Matches the field label.',
  })
  @ApiOkResponse({ type: CategoryCustomFieldResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: 'non_conformity_category_custom_fields',
    actions: ['read'],
  })
  async findAllCategoryCustomFields(
    @Res() res: Response,
    @Req() req,
    @Query() filter: CustomFieldQueryDto,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.findAllCategoryCustomFields(req.user, filter),
      res,
      'Custom fields fetched successfully',
    );
  }

  @Get('categories/:categoryId/custom-fields')
  @ApiOperation({ summary: 'List custom fields for one category.' })
  @ApiOkResponse({ type: CategoryCustomFieldResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: 'non_conformity_category_custom_fields',
    actions: ['read'],
  })
  async getCustomFieldsByCategory(
    @Param('categoryId') categoryId: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.getCustomFieldsByCategory(categoryId, req.user),
      res,
      'Custom fields fetched successfully',
    );
  }

  @Get('custom-fields/:id')
  @ApiOperation({ summary: 'Get one category custom field.' })
  @ApiOkResponse({ type: CategoryCustomFieldResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: 'non_conformity_category_custom_fields',
    actions: ['read'],
  })
  async findCategoryCustomFieldById(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.findCategoryCustomFieldById(id, req.user),
      res,
      'Custom field fetched successfully',
    );
  }

  @Put('custom-fields/:id')
  @ApiOperation({ summary: 'Update a category custom field.' })
  @ApiBody({ type: UpdateCategoryCustomFieldDto })
  @ApiOkResponse({ type: CategoryCustomFieldResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: 'non_conformity_category_custom_fields',
    actions: ['update'],
  })
  async updateCategoryCustomField(
    @Param('id') id: string,
    @Body() updateDto: UpdateCategoryCustomFieldDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.updateCategoryCustomField(
        id,
        updateDto,
        req.user,
      ),
      res,
      'Custom field updated successfully',
    );
  }

  @Delete('custom-fields/:id')
  @ApiOperation({ summary: 'Delete a category custom field.' })
  @ApiOkResponse({
    description: 'Custom field deleted. Response body is empty.',
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: 'non_conformity_category_custom_fields',
    actions: ['delete'],
  })
  async deleteCategoryCustomField(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.deleteCategoryCustomField(id, req.user),
      res,
      'Custom field deleted successfully',
    );
  }

  // NC Custom Field Value Endpoints
  @Post('field-values')
  @ApiOperation({ summary: 'Create a nonconformity custom field value.' })
  @ApiBody({ type: CreateNCCustomFieldValueDto })
  @ApiOkResponse({ type: NCCustomFieldValueResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: 'non_conformity_custom_field_values',
    actions: ['create'],
  })
  async createNCCustomFieldValue(
    @Body() createDto: CreateNCCustomFieldValueDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.createNCCustomFieldValue(createDto, req.user),
      res,
      'Custom field value created successfully',
    );
  }

  @Get('field-values')
  @ApiOperation({ summary: 'List nonconformity custom field values.' })
  @ApiQuery({
    name: 'ncId',
    required: false,
    type: String,
    description: 'Limits the list to one nonconformity.',
  })
  @ApiQuery({
    name: 'customFieldId',
    required: false,
    type: String,
    description: 'Limits the list to one custom field.',
  })
  @ApiOkResponse({ type: NCCustomFieldValueResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: 'non_conformity_custom_field_values',
    actions: ['read'],
  })
  async findAllNCCustomFieldValues(
    @Res() res: Response,
    @Req() req,
    @Query() filter: NCCustomFieldValueQueryDto,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.findAllNCCustomFieldValues(req.user, filter),
      res,
      'Custom field values fetched successfully',
    );
  }

  // @Get('non-conformities/:ncId/field-values')
  // @hasPermission({
  //   subject: 'non_conformity_custom_field_values',
  //   actions: ['read'],
  // })
  // async getValuesByNonConformity(
  //   @Param('ncId') ncId: string,
  //   @Res() res: Response,
  //   @Req() req,
  // ) {
  //   return formatResponse(
  //     this.logger,
  //     this.nonConformitiesService.getValuesByNonConformity(ncId, req.user),
  //     res,
  //     'Custom field values fetched successfully',
  //   );
  // }

  @Get('field-values/:id')
  @ApiOperation({ summary: 'Get one nonconformity custom field value.' })
  @ApiOkResponse({ type: NCCustomFieldValueResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: 'non_conformity_custom_field_values',
    actions: ['read'],
  })
  async findNCCustomFieldValueById(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.findNCCustomFieldValueById(id, req.user),
      res,
      'Custom field value fetched successfully',
    );
  }

  @Put('field-values/:id')
  @ApiOperation({ summary: 'Update a nonconformity custom field value.' })
  @ApiBody({ type: UpdateNCCustomFieldValueDto })
  @ApiOkResponse({ type: NCCustomFieldValueResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: 'non_conformity_custom_field_values',
    actions: ['update'],
  })
  async updateNCCustomFieldValue(
    @Param('id') id: string,
    @Body() updateDto: UpdateNCCustomFieldValueDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.updateNCCustomFieldValue(
        id,
        updateDto,
        req.user,
      ),
      res,
      'Custom field value updated successfully',
    );
  }

  @Delete('field-values/:id')
  @ApiOperation({ summary: 'Delete a nonconformity custom field value.' })
  @ApiOkResponse({
    description: 'Custom field value deleted. Response body is empty.',
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: 'non_conformity_custom_field_values',
    actions: ['delete'],
  })
  async deleteNCCustomFieldValue(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.deleteNCCustomFieldValue(id, req.user),
      res,
      'Custom field value deleted successfully',
    );
  }

  @Post('types')
  @ApiOperation({ summary: 'Create a nonconformity type.' })
  @ApiBody({ type: CreateNonConformityTypeDto })
  @ApiOkResponse({ type: NonConformityIdResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: nonConformityTypePermission.subject,
    actions: ['create'],
  })
  async createNonConformityType(
    @Body() createNonConformityTypeDto: CreateNonConformityTypeDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.createNonConformityType(
        createNonConformityTypeDto,
        req.user,
      ),
      res,
      'Non-conformity type created successfully',
    );
  }

  @Get('types')
  @ApiOperation({ summary: 'List nonconformity types.' })
  @ApiQuery({
    name: 'name',
    required: false,
    type: String,
    description: 'Matches the type name.',
  })
  @ApiOkResponse({ type: NonConformityTypeResponseDTO, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: nonConformityTypePermission.subject,
    actions: ['read'],
  })
  async findAllNonConformityTypes(
    @Res() res: Response,
    @Req() req,
    @Query() filter: NameSearchQueryDto,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.findAllNonConformityTypes(req.user, filter),
      res,
      'Non-conformity types fetched successfully',
    );
  }

  @Get('types/:id')
  @ApiOperation({ summary: 'Get one nonconformity type.' })
  @ApiOkResponse({ type: NonConformityTypeResponseDTO })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: nonConformityTypePermission.subject,
    actions: ['read'],
  })
  async findOneNonConformityType(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.findOneNonConformityType(id, req.user),
      res,
      'Non-conformity type fetched successfully',
    );
  }

  @Put('types/:id')
  @ApiOperation({ summary: 'Update a nonconformity type.' })
  @ApiBody({ type: UpdateNonConformityTypeDto })
  @ApiOkResponse({ type: NonConformityIdResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: nonConformityTypePermission.subject,
    actions: ['update'],
  })
  async updateNonConformityType(
    @Body() updateNonConformityTypeDto: UpdateNonConformityTypeDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.updateNonConformityType(
        updateNonConformityTypeDto,
        req.user,
      ),
      res,
      'Non-conformity type updated successfully',
    );
  }

  @Delete('types/:id')
  @ApiOperation({ summary: 'Delete a nonconformity type.' })
  @ApiOkResponse({ type: NonConformityIdResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: nonConformityTypePermission.subject,
    actions: ['delete'],
  })
  async deleteNonConformityType(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.deleteNonConformityType(id, req.user),
      res,
      'Non-conformity type deleted successfully',
    );
  }

  @Post('risk-levels/bulk')
  @ApiOperation({ summary: 'Create or update nonconformity risk levels.' })
  @ApiBody({ type: BulkCreateNonConformityRiskLevelDto })
  @ApiOkResponse({ type: NonConformityRiskLevelResponseDTO, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: nonConformityRiskLevelPermission.subject,
    actions: ['create'],
  })
  async bulkCreateNonConformityRiskLevel(
    @Body() bulkCreateRiskLevelDto: BulkCreateNonConformityRiskLevelDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.bulkCreateNonConformityRiskLevel(
        bulkCreateRiskLevelDto,
        req.user,
      ),
      res,
      'Non-conformity risk levels created/updated successfully',
    );
  }

  @Get('risk-levels')
  @ApiOperation({ summary: 'List nonconformity risk levels.' })
  @ApiQuery({
    name: 'name',
    required: false,
    type: String,
    description: 'Matches the risk level name.',
  })
  @ApiOkResponse({ type: NonConformityRiskLevelResponseDTO, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: nonConformityRiskLevelPermission.subject,
    actions: ['read'],
  })
  async findAllNonConformityRiskLevels(
    @Res() res: Response,
    @Req() req,
    @Query() filter: NameSearchQueryDto,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.findAllNonConformityRiskLevels(
        req.user,
        filter,
      ),
      res,
      'Non-conformity risk levels fetched successfully',
    );
  }

  @Get('risk-levels/:id')
  @ApiOperation({ summary: 'Get one nonconformity risk level.' })
  @ApiOkResponse({ type: NonConformityRiskLevelResponseDTO })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: nonConformityRiskLevelPermission.subject,
    actions: ['read'],
  })
  async findOneNonConformityRiskLevel(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.findOneNonConformityRiskLevel(id, req.user),
      res,
      'Non-conformity risk level fetched successfully',
    );
  }

  @Delete('risk-levels/:id')
  @ApiOperation({ summary: 'Delete a nonconformity risk level.' })
  @ApiOkResponse({
    description: 'Risk level deleted. Response body is empty.',
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: nonConformityRiskLevelPermission.subject,
    actions: ['delete'],
  })
  async deleteNonConformityRiskLevel(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.deleteNonConformityRiskLevel(id, req.user),
      res,
      'Non-conformity risk level deleted successfully',
    );
  }

  @Post('representatives')
  @ApiOperation({ summary: 'Create an external nonconformity representative.' })
  @ApiBody({ type: CreateNonConformityRepresentativeDto })
  @ApiOkResponse({ type: NonConformityIdResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: nonConformityRepresentativePermission.subject,
    actions: ['create'],
  })
  async createNonConformityRepresentative(
    @Body()
    createNonConformityRepresentativeDto: CreateNonConformityRepresentativeDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.createNonConformityRepresentative(
        createNonConformityRepresentativeDto,
        req.user,
      ),
      res,
      'Non-conformity representative created successfully',
    );
  }

  @Get('representatives')
  @ApiOperation({ summary: 'List nonconformity representatives.' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Matches the person name or email.',
  })
  @ApiQuery({
    name: 'personnelType',
    required: false,
    enum: ['internal', 'external'],
    description: 'Limits the list to internal users or external representatives.',
  })
  @ApiQuery({
    name: 'teamId',
    required: false,
    type: String,
    description: 'Limits internal people to this team.',
  })
  @ApiQuery({
    name: 'teamIds',
    required: false,
    type: String,
    description: 'Comma-separated team ids. Limits internal people to these teams.',
  })
  @ApiOkResponse({ type: NonConformityRepresentativeResponseDTO, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: nonConformityRepresentativePermission.subject,
    actions: ['read'],
  })
  async findAllRepresentatives(
    @Res() res: Response,
    @Req() req,
    @Query() filter: RepresentativeQueryDto,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.findAllRepresentatives(
        req.user,
        filter,
      ),
      res,
      'Non-conformity representatives fetched successfully',
    );
  }

  @Get('representatives/:id')
  @ApiOperation({ summary: 'Get one external nonconformity representative.' })
  @ApiOkResponse({ type: NonConformityRepresentativeResponseDTO })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: nonConformityRepresentativePermission.subject,
    actions: ['read'],
  })
  async findOneNonConformityRepresentative(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.findOneNonConformityRepresentative(
        id,
        req.user,
      ),
      res,
      'Non-conformity representative fetched successfully',
    );
  }

  @Put('representatives/:id')
  @ApiOperation({ summary: 'Update an external nonconformity representative.' })
  @ApiBody({ type: UpdateNonConformityRepresentativeDto })
  @ApiOkResponse({ type: NonConformityIdResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: nonConformityRepresentativePermission.subject,
    actions: ['update'],
  })
  async updateNonConformityRepresentative(
    @Body()
    updateNonConformityRepresentativeDto: UpdateNonConformityRepresentativeDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.updateNonConformityRepresentative(
        updateNonConformityRepresentativeDto,
        req.user,
      ),
      res,
      'Non-conformity representative updated successfully',
    );
  }

  @Delete('representatives/:id')
  @ApiOperation({ summary: 'Delete an external nonconformity representative.' })
  @ApiOkResponse({ type: NonConformityIdResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: nonConformityRepresentativePermission.subject,
    actions: ['delete'],
  })
  async deleteNonConformityRepresentative(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.deleteNonConformityRepresentative(id, req.user),
      res,
      'Non-conformity representative deleted successfully',
    );
  }

  //NC Corrective Action Endpoints
  @Post('corrective-actions')
  @ApiOperation({ summary: 'Create a corrective action.' })
  @ApiBody({ type: CreateNCCorrectiveActionDto })
  @ApiOkResponse({ type: NonConformityIdResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: nonConformityCorrectiveActionPermission.subject,
    actions: ['create'],
  })
  async createNCCorrectiveAction(
    @Body() createNCCorrectiveActionDto: CreateNCCorrectiveActionDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.createCorrectiveAction(
        createNCCorrectiveActionDto,
        req.user,
      ),
      res,
      'Non-conformity corrective action created successfully',
    );
  }

  @Get('corrective-actions')
  @ApiOperation({ summary: 'List corrective actions for a nonconformity.' })
  @ApiQuery({
    name: 'nonConformityId',
    required: true,
    type: String,
    description: 'Nonconformity whose corrective actions are listed.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Matches the corrective action title.',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: ['1', '2', '3'],
    description: '1 is high, 2 is medium, 3 is low.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['OPEN', 'APPLIED', 'VERIFIED', 'CLOSED'],
  })
  @ApiQuery({
    name: 'assignee',
    required: false,
    type: String,
    description: 'Limits the list to one assignee.',
  })
  @ApiOkResponse({ type: NCCorrectiveActionResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: nonConformityCorrectiveActionPermission.subject,
    actions: ['read'],
  })
  async findAllCorrectiveActions(
    @Res() res: Response,
    @Req() req,
    @Query() filter: CorrectiveActionQueryDto,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.findAllCorrectiveActions(req.user, filter ?? {}),
      res,
      'Non-conformity corrective actions fetched successfully',
    );
  }

  @Get('corrective-actions/:id')
  @ApiOperation({ summary: 'Get one corrective action.' })
  @ApiOkResponse({ type: NCCorrectiveActionResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: nonConformityCorrectiveActionPermission.subject,
    actions: ['read'],
  })
  async findOneCorrectiveAction(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.findOneCorrectiveAction(id, req.user),
      res,
      'Non-conformity corrective action fetched successfully',
    );
  }

  @Put('corrective-actions/:id')
  @ApiOperation({ summary: 'Update a corrective action.' })
  @ApiBody({ type: UpdateNCCorrectiveActionDto })
  @ApiOkResponse({
    description: 'Corrective action updated. Response body is empty.',
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: nonConformityCorrectiveActionPermission.subject,
    actions: ['update'],
  })
  async updateCorrectiveAction(
    @Body() updateCorrectiveActionDto: UpdateNCCorrectiveActionDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.updateCorrectiveAction(
        updateCorrectiveActionDto,
        req.user,
      ),
      res,
      'Non-conformity corrective action updated successfully',
    );
  }

  @Delete('corrective-actions/:id')
  @ApiOperation({ summary: 'Delete a corrective action.' })
  @ApiOkResponse({
    description: 'Corrective action deleted. Response body is empty.',
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: nonConformityCorrectiveActionPermission.subject,
    actions: ['delete'],
  })
  async deleteCorrectiveAction(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.deleteCorrectiveAction(id, req.user),
      res,
      'Non-conformity corrective action deleted successfully',
    );
  }

  @Post('change-request')
  @ApiOperation({ summary: 'Create a corrective action change request.' })
  @ApiBody({ type: CreateCaChangeRequestDto })
  @ApiOkResponse({
    description: 'Change request created. Response body is empty.',
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: caChangeRequestPermission.subject,
    actions: ['create'],
  })
  async createCaChangeRequest(
    @Body() createCaChangeRequestDto: CreateCaChangeRequestDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.createCaChangeRequest(
        createCaChangeRequestDto,
        req.user,
      ),
      res,
      'CA change request created successfully',
    );
  }

  @Get('change-request/:id')
  @ApiOperation({ summary: 'Get one corrective action change request.' })
  @ApiOkResponse({ type: CaChangeRequestResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: caChangeRequestPermission.subject,
    actions: ['read'],
  })
  async findOneCaChangeRequest(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.findOneCaChangeRequest(id, req.user),
      res,
      'CA change request fetched successfully',
    );
  }

  @Get('change-request')
  @ApiOperation({ summary: 'List change requests for a corrective action.' })
  @ApiQuery({
    name: 'caId',
    required: true,
    type: String,
    description: 'Corrective action whose change requests are listed.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Matches the change request reason.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['DUE_DATE_CHANGE', 'ASSIGNEE_CHANGE'],
  })
  @ApiOkResponse({ type: CaChangeRequestResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: caChangeRequestPermission.subject,
    actions: ['read'],
  })
  async findAllCaChangeRequests(
    @Res() res: Response,
    @Req() req,
    @Query() filter: ChangeRequestQueryDto,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.findAllCaChangeRequests(req.user, filter),
      res,
      'CA change requests fetched successfully',
    );
  }

  @Put('change-request/:id')
  @ApiOperation({ summary: 'Update a corrective action change request.' })
  @ApiBody({ type: UpdateCaChangeRequestDto })
  @ApiOkResponse({
    description: 'Change request updated. Response body is empty.',
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: caChangeRequestPermission.subject,
    actions: ['update'],
  })
  async updateCaChangeRequest(
    @Body() updateCaChangeRequestDto: UpdateCaChangeRequestDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.updateCaChangeRequest(
        updateCaChangeRequestDto,
        req.user,
      ),
      res,
      'CA change request updated successfully',
    );
  }

  @Delete('change-request/:id')
  @ApiOperation({ summary: 'Delete a corrective action change request.' })
  @ApiOkResponse({
    description: 'Change request deleted. Response body is empty.',
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: caChangeRequestPermission.subject,
    actions: ['delete'],
  })
  async deleteCaChangeRequest(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.deleteCaChangeRequest(id, req.user),
      res,
      'CA change request deleted successfully',
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a nonconformity.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateNonConformityBodyDto })
  @ApiOkResponse({ type: NonConformityIdResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: nonConformityPermission.subject,
    actions: ['create'],
  })
  @UseInterceptors(AnyFilesInterceptor())
  async createNonConformity(
    @Body() createNonConformityDto: CreateNonConformityDto,
    @Res() res: Response,
    @Req() req,
    @UploadedFiles() files?: any[],
  ) {
    const evidenceFiles = files?.filter((f) => f.fieldname === 'files') || [];
    const fieldFiles = files?.filter((f) => f.fieldname === 'fieldFiles') || [];

    return formatResponse(
      this.logger,
      this.nonConformityService.createNonConformity(
        createNonConformityDto,
        req.user,
        evidenceFiles,
        fieldFiles,
      ),
      res,
      'Non-conformity created successfully',
    );
  }

  @Get()
  @ApiOperation({ summary: 'List nonconformities.' })
  @ApiQuery({
    name: 'unlinked',
    required: false,
    type: String,
    description: 'When true, only nonconformities with no audit finding are returned.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['OPEN', 'CLOSED', 'OVERDUE'],
    description:
      'OPEN is open and not overdue. OVERDUE is open and past the due date.',
  })
  @ApiQuery({
    name: 'teamId',
    required: false,
    type: String,
    description: 'Limits the list to one team.',
  })
  @ApiQuery({
    name: 'nonConformityTypeId',
    required: false,
    type: String,
    description: 'Limits the list to one type.',
  })
  @ApiQuery({
    name: 'nonConformityRiskLevelId',
    required: false,
    type: String,
    description: 'Limits the list to one risk level.',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: String,
    description: 'Limits the list to one category.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Matches the name or problem statement.',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['dueDate', 'createdAt'],
  })
  @ApiQuery({
    name: 'sortDir',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort direction. Used with sortBy.',
  })
  @ApiOkResponse({ type: NonConformityListItemResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: nonConformityPermission.subject,
    actions: ['read'],
  })
  async findAllNonConformity(
    @Res() res: Response,
    @Req() req,
    @Query() filter: NonConformityQueryDto,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.findAllNonConformities(req.user, filter),
      res,
      'Non-conformities fetched successfully',
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one nonconformity.' })
  @ApiOkResponse({ type: NonConformityResponseDTO })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: nonConformityPermission.subject,
    actions: ['read'],
  })
  async findOneNonConformity(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.findOneNonConformity(id, req.user),
      res,
      'Non-conformity fetched successfully',
    );
  }

  @Put(':id/close')
  @ApiOperation({ summary: 'Close a nonconformity.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CloseNonConformityBodyDto })
  @ApiOkResponse({
    description: 'Nonconformity closed. Response body is empty.',
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: nonConformityPermission.subject,
    actions: ['close'],
  })
  @UseInterceptors(AnyFilesInterceptor())
  async closeNonConformity(
    @Param('id') id: string,
    @Body() closeDto: CloseNonConformityDto,
    @Res() res: Response,
    @Req() req,
    @UploadedFiles() files?: any[],
  ) {
    const evidenceFiles = files?.filter((f) => f.fieldname === 'files') || [];
    return formatResponse(
      this.logger,
      this.nonConformityService.closeNonConformity(
        id,
        closeDto,
        req.user,
        evidenceFiles,
      ),
      res,
      'Non-conformity closed successfully',
    );
  }

  @Put(':id/amend-due-date')
  @ApiOperation({ summary: 'Amend a nonconformity due date.' })
  @ApiBody({ type: AmendNonConformityDueDateDto })
  @ApiOkResponse({
    description: 'Due date amended. Response body is empty.',
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: nonConformityPermission.subject,
    actions: ['amend_due_date'],
  })
  async amendNonConformityDueDate(
    @Param('id') id: string,
    @Body() dto: AmendNonConformityDueDateDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.amendNonConformityDueDate(id, dto, req.user),
      res,
      'Non-conformity due date amended successfully',
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a nonconformity.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateNonConformityBodyDto })
  @ApiOkResponse({
    description: 'Nonconformity updated. Response body is empty.',
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: nonConformityPermission.subject,
    actions: ['update'],
  })
  @UseInterceptors(AnyFilesInterceptor())
  async updateNonConformity(
    @Body() updateNonConformityDto: UpdateNonConformityDto,
    @Res() res: Response,
    @Req() req,
    @UploadedFiles() files?: any[],
  ) {
    const evidenceFiles = files?.filter((f) => f.fieldname === 'files') || [];
    const fieldFiles = files?.filter((f) => f.fieldname === 'fieldFiles') || [];
    return formatResponse(
      this.logger,
      this.nonConformityService.updateNonConformity(
        updateNonConformityDto,
        req.user,
        evidenceFiles,
        fieldFiles,
      ),
      res,
      'Non-conformity updated successfully',
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a nonconformity.' })
  @ApiOkResponse({
    description: 'Nonconformity deleted. Response body is empty.',
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: nonConformityPermission.subject,
    actions: ['delete'],
  })
  async deleteNonConformity(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.deleteNonConformity(id, req.user),
      res,
      'Non-conformity deleted successfully',
    );
  }

  // Immediate Action endpoints
  @Post(':ncId/immediate-actions')
  @ApiOperation({ summary: 'Create an immediate action.' })
  @ApiBody({ type: CreateImmediateActionDto })
  @ApiOkResponse({ type: NonConformityIdResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: immediateActionPermission.subject,
    actions: ['create'],
  })
  async createImmediateAction(
    @Body() createImmediateActionDto: CreateImmediateActionDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.createImmediateAction(
        req.params.ncId,
        createImmediateActionDto,
        req.user,
      ),
      res,
      'Immediate action created successfully',
    );
  }

  @Get('immediate-actions/:id')
  @ApiOperation({ summary: 'Get one immediate action.' })
  @ApiOkResponse({ type: ImmediateActionRecordResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: immediateActionPermission.subject,
    actions: ['read'],
  })
  async findOneImmediateAction(
    @Res() res: Response,
    @Req() req,
    @Param('id') id: string,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.findOneImmediateAction(id, req.user),
      res,
      'Immediate action fetched successfully',
    );
  }

  @Get(':ncId/immediate-actions')
  @ApiOperation({ summary: 'List immediate actions for a nonconformity.' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['open', 'ready_for_verification', 'verified', 'rejected'],
  })
  @ApiQuery({
    name: 'statuses',
    required: false,
    type: String,
    description: 'One status, or several statuses.',
  })
  @ApiQuery({
    name: 'dueDate',
    required: false,
    type: String,
    description: 'Unix time in milliseconds.',
  })
  @ApiQuery({
    name: 'assigned_to_id',
    required: false,
    type: String,
    description: 'Limits the list to one assignee.',
  })
  @ApiQuery({
    name: 'assigneeId',
    required: false,
    type: String,
    description: 'Limits the list to one assignee.',
  })
  @ApiQuery({
    name: 'created_by_id',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'createdById',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'created_in_last_days',
    required: false,
    type: String,
    description: 'Limits the list to actions created in the last N days.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Matches the description.',
  })
  @ApiOkResponse({ type: ImmediateActionRecordResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: immediateActionPermission.subject,
    actions: ['read'],
  })
  async findAllImmediateActions(
    @Res() res: Response,
    @Req() req,
    @Param('ncId') ncId: string,
    @Query() filter: ImmediateActionQueryDto,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.findAllImmediateActions(req.user, ncId, filter),
      res,
      'Immediate actions fetched successfully',
    );
  }

  @Put('immediate-actions/:id')
  @ApiOperation({ summary: 'Update an immediate action.' })
  @ApiBody({ type: UpdateImmediateActionDto })
  @ApiOkResponse({
    description: 'Immediate action updated. Response body is empty.',
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: immediateActionPermission.subject,
    actions: ['update'],
  })
  async updateImmediateAction(
    @Body() updateImmediateActionDto: UpdateImmediateActionDto,
    @Res() res: Response,
    @Req() req,
    @Param('id') id: string,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.updateImmediateAction(
        updateImmediateActionDto,
        req.user,
        id,
      ),
      res,
      'Immediate action updated successfully',
    );
  }

  @Delete('immediate-actions/:id')
  @ApiOperation({ summary: 'Delete an immediate action.' })
  @ApiOkResponse({
    description: 'Immediate action deleted. Response body is empty.',
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: immediateActionPermission.subject,
    actions: ['delete'],
  })
  async deleteImmediateAction(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.deleteImmediateAction(id, req.user),
      res,
      'Immediate action deleted successfully',
    );
  }

  // Update immediate action status (complete/verify) endpoint
  @Put('immediate-actions/:id/status')
  @ApiOperation({ summary: 'Change an immediate action status.' })
  @ApiBody({ type: UpdateImmediateActionStatusDto })
  @ApiOkResponse({
    description: 'Immediate action status updated. Response body is empty.',
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: immediateActionPermission.subject,
    actions: ['update', 'read'],
  })
  async updateImmediateActionStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateImmediateActionStatusDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.updateImmediateActionStatus(
        id,
        updateDto.status,
        req.user,
      ),
      res,
      'Immediate action status updated successfully',
    );
  }

  // Verify immediate action endpoint (specific permission required)
  @Put('immediate-actions/:id/verify')
  @ApiOperation({ summary: 'Verify an immediate action.' })
  @ApiOkResponse({
    description: 'Immediate action verified. Response body is empty.',
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: immediateActionPermission.subject,
    actions: ['verify_action'],
  })
  async verifyImmediateAction(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.updateImmediateActionStatus(
        id,
        ImmediateActionStatus.VERIFIED,
        req.user,
      ),
      res,
      'Immediate action verified successfully',
    );
  }

  // Immediate Action Evidence endpoints
  @Post('immediate-actions/:immediateActionId/evidence')
  @ApiOperation({ summary: 'Upload evidence for an immediate action.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadFileBodyDto })
  @ApiOkResponse({ type: NonConformityIdResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: immediateActionEvidencePermission.subject,
    actions: ['update'],
  })
  @UseInterceptors(FileInterceptor('file'))
  async createImmediateActionEvidence(
    @UploadedFile() file: Express.Multer.File,
    @Param('immediateActionId') immediateActionId: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.createImmediateActionEvidence(
        immediateActionId,
        req.user,
        file,
      ),
      res,
      'Immediate action evidence uploaded successfully',
    );
  }

  @Delete('immediate-action-evidence/:id')
  @ApiOperation({ summary: 'Delete immediate action evidence.' })
  @ApiOkResponse({
    description: 'Evidence deleted. Response body is empty.',
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: immediateActionEvidencePermission.subject,
    actions: ['update'],
  })
  async deleteImmediateActionEvidence(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.deleteImmediateActionEvidence(id, req.user),
      res,
      'Immediate action evidence deleted successfully',
    );
  }

  @Post('immediate-actions/:immediateActionId/comments')
  @ApiOperation({ summary: 'Add a comment to an immediate action.' })
  @ApiBody({ type: CreateImmediateActionCommentDto })
  @ApiOkResponse({ type: NonConformityIdResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: immediateActionPermission.subject,
    actions: ['update'],
  })
  async createImmediateActionComment(
    @Param('immediateActionId') immediateActionId: string,
    @Body() dto: CreateImmediateActionCommentDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.createImmediateActionComment(
        immediateActionId,
        dto.text,
        req.user,
      ),
      res,
      'Immediate action comment created successfully',
    );
  }

  @Delete('immediate-action-comments/:id')
  @ApiOperation({ summary: 'Delete an immediate action comment.' })
  @ApiOkResponse({ type: NonConformitySuccessResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: immediateActionPermission.subject,
    actions: ['update'],
  })
  async deleteImmediateActionComment(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService
        .deleteImmediateActionComment(id, req.user)
        .then(() => ({ success: true })),
      res,
      'Immediate action comment deleted successfully',
    );
  }

  // Corrective Action Effectiveness Evidence endpoints
  @Post('effectiveness-evidences')
  @ApiOperation({ summary: 'Upload corrective action effectiveness evidence.' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({
    name: 'caId',
    required: true,
    type: String,
    description: 'Corrective action that receives the evidence.',
  })
  @ApiBody({ type: UploadFileBodyDto })
  @ApiOkResponse({
    description: 'Effectiveness evidence uploaded. Response body is empty.',
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: caEffectivenessEvidencePermission.subject,
    actions: ['create'],
  })
  @UseInterceptors(FileInterceptor('file'))
  async createCaEffectivenessEvidence(
    @Res() res: Response,
    @Req() req,
    @Query('caId') caId: string,
    @UploadedFile() file: any,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.createCaEffectivenessEvidence(
        req.user,
        caId,
        file,
      ),
      res,
      'Ca effectiveness evidence uploaded successfully',
    );
  }

  // Root Cause Analysis endpoints
  @Post('root-cause-analysis')
  @ApiOperation({ summary: 'Create a root cause analysis.' })
  @ApiBody({ type: CreateRootCauseAnalysisDto })
  @ApiOkResponse({ type: RootCauseAnalysisResponseDTO })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: rootCauseAnalysisPermission.subject,
    actions: ['create'],
  })
  async createRootCauseAnalysis(
    @Body() createRootCauseAnalysisDto: CreateRootCauseAnalysisDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.createRootCauseAnalysis(
        createRootCauseAnalysisDto,
        req.user,
      ),
      res,
      'Root cause analysis created successfully',
    );
  }

  @Get(':ncId/root-cause-analysis')
  @ApiOperation({ summary: 'List root cause analyses for a nonconformity.' })
  @ApiOkResponse({ type: RootCauseAnalysisResponseDTO, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: rootCauseAnalysisPermission.subject,
    actions: ['read'],
  })
  async findAllRootCauseAnalysis(
    @Param('ncId') ncId: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.findAllRootCauseAnalysis(ncId, req.user),
      res,
      'Root cause analyses retrieved successfully',
    );
  }

  @Get('root-cause-analysis/:id')
  @ApiOperation({ summary: 'Get one root cause analysis.' })
  @ApiOkResponse({ type: RootCauseAnalysisResponseDTO })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: rootCauseAnalysisPermission.subject,
    actions: ['read'],
  })
  async findOneRootCauseAnalysis(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.findOneRootCauseAnalysis(id, req.user),
      res,
      'Root cause analysis retrieved successfully',
    );
  }

  @Put('root-cause-analysis/:id')
  @ApiOperation({ summary: 'Update a root cause analysis.' })
  @ApiBody({ type: UpdateRootCauseAnalysisDto })
  @ApiOkResponse({ type: RootCauseAnalysisResponseDTO })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: rootCauseAnalysisPermission.subject,
    actions: ['update'],
  })
  async updateRootCauseAnalysis(
    @Param('id') id: string,
    @Body() updateRootCauseAnalysisDto: UpdateRootCauseAnalysisDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.updateRootCauseAnalysis(
        id,
        updateRootCauseAnalysisDto,
        req.user,
      ),
      res,
      'Root cause analysis updated successfully',
    );
  }

  @Delete('root-cause-analysis/:id')
  @ApiOperation({ summary: 'Delete a root cause analysis.' })
  @ApiOkResponse({
    description: 'Root cause analysis deleted. Response body is empty.',
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: rootCauseAnalysisPermission.subject,
    actions: ['delete'],
  })
  async deleteRootCauseAnalysis(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.softDeleteRootCauseAnalysis(id, req.user),
      res,
      'Root cause analysis deleted successfully',
    );
  }

  // Investigation endpoints
  @Post('investigation')
  @ApiOperation({ summary: 'Create an investigation.' })
  @ApiBody({ type: CreateInvestigationDto })
  @ApiOkResponse({ type: InvestigationResponseDTO })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: investigationPermission.subject,
    actions: ['create'],
  })
  async createInvestigation(
    @Body() createInvestigationDto: CreateInvestigationDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.createInvestigation(
        createInvestigationDto,
        req.user,
      ),
      res,
      'Investigation created successfully',
    );
  }

  @Get(':ncId/investigation')
  @ApiOperation({ summary: 'List investigations for a nonconformity.' })
  @ApiOkResponse({ type: InvestigationResponseDTO, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: investigationPermission.subject,
    actions: ['read'],
  })
  async findAllInvestigations(
    @Param('ncId') ncId: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.findAllInvestigations(ncId, req.user),
      res,
      'Investigations retrieved successfully',
    );
  }

  @Get('investigation/:id')
  @ApiOperation({ summary: 'Get one investigation.' })
  @ApiOkResponse({ type: InvestigationResponseDTO })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: investigationPermission.subject,
    actions: ['read'],
  })
  async findOneInvestigation(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.findOneInvestigation(id, req.user),
      res,
      'Investigation retrieved successfully',
    );
  }

  @Put('investigation/:id')
  @ApiOperation({ summary: 'Update an investigation.' })
  @ApiBody({ type: UpdateInvestigationDto })
  @ApiOkResponse({ type: InvestigationResponseDTO })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: investigationPermission.subject,
    actions: ['update'],
  })
  async updateInvestigation(
    @Param('id') id: string,
    @Body() updateInvestigationDto: UpdateInvestigationDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.updateInvestigation(
        id,
        updateInvestigationDto,
        req.user,
      ),
      res,
      'Investigation updated successfully',
    );
  }

  @Delete('investigation/:id')
  @ApiOperation({ summary: 'Delete an investigation.' })
  @ApiOkResponse({
    description: 'Investigation deleted. Response body is empty.',
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: investigationPermission.subject,
    actions: ['delete'],
  })
  async deleteInvestigation(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.deleteInvestigation(id, req.user),
      res,
      'Investigation deleted successfully',
    );
  }

  // Investigation Evidence endpoints
  @Post('investigation-evidence')
  @ApiOperation({ summary: 'Upload investigation evidence.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateInvestigationEvidenceBodyDto })
  @ApiOkResponse({ type: InvestigationEvidenceResponseDTO })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: investigationEvidencePermission.subject,
    actions: ['create'],
  })
  @UseInterceptors(FileInterceptor('file'))
  async createInvestigationEvidence(
    @Body() createInvestigationEvidenceDto: CreateInvestigationEvidenceDto,
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.createInvestigationEvidence(
        createInvestigationEvidenceDto,
        req.user,
        file,
      ),
      res,
      'Investigation evidence created successfully',
    );
  }

  @Get('investigation-evidence/investigation/:investigationId')
  @ApiOperation({ summary: 'List evidence for an investigation.' })
  @ApiOkResponse({ type: InvestigationEvidenceResponseDTO, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: investigationEvidencePermission.subject,
    actions: ['read'],
  })
  async findAllInvestigationEvidence(
    @Param('investigationId') investigationId: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.findAllInvestigationEvidence(
        investigationId,
        req.user,
      ),
      res,
      'Investigation evidence retrieved successfully',
    );
  }

  @Get('investigation-evidence/:id')
  @ApiOperation({ summary: 'Get one investigation evidence record.' })
  @ApiOkResponse({ type: InvestigationEvidenceResponseDTO })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: investigationEvidencePermission.subject,
    actions: ['read'],
  })
  async findOneInvestigationEvidence(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.findOneInvestigationEvidence(id, req.user),
      res,
      'Investigation evidence retrieved successfully',
    );
  }

  @Put('investigation-evidence/:id')
  @ApiOperation({ summary: 'Update investigation evidence.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateInvestigationEvidenceBodyDto })
  @ApiOkResponse({ type: InvestigationEvidenceResponseDTO })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: investigationEvidencePermission.subject,
    actions: ['update'],
  })
  @UseInterceptors(FileInterceptor('file'))
  async updateInvestigationEvidence(
    @Param('id') id: string,
    @Body() updateInvestigationEvidenceDto: UpdateInvestigationEvidenceDto,
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.updateInvestigationEvidence(
        id,
        updateInvestigationEvidenceDto,
        req.user,
        file,
      ),
      res,
      'Investigation evidence updated successfully',
    );
  }

  @Delete('investigation-evidence/:id')
  @ApiOperation({ summary: 'Delete investigation evidence.' })
  @ApiOkResponse({
    description: 'Investigation evidence deleted. Response body is empty.',
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: investigationEvidencePermission.subject,
    actions: ['delete'],
  })
  async deleteInvestigationEvidence(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.deleteInvestigationEvidence(id, req.user),
      res,
      'Investigation evidence deleted successfully',
    );
  }

  @Post('rca-five-why-steps')
  @ApiOperation({ summary: 'Create or update five-why steps.' })
  @ApiBody({ type: BulkCreateRCAFiveWhyStepDto })
  @ApiOkResponse({ type: BulkRCAFiveWhyResultResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: rootCauseAnalysisPermission.subject,
    actions: ['create'],
  })
  async bulkCreateRCAFiveWhySteps(
    @Body() bulkCreateRCAFiveWhyStepDto: BulkCreateRCAFiveWhyStepDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.bulkCreateRCAFiveWhySteps(
        bulkCreateRCAFiveWhyStepDto,
        req.user,
      ),
      res,
      'RCA five why steps created successfully',
    );
  }

  @Post(':id/rca-ce-categories/bulk')
  @ApiOperation({ summary: 'Create cause-and-effect categories for a nonconformity.' })
  @ApiBody({ type: BulkCreateRCACeCategoryDto })
  @ApiOkResponse({
    description: 'Cause-and-effect categories saved. Response body is empty.',
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: rootCauseAnalysisPermission.subject,
    actions: ['create'],
  })
  async bulkCreateRCACeCategory(
    @Body() bulkDto: BulkCreateRCACeCategoryDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.bulkCreateRCACeCategory(
        req.params.id,
        bulkDto,
        req.user,
      ),
      res,
      'RCA CE categories and causes created successfully',
    );
  }

  @Get('rca-five-why-steps/:rcaId')
  @ApiOperation({ summary: 'List five-why steps for a root cause analysis.' })
  @ApiOkResponse({ type: RCAResponseDTO, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: rootCauseAnalysisPermission.subject,
    actions: ['read'],
  })
  async findAllRCAFiveWhySteps(
    @Res() res: Response,
    @Req() req,
    @Param('rcaId') rcaId: string,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.findAllRCAFiveWhySteps(req.user, rcaId),
      res,
      'RCA five why steps fetched successfully',
    );
  }

  @Get(':ncId/rca-ce-categories')
  @ApiOperation({ summary: 'List cause-and-effect categories for a nonconformity.' })
  @ApiOkResponse({ type: RCACeCategoryResponseDTO, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: rootCauseAnalysisPermission.subject,
    actions: ['read'],
  })
  async findAllRCACeCategory(
    @Param('ncId') ncId: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.findAllRCACeCategory(ncId, req.user),
      res,
      'RCA CE categories retrieved successfully',
    );
  }

  @Delete('rca-ce-categories/:id')
  @ApiOperation({ summary: 'Delete a cause-and-effect category.' })
  @ApiOkResponse({
    description: 'Cause-and-effect category deleted. Response body is empty.',
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: rootCauseAnalysisPermission.subject,
    actions: ['delete'],
  })
  async deleteRCACeCategory(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.deleteRCACeCategory(id, req.user),
      res,
      'RCA CE category deleted successfully',
    );
  }

  @Post(':ncId/rca-fishbone')
  @ApiOperation({ summary: 'Create a fishbone for a nonconformity.' })
  @ApiBody({ type: CreateFishboneDto })
  @ApiOkResponse({ type: RCAFishboneRecordResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: rootCauseAnalysisPermission.subject,
    actions: ['create'],
  })
  async createRCAFishbone(
    @Param('ncId') ncId: string,
    @Body() createRCAFishboneDto: CreateFishboneDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.createFishbone(
        ncId,
        createRCAFishboneDto,
        req.user,
      ),
      res,
      'RCA fishbone created successfully',
    );
  }

  @Put('rca-fishbone/:id')
  @ApiOperation({ summary: 'Update a fishbone.' })
  @ApiBody({ type: UpdateFishboneDto })
  @ApiOkResponse({ type: RCAFishboneRecordResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({
    subject: rootCauseAnalysisPermission.subject,
    actions: ['update'],
  })
  async updateRCAFishbone(
    @Param('id') id: string,
    @Body() updateRCAFishboneDto: UpdateFishboneDto,
    @Res() res: Response,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.nonConformityService.updateFishbone(
        id,
        updateRCAFishboneDto,
        req.user,
      ),
      res,
      'RCA fishbone updated successfully',
    );
  }
}
