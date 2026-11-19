import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import ReminderRuleDialog from './reminder-rule-dialog.vue'
import type { ReminderSource } from './types'

const sources: ReminderSource[] = [
    {
        key: 'audit_instance',
        labelKey: 'reminders.sources.audit_instance',
        anchors: [
            { key: 'start_date', labelKey: 'reminders.anchors.start_date' },
            { key: 'end_date', labelKey: 'reminders.anchors.end_date' }
        ],
        recipients: [{ key: 'team', labelKey: 'reminders.recipients.team' }],
        statuses: [
            { key: 'SCHEDULED', labelKey: 'reminders.statuses.scheduled' },
            { key: 'IN_PROGRESS', labelKey: 'reminders.statuses.in_progress' }
        ],
        defaultRecipientKeys: ['team'],
        defaultStatusKeys: ['SCHEDULED']
    },
    {
        key: 'non_conformity',
        labelKey: 'reminders.sources.non_conformity',
        anchors: [{ key: 'due_date', labelKey: 'reminders.anchors.due_date' }],
        recipients: [
            { key: 'responsible_user', labelKey: 'reminders.recipients.responsible_user' },
            { key: 'creator', labelKey: 'reminders.recipients.creator' }
        ],
        statuses: [
            { key: 'OPEN', labelKey: 'reminders.statuses.open' },
            { key: 'CLOSED', labelKey: 'reminders.statuses.closed' }
        ],
        defaultRecipientKeys: ['responsible_user'],
        defaultStatusKeys: ['OPEN']
    }
]

function mountDialog() {
    return mount(ReminderRuleDialog, {
        props: {
            sources,
            onCancel: vi.fn(),
            onSubmit: vi.fn().mockResolvedValue(undefined)
        },
        global: { plugins: [createPinia(), i18n] }
    })
}

describe('reminder rule dialog', () => {
    it('starts from the audit team one day before the start date', () => {
        const wrapper = mountDialog()
        const preview = wrapper.get('[test-id="reminder-preview"]').text()
        expect(preview).toContain('1 day before the start date')
        expect(preview).toContain('Audit team')
        expect(preview).toContain('Scheduled')
        expect(
            (wrapper.get('[test-id="reminder-recipient-team"]').element as HTMLInputElement).checked
        ).toBe(true)
    })

    it('switches people and dates when the record type changes', async () => {
        const wrapper = mountDialog()
        await wrapper.get('[test-id="reminder-source"]').setValue('non_conformity')
        const preview = wrapper.get('[test-id="reminder-preview"]').text()
        expect(preview).toContain('due date')
        expect(preview).toContain('Responsible user')
        expect(wrapper.find('[test-id="reminder-recipient-team"]').exists()).toBe(false)
        expect(
            (wrapper.get('[test-id="reminder-recipient-responsible_user"]').element as HTMLInputElement)
                .checked
        ).toBe(true)
    })

    it('saves the selected relationship, date, and statuses', async () => {
        const onSubmit = vi.fn().mockResolvedValue(undefined)
        const wrapper = mount(ReminderRuleDialog, {
            props: { sources, onCancel: vi.fn(), onSubmit },
            global: { plugins: [createPinia(), i18n] }
        })
        await wrapper.get('[test-id="reminder-save"]').trigger('click')
        expect(onSubmit).toHaveBeenCalledWith({
            sourceKey: 'audit_instance',
            anchorKey: 'start_date',
            offsetDays: 1,
            direction: 'before',
            recipientKeys: ['team'],
            statusKeys: ['SCHEDULED'],
            enabled: true
        })
    })
})
