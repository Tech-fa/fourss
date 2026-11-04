export const playgroundRoutes = [
    {
        path: '/plan/playground',
        name: 'Playground',
        component: () => import('./main.vue'),
        meta: {
            subject: 'playgrounds',
            actions: ['read']
        }
    }
]
