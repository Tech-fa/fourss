export const INTEGRATIONS_LIST_PATH = '/plan/integrations'

export function integrationPath(id: string) {
    return `/plan/integrations/${encodeURIComponent(id)}`
}

export const integrationRoutes = [
    {
        path: INTEGRATIONS_LIST_PATH,
        name: 'Integrations',
        component: () => import('./list.vue'),
        meta: {
            subject: 'integrations',
            actions: ['read'],
            purpose: 'List connections. Open one to see the steps the user follows. Creating and proposing a connection is done through the Integrations API.'
        }
    },
    {
        path: '/plan/integrations/:id',
        name: 'IntegrationDetail',
        component: () => import('./detail.vue'),
        meta: {
            subject: 'integrations',
            actions: ['read'],
            purpose: 'Shows the steps for one connection. The user fills the fields and marks a manual step done. The agent does not type secrets here.'
        }
    }
]
