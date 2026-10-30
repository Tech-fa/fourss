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
  Response,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { formatResponse } from '../util/helper-util';
import { UserNotificationService } from './user-notification.service';
import { PaginationDto } from '../common/pagination';
import { resolveLocale } from '../common/resolvers/header-locale.resolver';
@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('user-notifications')
export class UserNotificationController {
  constructor(
    private readonly userNotificationService: UserNotificationService,
  ) {}

  private readonly logger = new Logger(UserNotificationController.name);

  @Get()
  @ApiOperation({ summary: 'List notifications for the signed-in user.' })
  async getUserNotifications(
    @Res() res: Response,
    @Req() req,
    @Query() pagination: PaginationDto,
  ) {
    const lang = resolveLocale(req.headers['x-locale'] as string);
    return formatResponse(
      this.logger,
      this.userNotificationService.findAll(req.user.id, pagination, lang),
      res,
      'User notifications fetched successfully',
    );
  }

  @Put(':id/view')
  @ApiOperation({ summary: 'Mark one notification as read.' })
  async markNotificationAsViewed(
    @Res() res: Response,
    @Req() req,
    @Param('id') id: string,
  ) {
    const lang = resolveLocale(req.headers['x-locale'] as string);
    return formatResponse(
      this.logger,
      this.userNotificationService.markAsViewed(Number(id), lang),
      res,
      'User notification marked as viewed successfully',
    );
  }

  @Put('mark-all-as-read')
  @ApiOperation({ summary: 'Mark every notification as read.' })
  async markAllNotificationsAsViewed(
    @Res() res: Response,
    @Req() req,
    @Body() body: { notificationIds: number[] },
  ) {
    return formatResponse(
      this.logger,
      this.userNotificationService.markAllAsViewed(
        req.user.id,
        body.notificationIds,
      ),
      res,
      'All notifications marked as viewed successfully',
    );
  }

  @Get('unviewed-count')
  @ApiOperation({ summary: 'Count unread notifications for the signed-in user.' })
  async getUnviewedCount(@Res() res: Response, @Req() req) {
    return formatResponse(
      this.logger,
      this.userNotificationService.getUnviewedCount(req.user.id),
      res,
      'Unviewed count fetched successfully',
    );
  }
}
