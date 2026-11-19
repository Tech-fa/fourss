import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { API_ACCESS_DESCRIPTION } from './api-access'
import { AUDIT_PROGRAM_GUIDE } from './audit-program'
import { INTEGRATIONS_GUIDE } from './integrations'
import { NON_CONFORMITY_GUIDE } from './non-conformity'
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
    it('keeps the Fourss confirmation rules', () => {
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
        expect(server).toContain('apply_playground')
        expect(server).toContain('It does not publish.')

        const handoff = agentHandoff('http://127.0.0.1:3003/__agent-helper/mcp?token=secret')
        expect(handoff).toContain(AGENT_SERVER_NAME)
        expect(handoff).toContain('http://127.0.0.1:3003/__agent-helper/mcp?token=secret')
        expect(handoff).toContain(LEAVE_CONFIRMATION_TO_THE_USER)
        expect(handoff).toContain(STAY_ON_PAGE_RULE)
        expect(handoff).toContain('this browser tab is closed')
        expect(handoff).not.toContain('then submit_form')
        expect(instructions).toContain(AUDIT_PROGRAM_GUIDE)
        expect(handoff).toContain(AUDIT_PROGRAM_GUIDE)
        expect(instructions).toContain(NON_CONFORMITY_GUIDE)
        expect(handoff).toContain(NON_CONFORMITY_GUIDE)
        expect(instructions).toContain(INTEGRATIONS_GUIDE)
        expect(handoff).toContain(INTEGRATIONS_GUIDE)
        expect(instructions).toContain('Do not ask for a secret in the chat.')
        expect(instructions).toContain('POST /integrations/:id/proposal')
        expect(instructions).toContain('Five whys')
        expect(instructions).toContain('Do not supply a why or a because')
        expect(instructions).toContain('assigned_to_id')
        expect(instructions).toContain('rcaFiveWhyStepId')
        expect(instructions).toContain('POST /audits/programs')
        expect(instructions).toContain('scheduleEntries')
        expect(instructions).toContain('POST /audits/instances')
        expect(instructions).toContain('checklist-definitions/:id/publish')

        const serverGuide = readFileSync(
            resolve(root, 'fourss/web_backend/src/agent-helper/audit-program.ts'),
            'utf8'
        )
        expect(serverGuide).toContain(AUDIT_PROGRAM_GUIDE)
        const serverNonConformity = readFileSync(
            resolve(root, 'fourss/web_backend/src/agent-helper/non-conformity.ts'),
            'utf8'
        )
        expect(serverNonConformity).toContain(NON_CONFORMITY_GUIDE)
        const serverIntegrations = readFileSync(
            resolve(root, 'fourss/web_backend/src/agent-helper/integrations.ts'),
            'utf8'
        )
        expect(serverIntegrations).toContain(INTEGRATIONS_GUIDE)
    })
})
