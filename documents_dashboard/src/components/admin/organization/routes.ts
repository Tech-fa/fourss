import mainView from './mainView.vue'

export const orgUnitTypeRoutes = [
    {
        path: '/admin/org-tree',
        name: 'Teams',
        component: mainView,
        meta: {
            subject: 'teams',
            actions: ['read']
        }
    },
]
