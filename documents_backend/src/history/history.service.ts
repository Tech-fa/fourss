import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { History } from './history.entity';
import { UserRequest } from '../permissions/dto';
import { excludedFields } from './track-changes.decorator';
import { shouldTrackEntity } from './track-changes.decorator';
import { PermissionService } from '../permissions/permission.service';
import { PaginatedResponse, PaginationDto } from '../common/pagination';
import { permissions } from '../permissions/permissions';
@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(History)
    private historyRepository: Repository<History>,
    private permissionService: PermissionService,
  ) {}

  /**
   * Record a change to an entity field
   */
  async recordChange(
    entityType: string,
    entityId: string,
    changes: any,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    user: UserRequest,
  ): Promise<History | undefined> {
    // Format values as strings if they are objects
    if (!user) {
      console.log('No user found');
      return;
    }
    const history = this.historyRepository.create({
      entityType,
      entityId,
      changes,
      action,
      user: { id: user.id },
      createdAt: Date.now(),
    });

    return this.historyRepository.save(history);
  }

  /**
   * Record changes for an entity based on old and new values
   */
  async recordEntityChanges(
    entityClass: any,
    entityName: string,
    entityId: string,
    oldValues: any,
    newValues: any,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    user: UserRequest,
  ): Promise<void> {
    // Skip if entity is not tracked
    if (!shouldTrackEntity(entityClass)) {
      return;
    }
    const fieldsToExclude = excludedFields(entityClass);

    // Determine which fields to track
    const fieldNames = Object.keys(newValues || oldValues || {}).filter(
      (field) => !fieldsToExclude.includes(field),
    );
    const changes = {};
    // For creation, we record all fields with their initial values
    if (action === 'CREATE') {
      for (const field of fieldNames) {
        if (newValues?.[field] !== undefined) {
          changes[field] = {
            oldValue: null,
            newValue: newValues[field],
          };
        }
      }
    }

    // For deletion, we record all fields with their final values
    if (action === 'DELETE') {
      for (const field of fieldNames) {
        if (oldValues?.[field] !== undefined) {
          changes[field] = {
            oldValue: oldValues[field],
            newValue: null,
          };
        }
      }
    }

    // For updates, we only record fields that changed
    for (const field of fieldNames) {
      const oldValue = oldValues?.[field];
      const newValue = newValues?.[field];

      // Skip if the field didn't change
      if (oldValue == newValue) {
        continue;
      }

      changes[field] = {
        oldValue,
        newValue,
      };
    }
    if (Object.keys(changes).length > 0) {
      await this.recordChange(entityName, entityId, changes, action, user);
    }
  }

  /**
   * Get changelog history for a specific entity with pagination
   */
  async getEntityChangelog(
    user: UserRequest,
    entityType: string,
    entityId: string,
    paginationDto: PaginationDto = { page: 1, perPage: 10 },
  ): Promise<PaginatedResponse<History>> {
    if (
      await this.permissionService.hasPermissions(user, entityType, ['read'])
    ) {
      const { page, perPage } = paginationDto;
      const skip = (page - 1) * perPage;
      entityType = Object.values(permissions).find(
        (p) => p.subject === entityType,
      )?.entityName || "";
      const qb = this.historyRepository
        .createQueryBuilder('history')
        .leftJoinAndSelect('history.user', 'user')
        .where('history.entityType = :entityType', { entityType })
        .andWhere('history.entityId = :entityId', { entityId })
        .orderBy('history.createdAt', 'DESC');

      // Get total count before pagination
      const total = await qb.getCount();

      // Apply pagination
      const data = await qb.skip(skip).take(perPage).getMany();

      return {
        data,
        currentPage: page,
        totalCount: total,
        perPage,
      };
    }

    return {
      data: [],
      currentPage: paginationDto.page,
      totalCount: 0,
      perPage: paginationDto.perPage,
    };
  }
}
