import { describe, expect, it } from 'vitest'
import { PLAYGROUND_LIST_PATH, playgroundPath, playgroundRoutes } from './routes'

describe('playground routes', () => {
    it('keeps the list and opens one playground at playgrounds/:id', () => {
        expect(PLAYGROUND_LIST_PATH).toBe('/plan/playground')
        expect(playgroundPath('pg-1')).toBe('/plan/playgrounds/pg-1')
        expect(playgroundRoutes.map((route) => route.path)).toEqual([
            '/plan/playground',
            '/plan/playgrounds/:id'
        ])
        expect(playgroundRoutes.map((route) => route.name)).toEqual(['Playground', 'PlaygroundView'])
    })
})
