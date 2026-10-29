import { Injectable, Logger } from "@nestjs/common";
import { RabbitSubscribe } from "@golevelup/nestjs-rabbitmq";
import { Events, getListening } from "../../queue/queue-constants";
import { Public } from "../../util/constants";
import { type NotificationHandlerDTO } from "./dto";
import { Inject } from "@nestjs/common";
import { SERVICE_MAP } from "../../service-mapping/service.map";
import { permissions } from "../../permissions/permissions";
import { EmailType } from "../../common/dto";
import { QueuePublisher } from "../../queue/queue.publisher";
import { UserNotificationService } from "../user-notification.service";
import { UsersService } from "../../user/user.service";
import { NotificationInfo } from "./notification.interface";
import { I18nService } from "nestjs-i18n";
import {
  buildNotificationEmailSubject,
  buildNotificationTitle,
  translateModuleLabel,
  translatePhrase,
} from "../notification-i18n.util";

@Injectable()
export class NotificationHandlerService {
  private readonly logger = new Logger(NotificationHandlerService.name);
  constructor(
    @Inject(SERVICE_MAP) private readonly serviceMap: Record<string, any>,
    private readonly queuePublisher: QueuePublisher,
    private readonly userNotificationService: UserNotificationService,
    private readonly userService: UsersService,
    private readonly i18n: I18nService,
  ) {}

  @RabbitSubscribe(getListening(Events.NOTIFICATION))
  @Public()
  async handleNotification(data: NotificationHandlerDTO) {
    try {
      const { subject, actions, method, entityId, userId, clientId } = data;
      if (!subject) {
        return;
      }
      this.logger.log(
        `Received notification for subject: ${subject}, actions: ${actions}, method: ${method}, entityId: ${entityId}, userId: ${userId}, clientId: ${clientId}`,
      );

      const action = actions?.[0];

      const module = Object.values(permissions).find(
        (p) => p.subject === subject,
      );
      if (!module) {
        return;
      }
      const service = this.serviceMap[module.service_tag];
      if (!service?.getNotificationInfo) {
        return;
      }
      const info = await (service as NotificationInfo).getNotificationInfo({
        entityId,
        clientId,
        subject,
        method,
        userId,
      });
      if (info.skip) {
        return;
      }
      const path = (module.entity_route || module.base_route).replace(
        "@@id@@",
        info.route || entityId,
      );
      const localeMap = await this.userService.findLocalesByIds(
        info.recipients.map((recipient) => recipient.user?.id).filter(Boolean),
      );

      for (const { user, message } of info.recipients) {
        if (!user?.id || !user.email || !message) {
          continue;
        }
        const lang = localeMap[user.id] || user.locale || "en";
        const translatedMessage = translatePhrase(this.i18n, message, lang);
        const moduleLabel = translateModuleLabel(
          this.i18n,
          module.subject,
          module.label,
          lang,
        );
        const title = buildNotificationTitle(this.i18n, moduleLabel, lang);
        const notification = await this.userNotificationService.create(
          user.id,
          {
            link: path,
            message: translatedMessage,
            title,
            subject: module.subject,
            label: module.label,
          },
        );
        if (!notification) {
          continue;
        }
        this.queuePublisher.sendEmail({
          to: user.email,
          type: EmailType.NOTIFICATION,
          replaceString: {
            name: `${user.fname} ${user.lname}`,
            message: translatedMessage,
            link: `${process.env.FRONTEND_URL}/${path}`,
          },
          subject: buildNotificationEmailSubject(this.i18n, moduleLabel, lang),
        });
      }
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
  }
}
