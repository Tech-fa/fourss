import AuditSettings from './audit-settings.vue'
import AuditMainView from './main.vue'
import AddAuditProgramForm from './add-audit-program-form.vue'
import AddAuditChecklist from './add-audit-checklist.vue'
import AddAuditActivityType from './add-audit-activity-type.vue'

import ScheduleAuditInstance from './schedule-audit-instance.vue'
import ProgramDetails from './program-details.vue'
import AuditInstance from './audit-instance.vue'
import AddAuditFinding from './add-audit-finding.vue'
import AuditReportGenerated from './audit-report-generated.vue'
export const auditRoutes = [
    {
        name: 'Audit Settings',
        path: '/check/audits/settings',
        meta: {
            subjects: [
                'audit_types',
                'audit_roles',
                'audit_personnels',
                'audit_checklist_definitions'
            ],
            actions: ['read'],
            purpose: 'Set up audit types, roles, personnel, checklist definitions, and programs.'
        },
        component: AuditSettings
    },
    {
        name: 'Audit Main View',
        path: '/check/audits',
        meta: {
            subject: 'audit_programs',
            actions: ['read'],
            purpose: 'List audit programs and the audits scheduled against them.'
        },
        component: AuditMainView
    },
    {
        name: 'Add Audit Program',
        path: '/check/audits/add',
        meta: {
            subject: 'audit_programs',
            actions: ['create'],
            purpose: 'Create an audit program and its schedule entries. The user saves the program.'
        },
        component: AddAuditProgramForm
    },
    {
        name: 'Add Checklist',
        path: '/audits/checklist-definitions/add-checklist',
        meta: {
            subject: 'audit_checklist_definitions',
            actions: ['create'],
            purpose: 'Create an audit checklist. Publish it before assigning it to an audit.'
        },
        component: AddAuditChecklist
    },
    {
        name: 'Edit Checklist',
        path: '/check/audits/checklist-definitions/:id/edit',
        meta: {
            subject: 'audit_checklist_definitions',
            actions: ['update'],
            purpose: 'Change an audit checklist, add its sections and questions, and publish it.'
        },
        component: AddAuditChecklist
    },
    {
        name: 'audit-activity-type-add',
        path: '/check/audits/activity-types/add',
        meta: {
            subject: 'audit_activity_types',
            actions: ['create'],
            purpose: 'Create an audit type used by programs and checklists.'
        },
        component: AddAuditActivityType
    },
    {
        name: 'audit-activity-type-edit',
        path: '/check/audits/activity-types/:id/edit',
        meta: {
            subject: 'audit_activity_types',
            actions: ['update'],
            purpose: 'Change an audit type.'
        },
        component: AddAuditActivityType
    },
    {
        name: 'Audit Instance',
        path: '/check/audits/:id/instances/:instanceId',
        meta: {
            subject: 'audit_instances',
            actions: ['read'],
            purpose: 'Read one audit, including its checklist, findings, and reports. To find evidence, search documents and records already in this system before opening an external connection.'
        },
        component: AuditInstance
    },
    {
        name: 'Program Details',
        path: '/check/audits/:id',
        meta: {
            subject: 'audit_programs',
            actions: ['read'],
            purpose: 'Read one audit program, its schedule, and its audits.'
        },
        component: ProgramDetails
    },
    {
        name: 'Schedule Audit Instance',
        path: '/check/audits/instances/add',
        meta: {
            subject: 'audit_instances',
            actions: ['create'],
            purpose: 'Schedule an audit instance on a program, with a checklist and a team. The user saves it.'
        },
        component: ScheduleAuditInstance
    },
    {
        name: 'Edit Audit Instance',
        path: '/check/audits/instances/:instanceId/edit',
        meta: {
            subject: 'audit_instances',
            actions: ['update'],
            purpose: 'Change a scheduled audit, its checklist, and its team. The user saves it.'
        },
        component: ScheduleAuditInstance
    },
    {
        name: 'Edit Audit Program',
        path: '/check/audits/:id/edit',
        meta: {
            subject: 'audit_programs',
            actions: ['update'],
            purpose: 'Change an audit program and its schedule entries. The user saves the program.'
        },
        component: AddAuditProgramForm
    },
    {
        name : 'Add Audit Finding',
        path:'/check/audits/:id/:instanceId/questions/:questionId/findings/add',
        meta: {
            subject: 'audit_findings',
            actions: ['create'],
            purpose: 'Record a finding on a checklist question. The user saves it.'
        },
        component: AddAuditFinding
    },
    {
        name : 'Edit Audit Finding',
        path:'/check/audits/:id/:instanceId/questions/:questionId/findings/:findingId/edit',
        meta: {
            subject: 'audit_findings',
            actions: ['update'],
            purpose: 'Change a finding on a checklist question. The user saves it.'
        },
        component: AddAuditFinding
    },
    {
        name : 'Add General Finding',
        path:'/check/audits/:id/:instanceId/general/add',
        meta: {
            subject: 'audit_findings',
            actions: ['create'],
            purpose: 'Record a finding that is not tied to one question. The user saves it.'
        },
        component: AddAuditFinding
    },
    {
        name : 'Edit General Finding',
        path:'/check/audits/:id/:instanceId/general/:findingId/edit',
        meta: {
            subject: 'audit_findings',
            actions: ['update'],
            purpose: 'Change a general finding. The user saves it.'
        },
        component: AddAuditFinding
    },
    {
        name : 'Audit Report Generated',
        path:'/check/audits/:id/instances/:instanceId/report',
        meta: {
            subject: 'audit_instances',
            actions: ['generate_report'],
            purpose: 'Read a generated audit report.'
        },
        component: AuditReportGenerated
    },
]
