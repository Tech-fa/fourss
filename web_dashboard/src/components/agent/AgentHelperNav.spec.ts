import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, describe, expect, it } from 'vitest'
import i18n from '@/i18n'
import AgentHelperDialog from './AgentHelperDialog.vue'
import AgentHelperNav from './AgentHelperNav.vue'

function mountNav() {
    return mount(AgentHelperNav, {
        global: { plugins: [createPinia(), i18n] }
    })
}

function mountDialog() {
    return mount(AgentHelperDialog, {
        props: { onClose: () => undefined },
        global: { plugins: [createPinia(), i18n] }
    })
}

describe('agent helper controls', () => {
    afterEach(() => {
        delete window.__buhoHost
    })

    it('shows the switch in a regular browser', () => {
        const nav = mountNav()
        const dialog = mountDialog()

        expect(nav.find('[test-id="agent-helper-toggle"]').exists()).toBe(true)
        expect(dialog.text()).toContain('Turn it on, then copy')
        expect(dialog.find('[test-id="agent-helper-turn-on"]').exists()).toBe(true)
    })

    it('hides the switch inside Buho', () => {
        window.__buhoHost = true
        const nav = mountNav()
        const dialog = mountDialog()

        expect(nav.find('[test-id="agent-helper-toggle"]').exists()).toBe(false)
        expect(nav.text()).toContain('Agent helper')
        expect(dialog.text()).toContain('Buho keeps the helper on')
        expect(dialog.find('[test-id="agent-helper-turn-on"]').exists()).toBe(false)
        expect(dialog.find('[test-id="agent-helper-turn-off"]').exists()).toBe(false)
    })
})
