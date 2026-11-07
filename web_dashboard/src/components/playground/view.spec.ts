import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import PlaygroundView from './view.vue'
import { getPlayground, getPlaygroundApp } from './endpoints'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock('vue-router', () => ({
    useRouter: () => ({ push }),
    useRoute: () => ({ params: { id: 'pg-1' }, query: {} })
}))

vi.mock('./endpoints', () => ({
    getPlayground: vi.fn(),
    deletePlayground: vi.fn(),
    getPlaygroundApp: vi.fn(),
    publishPlayground: vi.fn(),
    putPlaygroundFile: vi.fn(),
    setPlaygroundEnabled: vi.fn(),
    runPlaygroundSql: vi.fn(),
    callPlaygroundApi: vi.fn(),
    fetchPlaygroundPath: vi.fn()
}))

describe('playground page', () => {
    beforeEach(() => {
        push.mockClear()
        vi.mocked(getPlaygroundApp).mockResolvedValue({
            'index.html': '<div id="app"></div>',
            'app.js': '',
            'server.js': ''
        })
        vi.mocked(getPlayground).mockResolvedValue({
            id: 'pg-1',
            teamId: 7,
            name: 'Notes',
            enabled: true,
            revision: 2,
            lastPublishedAt: 1,
            publisher: null,
            updatedAt: 1,
            source: 'function render() {}',
            createdById: 'user-1'
        })
    })

    it('loads the playground from the route id and returns to the list', async () => {
        const pinia = createPinia()
        setActivePinia(pinia)
        const wrapper = mount(PlaygroundView, {
            global: { plugins: [pinia, i18n] }
        })
        await flushPromises()

        expect(getPlayground).toHaveBeenCalledWith('pg-1', expect.anything())
        expect(wrapper.text()).toContain('Notes')
        expect(wrapper.text()).toContain('Playground')
        expect(wrapper.find('iframe').attributes('title')).toBe('Notes')
        expect(wrapper.find('textarea').exists()).toBe(false)
        expect(wrapper.text()).not.toContain('index.html')

        await wrapper.findAll('span').find((node) => node.text() === 'Playground')!.trigger('click')
        expect(push).toHaveBeenCalledWith({ path: '/plan/playground', query: {} })
        wrapper.unmount()
    })
})
