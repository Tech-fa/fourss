import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import {
  Connection,
  EntitySubscriberInterface,
  UpdateEvent,
  InsertEvent,
  RemoveEvent,
} from 'typeorm';
import { shouldTrackEntity } from './track-changes.decorator';
import { HistoryService } from './history.service';
import { RequestContextService } from './request-context.service';

@Injectable()
export class HistorySubscriber implements EntitySubscriberInterface {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly historyService: HistoryService,
    private readonly requestContextService: RequestContextService,
  ) {
    connection.subscribers.push(this);
  }

  /**
   * Check if this subscriber applies to the given entity
   */
  listenTo() {
    return Object;
  }

  /**
   * Called after entity insertion
   */
  async afterInsert(event: InsertEvent<any>): Promise<void> {
    if (!shouldTrackEntity(event.metadata)) {
      return;
    }
    const entityName = event.metadata.targetName;
    const entityId = event.entity.id?.toString();

    if (!entityId) {
      return;
    }

    const user = this.requestContextService.getUser();
    if (!user) {
      return;
    }

    await this.historyService.recordEntityChanges(
      event.metadata.target,
      entityName,
      entityId,
      null,
      event.entity,
      'CREATE',
      user,
    );
  }

  /**
   * Called after entity update
   */
  async afterUpdate(event: UpdateEvent<any>): Promise<void> {
    if (!shouldTrackEntity(event.metadata.target)) {
      return;
    }
    const entityName = event.metadata.targetName;
    const entityId = event.entity?.id?.toString();
    if (!entityId) {
      return;
    }
    const user = this.requestContextService.getUser();
    if (!user) {
      return;
    }

    // Get the previous state (only works if it's available)
    const oldValues = { ...event.databaseEntity };
    const newValues = { ...event.entity };

    await this.historyService.recordEntityChanges(
      event.metadata.target,
      entityName,
      entityId,
      oldValues,
      newValues,
      'UPDATE',
      user,
    );
  }

  /**
   * Called before entity removal
   */
  async beforeRemove(event: RemoveEvent<any>): Promise<void> {
    if (!shouldTrackEntity(event.metadata.target)) {
      return;
    }

    const entityName = event.metadata.targetName;
    const entityId = event.entityId?.toString() || event.entity?.id?.toString();

    if (!entityId) {
      return;
    }

    const user = this.requestContextService.getUser();
    if (!user) {
      return;
    }

    await this.historyService.recordEntityChanges(
      event.metadata.target,
      entityName,
      entityId,
      event.entity,
      null,
      'DELETE',
      user,
    );
  }
}
