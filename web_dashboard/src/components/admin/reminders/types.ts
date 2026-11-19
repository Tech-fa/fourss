export interface ReminderChoice {
    key: string
    labelKey: string
}

export interface ReminderSource {
    key: string
    labelKey: string
    anchors: ReminderChoice[]
    recipients: ReminderChoice[]
    statuses: ReminderChoice[]
    defaultRecipientKeys: string[]
    defaultStatusKeys: string[]
}

export interface ReminderRule {
    id: string
    sourceKey: string
    anchorKey: string
    offsetDays: number
    direction: 'before' | 'after'
    recipientKeys: string[]
    statusKeys: string[]
    enabled: boolean
}

export type ReminderRuleInput = Omit<ReminderRule, 'id'>
