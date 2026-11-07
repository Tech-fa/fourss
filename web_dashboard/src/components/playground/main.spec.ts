import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import PlaygroundList from './main.vue'
import { listPlaygrounds, listPublishedPlaygrounds } from './endpoints'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock('vue-router', () => ({
    useRouter: () => ({ push }),
    useRoute: () => ({ query: { documentId: 'doc-1' }, params: {} })
}))

vi.mock('./endpoints', () => ({
    listPublishedPlaygrounds: vi.fn().mockResolvedValue([]),
    listPlaygrounds: vi.fn().mockResolvedValue([]),
    createPlayground: vi.fn(),
    getPlayground: vi.fn(),
    deletePlayground: vi.fn(),
    putPlaygroundFile: vi.fn()
}))

describe('playground list', () => {
    beforeEach(() => {
        push.mockClear()
        vi.mocked(listPublishedPlaygrounds).mockResolvedValue([])
        vi.mocked(listPlaygrounds).mockResolvedValue([
            {
                id: 'pg-1',
                teamId: 7,
                name: 'Notes',
                enabled: false,
                revision: 1,
                lastPublishedAt: null,
                publisher: null,
                updatedAt: null
            }
        ])
    })

    it('uses the shared team select and opens a playground on its own page', async () => {
        const pinia = createPinia()
        setActivePinia(pinia)
        const auth = useAuthStore()
        auth.state.userDetails = {
            id: 'user-1',
            teams: [{ id: 7, name: 'Plant' }],
            permissions: [
                { subject: 'playgrounds', action: 'read' },
                { subject: 'playgrounds', action: 'create' }
            ]
        }

        const wrapper = mount(PlaygroundList, {
            global: { plugins: [pinia, i18n] }
        })
        await flushPromises()

        expect(wrapper.find('select').exists()).toBe(false)
        expect(wrapper.find('#select2-dropdown').exists()).toBe(true)
        expect(wrapper.find('input').exists()).toBe(true)
        expect(wrapper.text()).toContain('Plant')
        expect(wrapper.text()).toContain('Notes')

        await wrapper.findAll('button').find((button) => button.text() === 'Open')!.trigger('click')

        expect(push).toHaveBeenCalledWith({
            path: '/plan/playgrounds/pg-1',
            query: { documentId: 'doc-1' }
        })
        wrapper.unmount()
    })
})
