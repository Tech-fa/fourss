export enum RecipientType {
  ALL_USERS_WITH_PERMISSION = 'all_users_with_permission',
  SELECTED_USERS = 'selected_users',
}

export interface UpdateNotificationConfig {
  recepientType: RecipientType;
  selectedUsers: string[];
  excludeAppAdmins?: boolean;
}
