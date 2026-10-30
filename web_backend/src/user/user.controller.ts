import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  Response,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { formatResponse } from "../util/helper-util";
import { UsersService } from "./user.service";
import { hasPermission } from "../authentication/permission.decorator";
import {
  UpdateLocaleRequestDto,
  UpdateMyUserRequestDto,
  UpdateUserDTO,
  UserActionParamDto,
  UserCompetencyResponseDto,
  UserDetailResponseDto,
  UserDTO,
  UserIdParamDto,
  UserIdResponseDto,
  UserProfileResponseDto,
  UserSearchQueryDto,
  UserSearchResponseDto,
} from "./user.dto";
import { UserLinkedRecordsResponseDto } from "./user-linked-records";
import { userPermission } from "../permissions/permissions";
import {
  CatalogErrorResponseDto,
  UnauthorizedResponseDto,
} from "../authentication/auth.dto";

@ApiTags("Users")
@ApiBearerAuth()
@Controller("users")
export class UserController {
  constructor(private readonly userService: UsersService) {}

  private readonly logger = new Logger(UserController.name);

  @Get()
  @ApiOperation({ summary: "Search users in the current client." })
  @ApiQuery({
    name: "name",
    required: false,
    type: String,
    description: "Matches first name, last name, or full name.",
  })
  @ApiOkResponse({ type: UserSearchResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({ subject: userPermission.subject, actions: ["read"] })
  async getUsers(@Res() res: Response, @Query() query: UserSearchQueryDto) {
    return formatResponse(
      this.logger,
      this.userService.findAllBySearch(query.name ?? ""),
      res,
      "Users fetched successfully",
    );
  }

  @Get("profile")
  @ApiOperation({ summary: "Get the signed-in user profile." })
  @ApiOkResponse({ type: UserProfileResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  async getProfile(@Res() res: Response, @Req() req) {
    return formatResponse(
      this.logger,
      this.userService.findBy({ id: req.user.id }, [], {
        id: true,
        fname: true,
        lname: true,
        email: true,
        phone: true,
      }),
      res,
      "Profile fetched successfully",
    );
  }

  @Get("profile/competencies")
  @ApiOperation({
    summary: "List competencies recorded for the signed-in user.",
  })
  @ApiOkResponse({ type: UserCompetencyResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  async getMyCompetencies(@Res() res: Response) {
    return formatResponse(
      this.logger,
      Promise.resolve([]),
      res,
      "User competencies fetched successfully",
    );
  }

  @Get("profile/linked-records")
  @ApiOperation({ summary: "List records linked to the signed-in user." })
  @ApiOkResponse({ type: UserLinkedRecordsResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  async getMyLinkedRecords(@Res() res: Response, @Req() req) {
    return formatResponse(
      this.logger,
      this.userService.getMyTasks(req.user.id),
      res,
      "Linked records fetched successfully",
    );
  }

  @Get("myTasks")
  @ApiOperation({ summary: "List tasks assigned to the signed-in user." })
  @ApiOkResponse({ type: UserLinkedRecordsResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  async getMyTasks(@Res() res: Response, @Req() req) {
    return formatResponse(
      this.logger,
      this.userService.getMyTasks(req.user.id),
      res,
      "My tasks fetched successfully",
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Get one user by id." })
  @ApiOkResponse({ type: UserDetailResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({ subject: userPermission.subject, actions: ["read"] })
  async getUser(
    @Res() res: Response,
    @Req() req,
    @Param() params: UserIdParamDto,
  ) {
    return formatResponse(
      this.logger,
      this.userService.findBy(
        { id: params.id },
        [
          "teamMemberships",
          "teamMemberships.role",
          "teamMemberships.team",
          "createdBy",
        ],
        {
          id: true,
          fname: true,
          lname: true,
          email: true,
          phone: true,
          isActive: true,
          isTopManagement: true,
          createdAt: true,
          deleted: true,
          verifiedAt: true,
          failedLogins: true,
          createdBy: {
            id: true,
            fname: true,
            lname: true,
          },
        },
      ),
      res,
      "User fetched successfully",
    );
  }

  @Get(":id/competencies")
  @ApiOperation({ summary: "List competencies recorded for a user." })
  @ApiOkResponse({ type: UserCompetencyResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @hasPermission({ subject: userPermission.subject, actions: ["read"] })
  async getUserCompetencies(@Res() res: Response) {
    return formatResponse(
      this.logger,
      Promise.resolve([]),
      res,
      "User competencies fetched successfully",
    );
  }

  @Post("")
  @ApiOperation({ summary: "Create a user in the current client." })
  @ApiBody({ type: UserDTO })
  @ApiOkResponse({ type: UserIdResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @hasPermission({ subject: userPermission.subject, actions: ["create"] })
  async createUser(@Res() res: Response, @Req() req, @Body() body: UserDTO) {
    return formatResponse(
      this.logger,
      this.userService.createUser(body, req.user),
      res,
      "User created successfully",
    );
  }

  @Put(":id/unlock")
  @ApiOperation({ summary: "Clear a user lock after failed logins." })
  @ApiOkResponse({ type: UserIdResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({ subject: userPermission.subject, actions: ["update"] })
  async unlockUser(
    @Res() res: Response,
    @Req() req,
    @Param() params: UserIdParamDto,
  ) {
    return formatResponse(
      this.logger,
      this.userService.unlockUser(params.id),
      res,
      "User unlocked successfully",
    );
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a user profile." })
  @ApiBody({ type: UpdateUserDTO })
  @ApiOkResponse({ type: UserIdResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({ subject: userPermission.subject, actions: ["update"] })
  async updateUser(
    @Res() res: Response,
    @Req() req,
    @Param() params: UserIdParamDto,
    @Body() body: UpdateUserDTO,
  ) {
    return formatResponse(
      this.logger,
      this.userService.updateUser(params.id, body, undefined, req.user),
      res,
      "User updated successfully",
    );
  }
  @Patch("me/locale")
  @ApiOperation({ summary: "Update the signed-in user locale." })
  @ApiBody({ type: UpdateLocaleRequestDto })
  @ApiOkResponse({ description: "Locale saved. Response body is empty." })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  async updateMyLocale(
    @Res() res: Response,
    @Req() req,
    @Body() body: UpdateLocaleRequestDto,
  ) {
    return formatResponse(
      this.logger,
      this.userService.updateLocale(req.user.id, body.locale),
      res,
      "Locale updated successfully",
    );
  }

  @Put("")
  @ApiOperation({ summary: "Update the signed-in user profile." })
  @ApiBody({ type: UpdateMyUserRequestDto })
  @ApiOkResponse({ type: UserIdResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  async updateMyUser(
    @Res() res: Response,
    @Req() req,
    @Body() body: UpdateMyUserRequestDto,
  ) {
    const { fname, lname, phone, email } = body;
    return formatResponse(
      this.logger,
      this.userService.updateUser(req.user.id, {
        active: true,
        fname,
        lname,
        phone,
        email,
        password: "",
      }),
      res,
      "User updated successfully",
    );
  }
  @Put(":id/:action")
  @ApiOperation({ summary: "Activate or deactivate a user." })
  @ApiOkResponse({ description: "User saved. Response body is empty." })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({ subject: userPermission.subject, actions: ["update"] })
  async inactivateUser(
    @Res() res: Response,
    @Req() req,
    @Param() params: UserActionParamDto,
  ) {
    return formatResponse(
      this.logger,
      this.userService.inactiveUser(params.id, params.action),
      res,
      "User inactivated successfully",
    );
  }
  @Delete(":id")
  @ApiOperation({ summary: "Soft-delete a user." })
  @ApiOkResponse({ description: "User deleted. Response body is empty." })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiBadRequestResponse({ type: CatalogErrorResponseDto })
  @ApiNotFoundResponse({ type: CatalogErrorResponseDto })
  @hasPermission({ subject: userPermission.subject, actions: ["delete"] })
  async deleteUser(
    @Res() res: Response,
    @Req() req,
    @Param() params: UserIdParamDto,
  ) {
    return formatResponse(
      this.logger,
      this.userService.deleteUser(params.id, req.user.id),
      res,
      "User deleted successfully",
    );
  }
}
