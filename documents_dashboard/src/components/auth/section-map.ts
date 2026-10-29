type PdcaSectionKey = 'plan' | 'do' | 'check' | 'act'

export const sectionOrder: PdcaSectionKey[] = ['plan', 'do', 'check', 'act']

export const sectionMap: Record<PdcaSectionKey, string[]> = {
    plan: [
        'approval_strategies',
        'document_types',
        'document_templates',
        'change_requests',
        'documents',
        'records',
        'risk_assessments',
        'risk_settings',
        'risk_operational_controls',
        'risk_activities',
        'risk_factors',
        'risk_ranges',
        'risks',
        'risk_management',
    ],
    do: [
        'knowledge_groups',
        'knowledge_contents',
        'knowledge_categories',
        'knowledge',
        'competencies',
        'evaluation_types',
        'evaluations',
        'effectiveness',
        'trainings',
        'training_definitions',
        'training_rosters',
        'training_post_evaluation_actions',
        'training_users',
        'training_modules'
    ],
    check: [
        'audit_personnels',
        'audit_roles',
        'audit_activity_types',
        'audit_criteria',
        'audit_document_types',
        'audit_programs',
        'audit_instances',
        'audit_checklist_definitions',
        'audit_checklist_responses',
        'audit_findings',
        'audits',
        'assets',
        'survey_categories',
        'survey_instances',
        'survey_recipients',
        'survey_templates',
        'surveys',
        'pi_raw_data',
        'pi_data_import_logs',
        'pi_group',
        'pi_raw_data_group',
        'performance_indicators',
        'management_review_immediate_actions',
        'management-review',
        'provider_types',
        'selection_criterias',
        'evaluation_criterias',
        'supporting_documents',
        'provider_evaluations',
        'external-providers'
    ],
    act: [
        'non_conformity_categories',
        'non_conformity_category_custom_fields',
        'non_conformity_custom_field_values',
        'non_conformity_types',
        'non_conformity_risk_levels',
        'non_conformity_representatives',
        'non_conformity_corrective_actions',
        'ca_change_requests',
        'immediate_actions',
        'ca_effectiveness_evidences',
        'root_cause_analyses',
        'investigations',
        'investigation_evidence',
        'immediate_action_evidence',
        'rca_five_why_steps',
        'non_conformities',
        'ofi_priorities',
        'ofi_immediate_actions',
        'opportunities_for_improvement',
        'universal_controls',
        'universal_control_immediate_actions'
    ]
}

interface UserPermission {
    subject: string
    action: string
}

const hasReadPermission = (
    permissions: UserPermission[],
    subject: string
) =>
    permissions.some(
        (permission) =>
            (permission.subject === subject || permission.subject === 'all') &&
            (permission.action === 'read' || permission.action === 'manage')
    )

export const getFirstSectionDashboardRoute = (
    _permissions: UserPermission[]
): string | null => {
    return '/'
}
