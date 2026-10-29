import { User } from '../../user/user.entity';

export interface NotificationHandlerDTO {
  subject: string;
  actions: string[];
  method: string;
  clientId: string;
  userId: string;
  entityId: string;
}
export interface NotificationInfoParam {
  entityId: string;
  clientId: string;
  subject: string;
  method: string;
  userId: string;
}

export interface NotificationRecipient {
  user: User;
  message: string;
}

export interface NotificationInfoResponse {
  skip: boolean;
  route: string;
  recipients: NotificationRecipient[];
}
