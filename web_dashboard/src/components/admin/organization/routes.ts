export const orgUnitTypeRoutes = [
    {
        path: '/admin/org-tree',
        name: 'Teams',
        component: () => import('./mainView.vue'),
        meta: {
            subject: 'teams',
            actions: ['read']
        }
    },
]
