export const standardsRoutes = [
    {
        path: '/plan/standards',
        name: 'Standards',
        component: () => import('./main.vue'),
        meta: {
            subject: 'standards',
            actions: ['read']
        }
    },
    {
        path: '/plan/standards/add',
        name: 'Add Standard Implementation',
        component: () => import('./add-implementation.vue'),
        meta: {
            subject: 'standards',
            actions: ['create']
        }
    },
    {
        path: '/plan/standards/:id',
        name: 'View Standard Implementation',
        component: () => import('./view-implementation.vue'),
        meta: {
            subject: 'standards',
            actions: ['read']
        }
    }
]

export const SHARED_STANDARD_LIST = 'SharedStandardList'
export const SHARED_STANDARD_DOCUMENT = 'SharedStandardDocument'

export const sharedStandardsRoutes = [
    {
        path: '/share/standards/document/:code',
        name: SHARED_STANDARD_DOCUMENT,
        component: () => import('./shared-document.vue')
    },
    {
        path: '/share/standards/:code',
        name: SHARED_STANDARD_LIST,
        component: () => import('./shared-implementation.vue')
    }
]
