export const reminderRoutes = [
    {
        path: '/admin/reminders',
        name: 'Reminders',
        component: () => import('./mainView.vue'),
        meta: {
            subject: 'reminders',
            actions: ['read'],
            purpose: 'Configure when records send reminder emails and who on the record receives them.',
        },
    },
]
