import { AUDIT_PROGRAM_GUIDE } from './audit-program'
import { INTEGRATIONS_GUIDE } from './integrations'
import { NON_CONFORMITY_GUIDE } from './non-conformity'

/**
 * Procedures the agent loads only after the user's request matches.
 * Standing instructions name this lookup. They do not include these guides.
 */

export const NO_PROCEDURE =
    'No procedure for this request. Do what the user asked with the page tools. Do not add another task.'

type Procedure = {
    guide: string
    matches: (intent: string) => boolean
}

const procedures: Procedure[] = [
    {
        guide: AUDIT_PROGRAM_GUIDE,
        matches: (intent) =>
            /audit program(?:me)?s?/.test(intent) ||
            /audit instances?/.test(intent) ||
            /schedule entr(?:y|ies)/.test(intent) ||
            /audit checklists?/.test(intent) ||
            /checklist definitions?/.test(intent) ||
            /audit personnel/.test(intent) ||
            /audit roles?/.test(intent) ||
            /audit types?/.test(intent) ||
            /internal audits?/.test(intent) ||
            /unplanned audits?/.test(intent) ||
            /planned audits?/.test(intent) ||
            /\b(?:create|build|make|draft|schedule|plan|add|start|write|run|set up|setup)(?:\s+\S+){0,6}\s+audits?(?!\s+trail|\s+log)/.test(
                intent
            )
    },
    {
        guide: NON_CONFORMITY_GUIDE,
        matches: (intent) =>
            /non[- ]?conform(?:ity|ities|ance)/.test(intent) ||
            /corrective actions?/.test(intent) ||
            /root[- ]cause/.test(intent) ||
            /five whys?/.test(intent) ||
            /\b5 whys?/.test(intent) ||
            /\bcapa\b/.test(intent)
    },
    {
        guide: INTEGRATIONS_GUIDE,
        matches: (intent) =>
            /integrations?/.test(intent) ||
            /\bslack\b/.test(intent) ||
            /\bwebhook\b/.test(intent) ||
            /\boauth\b/.test(intent) ||
            /third[- ]party/.test(intent) ||
            /\bconnect(?:\s+\S+){0,4}\s+(?:slack|jira|teams|github|system|account|api)\b/.test(intent)
    }
]

export function procedureForIntent(intent: string): string {
    const text = intent.toLowerCase().replace(/\s+/g, ' ').trim()
    const matched = procedures.filter((procedure) => procedure.matches(text))
    if (!matched.length) return NO_PROCEDURE
    const lead = matched.length === 1 ? 'Follow only the procedure below.' : 'Follow only the procedures below.'
    return [lead, ...matched.map((procedure) => procedure.guide)].join('\n\n')
}
