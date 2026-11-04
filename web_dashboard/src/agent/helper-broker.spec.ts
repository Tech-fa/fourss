import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { API_ACCESS_DESCRIPTION } from './api-access'
import {
    AGENT_SERVER_NAME,
    LEAVE_CONFIRMATION_TO_THE_USER,
    STAY_ON_PAGE_RULE,
    SUBMIT_FORM_REFUSAL,
    agentHandoff,
    helperInstructions
} from './confirmation'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')

describe('agent helper confirmation', () => {
    it('keeps the desktop shell confirmation rules', () => {
        const control = readFileSync(resolve(root, 'desktop-shell/src-tauri/src/control.rs'), 'utf8')
        const context = readFileSync(resolve(root, 'desktop-shell/src-tauri/src/agent_context.rs'), 'utf8')
        expect(control).toContain(LEAVE_CONFIRMATION_TO_THE_USER)
        expect(control).toContain(SUBMIT_FORM_REFUSAL)
        expect(context).toContain(STAY_ON_PAGE_RULE)

        const instructions = helperInstructions()
        expect(instructions).toContain(LEAVE_CONFIRMATION_TO_THE_USER)
        expect(instructions).toContain(STAY_ON_PAGE_RULE)
        expect(instructions).toContain('call api_access')
        expect(instructions).toContain('localStorage')
        expect(instructions).not.toContain('then submit_form')

        const server = readFileSync(resolve(root, 'fourss/web_backend/src/agent-helper/instructions.ts'), 'utf8')
        expect(server).toContain(LEAVE_CONFIRMATION_TO_THE_USER)
        expect(server).toContain(STAY_ON_PAGE_RULE)
        expect(server).toContain(SUBMIT_FORM_REFUSAL)
        expect(server).toContain(API_ACCESS_DESCRIPTION)
        expect(server).toContain('call api_access')
        expect(server).toContain('select_option')

        const handoff = agentHandoff('http://127.0.0.1:3003/__agent-helper/mcp?token=secret')
        expect(handoff).toContain(AGENT_SERVER_NAME)
        expect(handoff).toContain('http://127.0.0.1:3003/__agent-helper/mcp?token=secret')
        expect(handoff).toContain(LEAVE_CONFIRMATION_TO_THE_USER)
        expect(handoff).toContain(STAY_ON_PAGE_RULE)
        expect(handoff).toContain('this browser tab is closed')
        expect(handoff).not.toContain('then submit_form')
    })
})
