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
            actions: ['read'],
            purpose: 'Configure document types, approval strategies, acknowledgements, and templates.'
        }
    },
    {
        path: '/plan/documents/approval-strategies/add',
        name: 'AddApprovalStrategy',
        component: () => import('./AddApprovalStrategy.vue'),
        meta: {
            subject: 'approval_strategies',
            actions: ['create'],
            purpose: 'Create an approval strategy.'
        }
    },
    {
        path: '/plan/documents/approval-strategies/:id/edit',
        name: 'EditApprovalStrategy',
            component: () => import('./AddApprovalStrategy.vue'),
        meta: {
            subject: 'approval_strategies',
            actions: ['update'],
            purpose: 'Change an approval strategy.'
        }
    },
    {
        path: '/plan/documents/document-acknowledgements/add',
        name: 'AddDocumentAcknowledgemenet',
        component: () => import('./AddDocumentAcknowledgemenet.vue'),
        meta: {
            subject: 'document_acknowledgements',
            actions: ['create'],
            purpose: 'Create an acknowledgement requirement.'
        }
    },
    {
        path: '/plan/documents/document-acknowledgements/:id/edit',
        name: 'EditDocumentAcknowledgemenet',
        component: () => import('./AddDocumentAcknowledgemenet.vue'),
        meta: {
            subject: 'document_acknowledgements',
            actions: ['update'],
            purpose: 'Change an acknowledgement requirement.'
        }
    },
    {
        path: '/plan/documents',
        name: 'Documents',
        component: () => import('./main.vue'),
        meta: {
            subject: 'documents',
            actions: ['read'],
            purpose: 'List and open controlled documents.'
        }
    },
    {
        path: '/plan/documents/:id/compare',
        name: 'Compare Versions',
        component: () => import('./compare-versions.vue'),
        meta: {
            subject: 'documents',
            actions: ['read'],
            purpose: 'Compare two versions of a document.'
        }
    },
    {
        path: '/plan/documents/:id',
        name: 'View Document',
        component: () => import('./view-document.vue'),
        meta: {
            subject: 'documents',
            actions: ['read'],
            purpose: 'Read a document and its versions.'
        }
    },
    {
        path: '/plan/documents/:id/content',
        name: 'View Document Content',
        component: () => import('./view-document-content.vue'),
        meta: {
            subject: 'documents',
            actions: ['read'],
            purpose: "Read a document's body."
        }
    },
    {
        path: '/plan/documents/:id/checklist',
        name: 'View Document Checklist',
        component: () => import('./view-document-checklist.vue'),
        meta: {
            subject: 'documents',
            actions: ['read'],
            purpose: "Read a document's checklist."
        }
    },
    {
        path: '/plan/documents/add',
        name: 'Add Document',
        component: () => import('./document-form.vue'),
        meta: {
            subject: 'documents',
            actions: ['create'],
            purpose: 'Create a document.'
        }
    },
    {
        path: '/plan/documents/:id/new-version',
        name: 'New Version',
        component: () => import('./document-version-editor.vue'),
        meta: {
            subject: 'documents',
            actions: ['update'],
            fullPage: true,
            purpose: 'Draft a new document version.'
        }
    },
    {
        path: '/plan/documents/:id/checklist-version',
        name: 'Checklist Version',
        component: () => import('./document-checklist-version-editor.vue'),
        meta: {
            subject: 'documents',
            actions: ['update'],
            purpose: 'Draft a new checklist version.'
        }
    },
    {
        path: '/plan/documents/:id/edit-version',
        name: 'Edit Version',
        component: () => import('./document-version-editor.vue'),
        meta: {
            subject: 'documents',
            actions: ['update'],
            fullPage: true,
            purpose: 'Edit a pending document version. The user publishes it.'
        }
    },
    {
        path: '/plan/documents/:id/edit',
        name: 'Edit Document',
        component: () => import('./document-form.vue'),
        meta: {
            subject: 'documents',
            actions: ['update'],
            purpose: "Change a document's details."
        }
    },
    {
        path: '/plan/documents/drafts',
        name: 'Document Drafts',
        component: () => import('./document-drafts.vue'),
        meta: {
            subject: 'documents',
            actions: ['create','update'],
            purpose: 'List unpublished document drafts.'
        }
    },
    {
        path: '/plan/documents/drafts/:draftId/edit',
        name: 'Edit Document Draft',
        component: () => import('./document-form.vue'),
        meta: {
            subject: 'documents',
            actions: ['update'],
            purpose: 'Continue a document draft.'
        }
    },
    {
        path: '/plan/documents/change-requests',
        name: 'Document Change Requests',
        component: () => import('./document-change-requests.vue'),
        meta: {
            subject: 'change_requests',
            actions: ['read'],
            purpose: 'List document change requests.'
        }
    },
    {
        path: '/plan/documents/change-requests/create',
        name: 'Create Document Change Request',
        component: () => import('./ChangeRequestDialog.vue'),
        meta: {
            subject: 'change_requests',
            actions: ['create'],
            purpose: 'Open a document change request.'
        }
    },
    {
        path: '/plan/documents/change-requests/:changeRequestId',
        name: 'View Document Change Request',
        component: () => import('./ChangeRequestDialog.vue'),
        meta: {
            subject: 'change_requests',
            actions: ['read'],
            purpose: 'Read a document change request.'
        }
    },
    {
        path: '/plan/documents/settings/templates/add',
        name: 'Add Template',
        component: () => import('./template-form.vue'),
        meta: {
            subject: 'document_templates',
            actions: ['create'],
            purpose: 'Create a document template.'
        }
    },
    {
        path: '/plan/documents/settings/templates/:id',
        name: 'View Template',
        component: () => import('./document-template-detail-view.vue'),
        meta: {
            subject: 'document_templates',
            actions: ['read'],
            purpose: 'Read a document template.'
        }
    },
    {
        path: '/plan/documents/settings/templates/:id/edit',
        name: 'Edit Template',
        component: () => import('./template-form.vue'),
        meta: {
            subject: 'document_templates',
            actions: ['update'],
            purpose: 'Change a document template.'
        }
    },
    {
        path: '/plan/documents/settings/templates/:id/copy',
        name: 'Copy Template',
        component: () => import('./template-form.vue'),
        meta: {
            subject: 'document_templates',
            actions: ['create'],
            purpose: 'Copy a document template into a new one.'
        }
    },
]
