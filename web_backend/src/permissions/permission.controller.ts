import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Res,
  Req,
  Logger,
  UseInterceptors,
  Put,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionService } from "./permission.service";
import {
  AttachRolesToUserDto,
  DetachRolesFromUserDto,
  RoleDto,
} from "./dto";
import { formatResponse } from "../util/helper-util";
import { hasPermission } from "../authentication/permission.decorator";
import { Public } from "../util/constants";
import { permissionPermission } from "./permissions";
@ApiTags('Permissions')
@ApiBearerAuth()
@Controller("permissions")
export class PermissionController {
  private readonly logger = new Logger(PermissionController.name);

  constructor(private readonly permissionService: PermissionService) {}

  @Get()
  @ApiOperation({ summary: 'List every permission subject and action the application can grant.' })
  @Public()
  async getAllPermissions(@Res() res: Response) {
    return formatResponse(
      this.logger,
      this.permissionService.getAllPermissions(),
      res,
      "All permissions fetched successfully",
    );
  }

  @Post("teams/access")
  @ApiOperation({ summary: 'List users who can access a given permission subject.' })
  async getUsersWithAccess(@Res() res: Response, @Req() req) {
    return formatResponse(
      this.logger,
      this.permissionService.usersWithAccess(
        req.body.teamIds,
        req.user,
        req.body.subject,
        req.body.allTeamIds,
        req.body.userIds,
        req.body.combination,
      ),
      res,
      "Users with access fetched successfully",
    );
  }

  @Post("users/access")
  @ApiOperation({ summary: 'List users who can perform specific actions on a subject.' })
  async getUsersWithAccessBySubject(@Res() res: Response, @Req() req) {
    return formatResponse(
      this.logger,
      this.permissionService.usersWithClientAccess(
        req.body.subject,
        req.body.combination,
      ),
      res,
      "Users with access fetched successfully",
    );
  }

  @Get("roles")
  @ApiOperation({ summary: 'List roles for the current client.' })
  @hasPermission({ subject: permissionPermission.subject, actions: ["read"] })
  async getRoles(@Res() res: Response, @Req() req) {
    return formatResponse(
      this.logger,
      this.permissionService.getRoles(req.query.name),
      res,
      "Permission roles fetched successfully",
    );
  }

  @Get("roles/:id")
  @ApiOperation({ summary: 'Get one role, including its permissions.' })
  @hasPermission({
    subject: permissionPermission.subject,
    actions: ["read"],
  })
  async getRole(@Res() res: Response, @Param("id") id: number) {
    return formatResponse(
      this.logger,
      this.permissionService.getRole(id),
      res,
      "Role fetched successfully",
    );
  }

  @Post("roles")
  @ApiOperation({ summary: 'Create a role and attach permissions.' })
  @hasPermission({
    subject: permissionPermission.subject,
    actions: ["create"],
  })
  async createRole(
    @Res() res: Response,
    @Body() createDto: RoleDto,
  ) {
    return formatResponse(
      this.logger,
      this.permissionService.createRole(createDto),
      res,
      "Role created successfully",
    );
  }

  @Put("roles/:id")
  @ApiOperation({ summary: 'Update a role name and its permissions.' })
  @hasPermission({
    subject: permissionPermission.subject,
    actions: ["update"],
  })
  async updateRole(
    @Res() res: Response,
    @Param("id") id: number,
    @Body() updateDto: RoleDto,
  ) {
    return formatResponse(
      this.logger,
      this.permissionService.updateRole(id, updateDto),
      res,
      "Role updated successfully",
    );
  }

  @Get("users/:userId")
  @ApiOperation({ summary: 'Get the roles and effective permissions for a user.' })
  @hasPermission({
    subject: permissionPermission.subject,
    actions: ["read"],
  })
  async getUserPermissions(
    @Res() res: Response,
    @Param("userId") userId: string,
  ) {
    return formatResponse(
      this.logger,
      this.permissionService.getUserPermissions(userId),
      res,
      "User permissions fetched successfully",
    );
  }

  @Post("user-roles/:userId")
  @ApiOperation({ summary: 'Replace the roles assigned to a user.' })
  @hasPermission({
    subject: permissionPermission.subject,
    actions: ["update"],
  })
  async setUserRoles(
    @Res() res: Response,
    @Param("userId") userId: string,
    @Body() body: AttachRolesToUserDto,
  ) {
    return formatResponse(
      this.logger,
      this.permissionService.setUserRoles(userId, body),
      res,
      "User roles updated successfully",
    );
  }

  @Delete("roles/:id")
  @ApiOperation({ summary: 'Delete a role.' })
  @hasPermission({
    subject: permissionPermission.subject,
    actions: ["delete"],
  })
  async deleteRole(@Res() res: Response, @Param("id") id: number) {
    return formatResponse(
      this.logger,
      this.permissionService.deleteRole(id),
      res,
      `Role deleted successfully with id ${id}`,
    );
  }

  @Delete("user-roles/:userId")
  @ApiOperation({ summary: 'Remove roles from a user.' })
  @hasPermission({
    subject: permissionPermission.subject,
    actions: ["delete"],
  })
  async detachRolesFromUser(
    @Res() res: Response,
    @Param("userId") userId: string,
    @Body() body: DetachRolesFromUserDto,
  ) {
    return formatResponse(
      this.logger,
      this.permissionService.detachRolesFromUser(userId, body),
      res,
      "Role detached from user successfully",
    );
  }

  @Post("teams/user")
  @ApiOperation({ summary: 'List teams a user belongs to.' })
  async getTeamsByUser(@Res() res: Response, @Req() req) {
    return formatResponse(
      this.logger,
      this.permissionService.findAllTeamsByUser(
        req.user,
        req.body.subject,
      ),
      res,
      "Teams fetched successfully",
    );
  }
}
