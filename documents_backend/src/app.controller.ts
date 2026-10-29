import { Controller, Get, Logger, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { formatResponse } from './util/helper-util';
import { Public } from './util/constants';

@ApiTags('Health')
@Controller('health')
export class AppController {
  constructor(private readonly appService: AppService) {}
  private readonly logger = new Logger(AppController.name);

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check. No authentication required.' })
  getHello(@Res() res) {
    return formatResponse(
      this.logger,
      this.appService.getHello(),
      res,
      'health check',
    );
  }
}
