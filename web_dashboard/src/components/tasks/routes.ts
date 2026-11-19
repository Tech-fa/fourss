import Tasks from './my-tasks.vue'
import ViewImmediateAction from './view-immediate-action.vue'
import ViewCorrectiveAction from './view-corrective-action.vue'

export const USER_TASK_ERROR_I18N_PREFIX = 'errors.user_task' as const

export const tasksRoutes = [
    {
        path: '/tasks',
        name: 'Tasks',
        component: Tasks,
        meta: {
            purpose: 'List immediate actions assigned to the signed-in user.',
            subject: 'immediate_actions',
            actions: ['read', 'read_own']
        }
    },
    {
        path: '/tasks/immediate-actions/:id',
        name: 'View Immediate Action',
        component: ViewImmediateAction,
        meta: {
            subject: 'immediate_actions',
            actions: ['read', 'read_own']
        }
    },
    {
        path: '/tasks/corrective-actions/:id',
        name: 'View Corrective Action',
        component: ViewCorrectiveAction,
        meta: {
            subject: 'non_conformity_corrective_actions',
            actions: ['read']
        }
    },
]
