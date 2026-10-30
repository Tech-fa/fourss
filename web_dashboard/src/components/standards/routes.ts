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
