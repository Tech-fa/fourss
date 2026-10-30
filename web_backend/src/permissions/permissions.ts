export enum PermissionEnum {
  CREATE = "create",
  READ = "read",
  UPDATE = "update",
  DELETE = "delete",
  MANAGE = "manage",
}

export const actions = ["create", "read", "update", "delete"];

export const teamsPermission = {
  subject: "teams",
  label: "Team",
  actions: actions,
  service_tag: "teams",
  base_route: "admin/teams",
};

export const permissionPermission = {
  subject: "permissions",
  label: "Permission",
  actions: actions,
  service_tag: "permission",
  base_route: "admin/permissions/roles",
  entity_route: "admin/permissions/roles/@@id@@",
};
export const userPermission = {
  subject: "users",
  label: "User",
  actions: actions,
  service_tag: "user",
  base_route: "admin/users",
  entity_route: "admin/users/@@id@@",
};

export const approvalStrategyPermission = {
  subject: "approval_strategies",
  label: "Approval Strategy",
  actions: actions,
  service_tag: "documents",
  base_route: "plan/documents/settings",
  entity_route: "plan/documents/approval-strategies/@@id@@/edit",
  entityName: "ApprovalStrategy",
};

export const documentAcknowledgementPermission = {
  subject: "document_acknowledgements",
  label: "Document Acknowledgement",
  actions: actions,
  service_tag: "documents",
  base_route: "plan/documents/settings",
  entity_route: "plan/documents/document-acknowledgements/@@id@@/edit",
  entityName: "DocumentAcknowledgement",
};

export const DocumentTypePermission = {
  subject: "document_types",
  label: "Document Type",
  actions: actions,
  service_tag: "documents",
  base_route: "plan/documents/settings",
};

export const DocumentTemplatePermission = {
  subject: "document_templates",
  label: "Document Template",
  actions: actions,
  service_tag: "documents",
  base_route: "plan/documents/settings?tab=2",
  entityName: "DocumentTemplate",
  entity_route: "plan/documents/settings/templates/@@id@@",
};

export const changeRequestPermission = {
  subject: "change_requests",
  label: "Change Request",
  actions: actions,
  service_tag: "documents",
  base_route: "plan/documents/change-requests",
  entityName: "ChangeRequest",
};

export const DocumentPermission = {
  subject: "documents",
  label: "Document",
  actions: [...actions, "override_approve"],
  submodules: [
    DocumentTypePermission,
    approvalStrategyPermission,
    documentAcknowledgementPermission,
    changeRequestPermission,
    DocumentTemplatePermission,
  ],
  service_tag: "documents",
  base_route: "plan/documents",
  entity_route: "plan/documents/@@id@@",
  entityName: "Document",
  module_included: true,
  management_review_data_included: true,
};

export const standardsPermission = {
  subject: "standards",
  label: "Standard",
  actions: actions,
  service_tag: "standards",
  base_route: "plan/standards",
  entity_route: "plan/standards/@@id@@",
  entityName: "StandardImplementation",
  module_included: true,
};

interface PermissionTree {
  subject: string;
  label: string;
  actions: string[];
  ownerOnlyActions?: string[];
  submodules?: PermissionTree[];
  service_tag: string;
  base_route: string;
  entity_route?: string;
  entityName?: string;
  memberActions?: string[];
  module_included?: boolean;
  management_review_data_included?: boolean;
  eventTypes?: string[];
  user_task_included?: boolean;
}

export const permissions: {
  [key: string]: PermissionTree;
} = {
  teamsPermission,
  permissionPermission,
  userPermission,
  DocumentTypePermission,
  DocumentPermission,
  DocumentTemplatePermission,
  approvalStrategyPermission,
  documentAcknowledgementPermission,
  changeRequestPermission,
  standardsPermission,
};

export const permissionTree: {
  [key: string]: PermissionTree;
} = {
  userPermission,
  permissionPermission,
  DocumentPermission,
  teamsPermission,
  standardsPermission,
};

export const processOwnerModules: PermissionTree[] = [
  DocumentPermission,
  standardsPermission,
];

export const defaultRoles = [
  {
    name: "Admin",
    permissions: [
      {
        subject: "all",
        action: "manage",
      },
    ],
    description: "Admin role gives access to all modules and features",
  },
  {
    name: "Process Owner",
    permissions: processOwnerModules
      .flatMap((module) => [module, ...(module.submodules ?? [])])
      .flatMap((permission) =>
        permission.actions.map((action) => ({
          subject: permission.subject,
          action,
        })),
      ),
    description:
      "Process Owner role gives access to documents and related document settings",
  },
];
