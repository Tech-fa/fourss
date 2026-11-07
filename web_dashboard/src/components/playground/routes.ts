export const PLAYGROUND_LIST_PATH = '/plan/playground'

export function playgroundPath(id: string) {
    return `/plan/playgrounds/${encodeURIComponent(id)}`
}

export const playgroundRoutes = [
    {
        path: PLAYGROUND_LIST_PATH,
        name: 'Playground',
        component: () => import('./main.vue'),
        meta: {
            subject: 'playgrounds',
            actions: ['read'],
            purpose: 'List playgrounds. A person sees each one working. Publishing is a separate step.'
        }
    },
    {
        path: '/plan/playgrounds/:id',
        name: 'PlaygroundView',
        component: () => import('./view.vue'),
        meta: {
            subject: 'playgrounds',
            actions: ['read'],
            purpose: 'Open one playground. The person sees it working. Publishing is a separate step.'
        }
    }
]
