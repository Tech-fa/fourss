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

export const remindersPermission = {
  subject: "reminders",
  label: "Reminders",
  actions: actions,
  service_tag: "reminders",
  base_route: "admin/reminders",
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
  actions: [...actions, "override_approve","read_text"],
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

export const playgroundsPermission = {
  subject: "playgrounds",
  label: "Playground",
  actions: actions,
  service_tag: "playgrounds",
  base_route: "plan/playground",
  entityName: "Playground",
  module_included: true,
};

export const integrationsPermission = {
  subject: "integrations",
  label: "Integration",
  actions: actions,
  service_tag: "integrations",
  base_route: "plan/integrations",
  entity_route: "plan/integrations/@@id@@",
  entityName: "Integration",
  module_included: true,
};

export const nonConformityTypePermission = {
  subject: "non_conformity_types",
  label: "Non-Conformity Type",
  actions: actions,
  service_tag: "non_conformities",
  base_route: "act/non-conformities/types",
};

export const nonConformityRiskLevelPermission = {
  subject: "non_conformity_risk_levels",
  label: "Non-Conformity Risk Level",
  actions: actions,
  service_tag: "non_conformities",
  base_route: "act/non-conformities/risk-levels",
};

export const nonConformityRepresentativePermission = {
  subject: "non_conformity_representatives",
  label: "Non-Conformity Representative",
  actions: actions,
  service_tag: "non_conformities",
  base_route: "act/non-conformities/representatives",
};

export const nonConformityCorrectiveActionPermission = {
  subject: "non_conformity_corrective_actions",
  label: "Corrective Action",
  actions: actions,
  service_tag: "non_conformities",
  base_route: "act/non-conformities",
};

export const caChangeRequestPermission = {
  subject: "ca_change_requests",
  label: "Corrective Action Change Request",
  actions: actions,
  service_tag: "non_conformities",
  base_route: "act/non-conformities",
};

export const immediateActionPermission = {
  subject: "immediate_actions",
  label: "Immediate Action",
  actions: actions,
  service_tag: "non_conformities",
  base_route: "act/non-conformities",
  entityName: "ImmediateAction",
};

export const immediateActionEvidencePermission = {
  subject: "immediate_action_evidence",
  label: "Immediate Action Evidence",
  actions: actions,
  service_tag: "non_conformities",
  base_route: "act/non-conformities",
};

export const rootCauseAnalysisPermission = {
  subject: "root_cause_analyses",
  label: "Root Cause Analysis",
  actions: actions,
  service_tag: "non_conformities",
  base_route: "act/non-conformities",
};

export const investigationPermission = {
  subject: "investigations",
  label: "Investigation",
  actions: actions,
  service_tag: "non_conformities",
  base_route: "act/non-conformities",
};

export const investigationEvidencePermission = {
  subject: "investigation_evidence",
  label: "Investigation Evidence",
  actions: actions,
  service_tag: "non_conformities",
  base_route: "act/non-conformities",
};

export const caEffectivenessEvidencePermission = {
  subject: "ca_effectiveness_evidence",
  label: "Corrective Action Effectiveness Evidence",
  actions: actions,
  service_tag: "non_conformities",
  base_route: "act/non-conformities",
};

export const rcaFiveWhyStepPermission = {
  subject: "rca_five_why_steps",
  label: "Five Whys",
  actions: actions,
  service_tag: "non_conformities",
  base_route: "act/non-conformities",
};

export const auditRolePermission = {
  subject: "audit_roles",
  label: "Audit Role",
  actions: actions,
  service_tag: "audits",
  base_route: "check/audits/settings",
};

export const auditPersonnelPermission = {
  subject: "audit_personnels",
  label: "Audit Personnel",
  actions: actions,
  service_tag: "audits",
  base_route: "check/audits/settings",
};

export const auditDocumentTypePermission = {
  subject: "audit_document_types",
  label: "Audit Document Type",
  actions: actions,
  service_tag: "audits",
  base_route: "check/audits/settings",
};

export const auditActivityTypePermission = {
  subject: "audit_activity_types",
  label: "Audit Activity Type",
  actions: actions,
  service_tag: "audits",
  base_route: "check/audits/settings",
};

export const auditChecklistDefinitionPermission = {
  subject: "audit_checklist_definitions",
  label: "Audit Checklist",
  actions: actions,
  service_tag: "audits",
  base_route: "check/audits/settings",
};

export const auditInstancePermission = {
  subject: "audit_instances",
  label: "Audit Instance",
  actions: actions,
  service_tag: "audits",
  base_route: "check/audits",
  entity_route: "check/audits/@@id@@",
  entityName: "AuditInstance",
};

export const auditChecklistResponsePermission = {
  subject: "audit_checklist_responses",
  label: "Audit Checklist Response",
  actions: actions,
  service_tag: "audits",
  base_route: "check/audits",
  entity_route: "check/audits/@@id@@",
};

export const auditFindingPermission = {
  subject: "audit_findings",
  label: "Audit Finding",
  actions: actions,
  service_tag: "audits",
  base_route: "check/audits",
  entity_route: "check/audits/@@id@@",
  entityName: "AuditFinding",
};

export const auditProgramPermission = {
  subject: "audit_programs",
  label: "Audit Program",
  actions: actions,
  service_tag: "audits",
  base_route: "check/audits",
  entity_route: "check/audits/@@id@@",
  entityName: "AuditProgram",
  module_included: true,
  submodules: [
    auditRolePermission,
    auditPersonnelPermission,
    auditDocumentTypePermission,
    auditActivityTypePermission,
    auditChecklistDefinitionPermission,
    auditInstancePermission,
    auditChecklistResponsePermission,
    auditFindingPermission,
  ],
};

export const nonConformityPermission = {
  subject: "non_conformities",
  label: "Non-Conformity",
  actions: actions,
  service_tag: "non_conformities",
  base_route: "act/non-conformities",
  entity_route: "act/non-conformities/@@id@@",
  entityName: "NonConformity",
  module_included: true,
  submodules: [
    nonConformityTypePermission,
    nonConformityRiskLevelPermission,
    nonConformityRepresentativePermission,
    nonConformityCorrectiveActionPermission,
    caChangeRequestPermission,
    immediateActionPermission,
    immediateActionEvidencePermission,
    rootCauseAnalysisPermission,
    investigationPermission,
    investigationEvidencePermission,
    caEffectivenessEvidencePermission,
    rcaFiveWhyStepPermission,
  ],
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
  remindersPermission,
  DocumentTypePermission,
  DocumentPermission,
  DocumentTemplatePermission,
  approvalStrategyPermission,
  documentAcknowledgementPermission,
  changeRequestPermission,
  standardsPermission,
  playgroundsPermission,
  integrationsPermission,
  auditProgramPermission,
  auditRolePermission,
  auditPersonnelPermission,
  auditDocumentTypePermission,
  auditActivityTypePermission,
  auditChecklistDefinitionPermission,
  auditInstancePermission,
  auditChecklistResponsePermission,
  auditFindingPermission,
  nonConformityPermission,
  nonConformityTypePermission,
  nonConformityRiskLevelPermission,
  nonConformityRepresentativePermission,
  nonConformityCorrectiveActionPermission,
  caChangeRequestPermission,
  immediateActionPermission,
  immediateActionEvidencePermission,
  rootCauseAnalysisPermission,
  investigationPermission,
  investigationEvidencePermission,
  caEffectivenessEvidencePermission,
  rcaFiveWhyStepPermission,
};

export const permissionTree: {
  [key: string]: PermissionTree;
} = {
  userPermission,
  permissionPermission,
  remindersPermission,
  DocumentPermission,
  teamsPermission,
  standardsPermission,
  playgroundsPermission,
  integrationsPermission,
  auditProgramPermission,
  nonConformityPermission,
};

export const processOwnerModules: PermissionTree[] = [
  DocumentPermission,
  standardsPermission,
  playgroundsPermission,
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
    name: "Observer",
    permissions: Object.values(permissions)
      .filter(
        (permission) =>
          permission.subject !== userPermission.subject &&
          permission.actions.includes("read"),
      )
      .map((permission) => ({
        subject: permission.subject,
        action: "read",
      })),
    description:
      "Observer role gives read access to every module except users",
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
