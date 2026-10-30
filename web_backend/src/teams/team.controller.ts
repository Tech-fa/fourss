import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Res,
  Req,
  Logger,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TeamService } from './team.service';
import { CreateTeamDto } from './dtos';
import { formatResponse } from '../util/helper-util';
import { hasPermission } from '../authentication/permission.decorator';
import { teamsPermission } from '../permissions/permissions';

@ApiTags('Teams')
@ApiBearerAuth()
@Controller('teams')
export class TeamController {
  private readonly logger = new Logger(TeamController.name);
  constructor(private readonly teamService: TeamService) {}

  @Get('')
  @ApiOperation({ summary: 'List teams.' })
  async getTeams(@Res() res: Response, @Req() req) {
    return formatResponse(
      this.logger,
      this.teamService.findAllTeams(),
      res,
      'Teams fetched successfully',
    );
  }

  @Post('')
  @ApiOperation({ summary: 'Create a team.' })
  @hasPermission({
    subject: teamsPermission.subject,
    actions: ['create'],
  })
  async createTeam(
    @Res() res: Response,
    @Body() dto: CreateTeamDto,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.teamService.createTeam(dto, req.user),
      res,
      'Team created successfully',
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a team.' })
  @hasPermission({
    subject: teamsPermission.subject,
    actions: ['update'],
  })
  async updateTeam(
    @Res() res: Response,
    @Param('id') id: string,
    @Body() dto: CreateTeamDto,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.teamService.updateTeam(+id, dto, req.user),
      res,
      `Team updated successfully of id ${id}`,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a team.' })
  @hasPermission({
    subject: teamsPermission.subject,
    actions: ['delete'],
  })
  async deleteTeam(@Res() res: Response, @Param('id') id: string, @Req() req) {
    return formatResponse(
      this.logger,
      this.teamService.deleteTeam(+id, req.user),
      res,
      `Team deleted successfully of id ${id}`,
    );
  }

  @Get(':id/module-counts')
  @ApiOperation({ summary: 'Count records owned by a team across modules.' })
  @hasPermission({
    subject: teamsPermission.subject,
    actions: ['read'],
  })
  async getModuleCounts(
    @Res() res: Response,
    @Param('id') id: string,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.teamService.getModuleCounts(+id),
      res,
      'Team module counts fetched successfully',
    );
  }
}
