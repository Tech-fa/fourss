import { NotificationInfoParam, NotificationInfoResponse } from './dto';

export abstract class NotificationInfo {
  abstract getNotificationInfo(
    data: NotificationInfoParam,
  ): Promise<NotificationInfoResponse>;
}
