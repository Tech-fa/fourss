import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserNotification } from "./entities/user-notification.entity";
import { PaginatedResponse, PaginationDto } from "../common/pagination";
import { I18nService } from "nestjs-i18n";
import { localizeNotificationData } from "./notification-i18n.util";
@Injectable()
export class UserNotificationService {
  private readonly logger = new Logger(UserNotificationService.name);

  constructor(
    @InjectRepository(UserNotification)
    private readonly userNotificationRepository: Repository<UserNotification>,
    private readonly i18n: I18nService,
  ) {}

  private localize(
    notification: UserNotification,
    lang: string,
  ): UserNotification {
    if (!notification?.data) {
      return notification;
    }
    return {
      ...notification,
      data: localizeNotificationData(this.i18n, notification.data, lang),
    };
  }

  async findAll(
    userId: string,
    pagination: PaginationDto,
    lang = "en",
  ): Promise<PaginatedResponse<UserNotification>> {
    const [data, count] = await this.userNotificationRepository.findAndCount({
      where: {
        user: { id: userId },
      },
      order: {
        createdAt: "DESC",
      },
      take: pagination.perPage,
      skip: (pagination.page - 1) * pagination.perPage,
    });
    return {
      data: data.map((n) => this.localize(n, lang)),
      totalCount: count,
      perPage: pagination.perPage,
      currentPage: pagination.page,
    };
  }

  async findOne(id: number, lang = "en"): Promise<UserNotification | null> {
    const notification = await this.userNotificationRepository.findOne({
      where: {
        id,
      },
      relations: ["notificationConfig"],
    });
    return notification ? this.localize(notification, lang) : null;
  }

  async getUnviewedCount(userId: string): Promise<number> {
    return this.userNotificationRepository.count({
      where: {
        user: { id: userId },
        viewed: false,
      },
    });
  }

  async create(userId: string, data: any): Promise<UserNotification> {
    const notification = this.userNotificationRepository.create({
      user: { id: userId } as any,
      data,
      createdAt: Date.now(),
    });
    return this.userNotificationRepository.save(notification);
  }

  async markAsViewed(
    id: number,
    lang = "en",
  ): Promise<UserNotification | null> {
    const notification = await this.userNotificationRepository.findOne({
      where: { id },
    });
    if (!notification) {
      return null;
    }
    notification.viewed = true;
    await this.userNotificationRepository.save(notification);
    return this.localize(notification, lang);
  }

  async markAllAsViewed(
    userId: string,
    notificationIds: number[],
  ): Promise<void> {
    if (notificationIds.length === 0) {
      return;
    }
    await this.userNotificationRepository.update(notificationIds, {
      viewed: true,
    });
  }

  async delete(id: number): Promise<void> {
    await this.userNotificationRepository.delete({ id });
  }
}
