export const documentRoutes = [
    {
        path: '/plan/documents/settings',
        name: 'Document Settings',
        component: () => import('./view-settings.vue'),
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
        component: () => import('./AddApprovalStrategy.vue'),
        meta: {
            subject: 'approval_strategies',
            actions: ['create']
        }
    },
    {
        path: '/plan/documents/approval-strategies/:id/edit',
        name: 'EditApprovalStrategy',
            component: () => import('./AddApprovalStrategy.vue'),
        meta: {
            subject: 'approval_strategies',
            actions: ['update']
        }
    },
    {
        path: '/plan/documents/document-acknowledgements/add',
        name: 'AddDocumentAcknowledgemenet',
        component: () => import('./AddDocumentAcknowledgemenet.vue'),
        meta: {
            subject: 'document_acknowledgements',
            actions: ['create']
        }
    },
    {
        path: '/plan/documents/document-acknowledgements/:id/edit',
        name: 'EditDocumentAcknowledgemenet',
        component: () => import('./AddDocumentAcknowledgemenet.vue'),
        meta: {
            subject: 'document_acknowledgements',
            actions: ['update']
        }
    },
    {
        path: '/plan/documents',
        name: 'Documents',
        component: () => import('./main.vue'),
        meta: {
            subject: 'documents',
            actions: ['read']
        }
    },
    {
        path: '/plan/documents/:id/compare',
        name: 'Compare Versions',
        component: () => import('./compare-versions.vue'),
        meta: {
            subject: 'documents',
            actions: ['read']
        }
    },
    {
        path: '/plan/documents/:id',
        name: 'View Document',
        component: () => import('./view-document.vue'),
        meta: {
            subject: 'documents',
            actions: ['read']
        }
    },
    {
        path: '/plan/documents/:id/content',
        name: 'View Document Content',
        component: () => import('./view-document-content.vue'),
        meta: {
            subject: 'documents',
            actions: ['read']
        }
    },
    {
        path: '/plan/documents/:id/checklist',
        name: 'View Document Checklist',
        component: () => import('./view-document-checklist.vue'),
        meta: {
            subject: 'documents',
            actions: ['read']
        }
    },
    {
        path: '/plan/documents/add',
        name: 'Add Document',
        component: () => import('./document-form.vue'),
        meta: {
            subject: 'documents',
            actions: ['create']
        }
    },
    {
        path: '/plan/documents/:id/new-version',
        name: 'New Version',
        component: () => import('./document-version-editor.vue'),
        meta: {
            subject: 'documents',
            actions: ['update'],
            fullPage: true
        }
    },
    {
        path: '/plan/documents/:id/checklist-version',
        name: 'Checklist Version',
        component: () => import('./document-checklist-version-editor.vue'),
        meta: {
            subject: 'documents',
            actions: ['update']
        }
    },
    {
        path: '/plan/documents/:id/edit-version',
        name: 'Edit Version',
        component: () => import('./document-version-editor.vue'),
        meta: {
            subject: 'documents',
            actions: ['update'],
            fullPage: true
        }
    },
    {
        path: '/plan/documents/:id/edit',
        name: 'Edit Document',
        component: () => import('./document-form.vue'),
        meta: {
            subject: 'documents',
            actions: ['update']
        }
    },
    {
        path: '/plan/documents/drafts',
        name: 'Document Drafts',
        component: () => import('./document-drafts.vue'),
        meta: {
            subject: 'documents',
            actions: ['create','update']
        }
    },
    {
        path: '/plan/documents/drafts/:draftId/edit',
        name: 'Edit Document Draft',
        component: () => import('./document-form.vue'),
        meta: {
            subject: 'documents',
            actions: ['update']
        }
    },
    {
        path: '/plan/documents/change-requests',
        name: 'Document Change Requests',
        component: () => import('./document-change-requests.vue'),
        meta: {
            subject: 'change_requests',
            actions: ['read']
        }
    },
    {
        path: '/plan/documents/change-requests/create',
        name: 'Create Document Change Request',
        component: () => import('./ChangeRequestDialog.vue'),
        meta: {
            subject: 'change_requests',
            actions: ['create']
        }
    },
    {
        path: '/plan/documents/change-requests/:changeRequestId',
        name: 'View Document Change Request',
        component: () => import('./ChangeRequestDialog.vue'),
        meta: {
            subject: 'change_requests',
            actions: ['read']
        }
    },
    {
        path: '/plan/documents/settings/templates/add',
        name: 'Add Template',
        component: () => import('./template-form.vue'),
        meta: {
            subject: 'document_templates',
            actions: ['create']
        }
    },
    {
        path: '/plan/documents/settings/templates/:id',
        name: 'View Template',
        component: () => import('./document-template-detail-view.vue'),
        meta: {
            subject: 'document_templates',
            actions: ['read']
        }
    },
    {
        path: '/plan/documents/settings/templates/:id/edit',
        name: 'Edit Template',
        component: () => import('./template-form.vue'),
        meta: {
            subject: 'document_templates',
            actions: ['update']
        }
    },
    {
        path: '/plan/documents/settings/templates/:id/copy',
        name: 'Copy Template',
        component: () => import('./template-form.vue'),
        meta: {
            subject: 'document_templates',
            actions: ['create']
        }
    },
]
