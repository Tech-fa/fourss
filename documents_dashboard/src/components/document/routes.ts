import DocumentsView from './main.vue'
import ViewDocument from './view-document.vue'
import ViewDocumentContent from './view-document-content.vue'
import CompareVersions from './compare-versions.vue'
import DocumentSettings from './view-settings.vue'
import AddApprovalStrategy from './AddApprovalStrategy.vue'
import AddDocumentAcknowledgemenet from './AddDocumentAcknowledgemenet.vue'
import DocumentForm from './document-form.vue'
import DocumentVersionEditor from './document-version-editor.vue'
import ViewDocumentChecklist from './view-document-checklist.vue'
import DocumentChecklistVersionEditor from './document-checklist-version-editor.vue'
import DocumentChangeRequests from './document-change-requests.vue'
import DocumentDrafts from './document-drafts.vue'
import TemplateForm from './template-form.vue'
import DocumentTemplateDetailView from './document-template-detail-view.vue'
import ChangeRequestPage from './ChangeRequestDialog.vue'
export const documentRoutes = [
    {
        path: '/plan/documents/settings',
        name: 'Document Settings',
        component: DocumentSettings,
        meta: {
            subjects: [
                'document_types',
                'approval_strategies',
                'document_acknowledgements',
                'document_templates'
            ],
            actions: ['read']
        }
    },
    {
        path: '/plan/documents/approval-strategies/add',
        name: 'AddApprovalStrategy',
        component: AddApprovalStrategy,
        meta: {
            subject: 'approval_strategies',
            actions: ['create']
        }
    },
    {
        path: '/plan/documents/approval-strategies/:id/edit',
        name: 'EditApprovalStrategy',
            component: AddApprovalStrategy,
        meta: {
            subject: 'approval_strategies',
            actions: ['update']
        }
    },
    {
        path: '/plan/documents/document-acknowledgements/add',
        name: 'AddDocumentAcknowledgemenet',
        component: AddDocumentAcknowledgemenet,
        meta: {
            subject: 'document_acknowledgements',
            actions: ['create']
        }
    },
    {
        path: '/plan/documents/document-acknowledgements/:id/edit',
        name: 'EditDocumentAcknowledgemenet',
        component: AddDocumentAcknowledgemenet,
        meta: {
            subject: 'document_acknowledgements',
            actions: ['update']
        }
    },
    {
        path: '/plan/documents',
        name: 'Documents',
        component: DocumentsView,
        meta: {
            subject: 'documents',
            actions: ['read']
        }
    },
    {
        path: '/plan/documents/:id/compare',
        name: 'Compare Versions',
        component: CompareVersions,
        meta: {
            subject: 'documents',
            actions: ['read']
        }
    },
    {
        path: '/plan/documents/:id',
        name: 'View Document',
        component: ViewDocument,
        meta: {
            subject: 'documents',
            actions: ['read']
        }
    },
    {
        path: '/plan/documents/:id/content',
        name: 'View Document Content',
        component: ViewDocumentContent,
        meta: {
            subject: 'documents',
            actions: ['read']
        }
    },
    {
        path: '/plan/documents/:id/checklist',
        name: 'View Document Checklist',
        component: ViewDocumentChecklist,
        meta: {
            subject: 'documents',
            actions: ['read']
        }
    },
    {
        path: '/plan/documents/add',
        name: 'Add Document',
        component: DocumentForm,
        meta: {
            subject: 'documents',
            actions: ['create']
        }
    },
    {
        path: '/plan/documents/:id/new-version',
        name: 'New Version',
        component: DocumentVersionEditor,
        meta: {
            subject: 'documents',
            actions: ['update'],
            fullPage: true
        }
    },
    {
        path: '/plan/documents/:id/checklist-version',
        name: 'Checklist Version',
        component: DocumentChecklistVersionEditor,
        meta: {
            subject: 'documents',
            actions: ['update']
        }
    },
    {
        path: '/plan/documents/:id/edit-version',
        name: 'Edit Version',
        component: DocumentVersionEditor,
        meta: {
            subject: 'documents',
            actions: ['update'],
            fullPage: true
        }
    },
    {
        path: '/plan/documents/:id/edit',
        name: 'Edit Document',
        component: DocumentForm,
        meta: {
            subject: 'documents',
            actions: ['update']
        }
    },
    {
        path: '/plan/documents/drafts',
        name: 'Document Drafts',
        component: DocumentDrafts,
        meta: {
            subject: 'documents',
            actions: ['create','update']
        }
    },
    {
        path: '/plan/documents/drafts/:draftId/edit',
        name: 'Edit Document Draft',
        component: DocumentForm,
        meta: {
            subject: 'documents',
            actions: ['update']
        }
    },
    {
        path: '/plan/documents/change-requests',
        name: 'Document Change Requests',
        component: DocumentChangeRequests,
        meta: {
            subject: 'change_requests',
            actions: ['read']
        }
    },
    {
        path: '/plan/documents/change-requests/create',
        name: 'Create Document Change Request',
        component: ChangeRequestPage,
        meta: {
            subject: 'change_requests',
            actions: ['create']
        }
    },
    {
        path: '/plan/documents/change-requests/:changeRequestId',
        name: 'View Document Change Request',
        component: ChangeRequestPage,
        meta: {
            subject: 'change_requests',
            actions: ['read']
        }
    },
    {
        path: '/plan/documents/settings/templates/add',
        name: 'Add Template',
        component: TemplateForm,
        meta: {
            subject: 'document_templates',
            actions: ['create']
        }
    },
    {
        path: '/plan/documents/settings/templates/:id',
        name: 'View Template',
        component: DocumentTemplateDetailView,
        meta: {
            subject: 'document_templates',
            actions: ['read']
        }
    },
    {
        path: '/plan/documents/settings/templates/:id/edit',
        name: 'Edit Template',
        component: TemplateForm,
        meta: {
            subject: 'document_templates',
            actions: ['update']
        }
    },
    {
        path: '/plan/documents/settings/templates/:id/copy',
        name: 'Copy Template',
        component: TemplateForm,
        meta: {
            subject: 'document_templates',
            actions: ['create']
        }
    },
]
