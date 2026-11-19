import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import IntegrationDetail from './detail.vue'
import { markIntegrationStep, readIntegration, saveIntegrationValues } from './endpoints'

vi.mock('vue-router', () => ({
    useRoute: () => ({ path: '/plan/integrations/i1', params: { id: 'i1' }, query: {} }),
    useRouter: () => ({ push: vi.fn() })
}))

vi.mock('./endpoints', () => ({
    readIntegration: vi.fn(),
    saveIntegrationValues: vi.fn(),
    markIntegrationStep: vi.fn()
}))

const detail = {
    id: 'i1',
    name: 'Gmail',
    status: 'needs_input',
    inputs: [
        {
            key: 'clientId',
            label: 'Client id',
            description: 'Copy the client id from the credentials page.',
            required: true,
            secret: false,
            filled: false,
            value: ''
        }
    ],
    steps: [
        {
            id: 'credentials',
            title: 'Create the app',
            instruction: 'Open the console and copy the client id into the field below.',
            link: { label: 'Google Cloud', url: 'https://console.cloud.google.com' },
            fields: ['clientId'],
            doneWhen: 'fields_saved',
            copy: null,
            copyValue: null,
            done: false
        },
        {
            id: 'webhook',
            title: 'Add the webhook',
            instruction: 'Paste this URL into the notification endpoint field.',
            link: null,
            fields: [],
            doneWhen: 'manual',
            copy: { kind: 'webhookUrl' },
            copyValue: 'https://app.example/integrations/hooks/gmail',
            done: false
        }
    ],
    otherKeys: [],
    latestFailure: null
}

describe('integration detail', () => {
    beforeEach(() => {
        vi.mocked(readIntegration).mockResolvedValue(detail)
        vi.mocked(saveIntegrationValues).mockResolvedValue({
            ...detail,
            inputs: [{ ...detail.inputs[0], filled: true, value: 'client-1' }],
            steps: [{ ...detail.steps[0], done: true }, detail.steps[1]]
        })
        vi.mocked(markIntegrationStep).mockResolvedValue({
            ...detail,
            steps: [detail.steps[0], { ...detail.steps[1], done: true }]
        })
    })

    it('shows the instruction, the portal link, the field description, and the server webhook URL', async () => {
        const pinia = createPinia()
        setActivePinia(pinia)
        useAuthStore()
        const wrapper = mount(IntegrationDetail, { global: { plugins: [pinia, i18n] } })
        await flushPromises()

        expect(wrapper.text()).toContain('Open the console and copy the client id into the field below.')
        expect(wrapper.text()).toContain('Copy the client id from the credentials page.')
        expect(wrapper.get('a').attributes('href')).toBe('https://console.cloud.google.com')
        expect(wrapper.get('a').attributes('target')).toBe('_blank')
        expect(wrapper.text()).toContain('https://app.example/integrations/hooks/gmail')
        expect(wrapper.text()).toContain('Paste this URL into the notification endpoint field.')

        await wrapper.find('input').setValue('client-1')
        await wrapper.findAll('button').find((button) => button.text() === 'Save')!.trigger('click')
        await flushPromises()
        expect(saveIntegrationValues).toHaveBeenCalledWith(
            'i1',
            { clientId: 'client-1' },
            'credentials',
            expect.anything()
        )
        expect(wrapper.text()).toContain('Done')

        await wrapper.findAll('button').find((button) => button.text() === 'I have done this')!.trigger('click')
        await flushPromises()
        expect(markIntegrationStep).toHaveBeenCalledWith('i1', 'webhook', expect.anything())
        wrapper.unmount()
    })
})
