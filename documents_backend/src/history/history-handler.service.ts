import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Events, getListening } from '../queue/queue-constants';
import { Public } from '../util/constants';
import { HistoryService } from './history.service';

@Injectable()
export class HistoryHandlerService {
  private readonly logger = new Logger(HistoryHandlerService.name);

  constructor(
    private readonly historyService: HistoryService,
    private readonly dataSource: DataSource,
  ) {}

  @RabbitSubscribe(getListening(Events.HISTORY_RECORD))
  @Public()
  async handleHistoryRecord(data: {
    entityName: string;
    entityId: string;
    oldValues: any;
    newValues: any;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    user: any;
  }) {
    try {
      const entityMetadata = this.dataSource.entityMetadatas.find(
        (metadata) => metadata.targetName === data.entityName,
      );
      
      if (!entityMetadata) {
        this.logger.warn(`Entity metadata not found for: ${data.entityName}`);
        return;
      }

      await this.historyService.recordEntityChanges(
        entityMetadata.target,
        data.entityName,
        data.entityId,
        data.oldValues,
        data.newValues,
        data.action,
        data.user,
      );
    } catch (error) {
      this.logger.error('Failed to record history:', error);
      throw error;
    }
  }
}
