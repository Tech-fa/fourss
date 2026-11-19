import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { hasPermission } from '../authentication/permission.decorator';
import { remindersPermission } from '../permissions/permissions';
import { formatResponse } from '../util/helper-util';
import { SaveReminderRuleDto } from './reminder.dto';
import { ReminderService } from './reminder.service';

@ApiTags('Reminders')
@ApiBearerAuth()
@Controller('reminders')
export class ReminderController {
  private readonly logger = new Logger(ReminderController.name);

  constructor(private readonly reminders: ReminderService) {}

  @Get('catalog')
  @ApiOperation({ summary: 'List reminder record types, dates, people, and statuses.' })
  @hasPermission({ subject: remindersPermission.subject, actions: ['read'] })
  catalog(@Res() res: Response) {
    return formatResponse(
      this.logger,
      Promise.resolve(this.reminders.getCatalog()),
      res,
      'GET reminders/catalog',
    );
  }

  @Get('rules')
  @ApiOperation({ summary: 'List reminder rules.' })
  @hasPermission({ subject: remindersPermission.subject, actions: ['read'] })
  list(@Res() res: Response) {
    return formatResponse(
      this.logger,
      this.reminders.list(),
      res,
      'GET reminders/rules',
    );
  }

  @Post('rules')
  @ApiOperation({ summary: 'Create a reminder rule.' })
  @hasPermission({ subject: remindersPermission.subject, actions: ['create'] })
  create(@Body() dto: SaveReminderRuleDto, @Res() res: Response) {
    return formatResponse(
      this.logger,
      this.reminders.create(dto),
      res,
      'POST reminders/rules',
    );
  }

  @Put('rules/:id')
  @ApiOperation({ summary: 'Update a reminder rule.' })
  @hasPermission({ subject: remindersPermission.subject, actions: ['update'] })
  update(
    @Param('id') id: string,
    @Body() dto: SaveReminderRuleDto,
    @Res() res: Response,
  ) {
    return formatResponse(
      this.logger,
      this.reminders.update(id, dto),
      res,
      'PUT reminders/rules/:id',
    );
  }

  @Delete('rules/:id')
  @ApiOperation({ summary: 'Delete a reminder rule.' })
  @hasPermission({ subject: remindersPermission.subject, actions: ['delete'] })
  remove(@Param('id') id: string, @Res() res: Response) {
    return formatResponse(
      this.logger,
      this.reminders.remove(id),
      res,
      'DELETE reminders/rules/:id',
    );
  }
}
