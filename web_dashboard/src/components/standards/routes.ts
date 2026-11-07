export const standardsRoutes = [
    {
        path: '/plan/standards',
        name: 'Standards',
        component: () => import('./main.vue'),
        meta: {
            subject: 'standards',
            actions: ['read'],
            purpose: 'List standard implementations.'
        }
    },
    {
        path: '/plan/standards/add',
        name: 'Add Standard Implementation',
        component: () => import('./add-implementation.vue'),
        meta: {
            subject: 'standards',
            actions: ['create'],
            purpose: 'Start a standard implementation.'
        }
    },
    {
        path: '/plan/standards/:id',
        name: 'View Standard Implementation',
        component: () => import('./view-implementation.vue'),
        meta: {
            subject: 'standards',
            actions: ['read'],
            purpose: 'Read a standard implementation and its documents.'
        }
    }
]

export const SHARED_STANDARD_LIST = 'SharedStandardList'
export const SHARED_STANDARD_DOCUMENT = 'SharedStandardDocument'

export const sharedStandardsRoutes = [
    {
        path: '/share/standards/document/:code',
        name: SHARED_STANDARD_DOCUMENT,
        component: () => import('./shared-document.vue'),
        meta: { purpose: 'Open a shared standard document with its share code.' }
    },
    {
        path: '/share/standards/:code',
        name: SHARED_STANDARD_LIST,
        component: () => import('./shared-implementation.vue'),
        meta: { purpose: 'Open a shared standard implementation with its share code.' }
    }
]
