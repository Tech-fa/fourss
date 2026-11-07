import { describe, expect, it } from 'vitest'
import {
    documentEditContentPath,
    markdownCoversText,
    planDocumentBodyWrite
} from './document-markdown'

const policy = `# Policy

## Purpose

Keep this purpose.

## Scope

Old scope.

## Definitions

Keep definitions.
`

describe('document markdown edits', () => {
    it('replaces one section and keeps the others', () => {
        const planned = planDocumentBodyWrite({
            current: policy,
            incoming: '## Scope\n\nNew scope.\n',
            readComplete: false
        })
        expect(planned.markdown).toContain('Keep this purpose.')
        expect(planned.markdown).toContain('New scope.')
        expect(planned.markdown).toContain('Keep definitions.')
        expect(planned.markdown).not.toContain('Old scope.')
    })

    it('refuses a full replace until the read returned the complete markdown', () => {
        expect(() =>
            planDocumentBodyWrite({
                current: policy,
                incoming: '# Policy\n\n## Purpose\n\nChanged.\n\n## Scope\n\nChanged.\n',
                readComplete: false
            })
        ).toThrow(/complete markdown/)

        const planned = planDocumentBodyWrite({
            current: policy,
            incoming: '# Policy\n\n## Purpose\n\nChanged.\n\n## Scope\n\nChanged.\n',
            readComplete: true
        })
        expect(planned.markdown).toContain('Changed.')
    })

    it('treats replacing the only section as a full document replace', () => {
        const current = '## Scope\n\nOld scope.\n'
        expect(() =>
            planDocumentBodyWrite({
                current,
                incoming: '## Scope\n\nNew scope.\n',
                readComplete: false
            })
        ).toThrow(/complete markdown/)
    })

    it('names a missing section', () => {
        expect(() =>
            planDocumentBodyWrite({
                current: policy,
                incoming: '## Missing\n\nText.\n',
                readComplete: true
            })
        ).toThrow(/No section matches "Missing"/)
    })

    it('accepts markdown that still contains the document text', () => {
        expect(markdownCoversText(policy, 'Keep this purpose. Old scope. Keep definitions.')).toBe(true)
        expect(markdownCoversText('## Scope\n\nOld scope.', 'Keep this purpose. Old scope. Keep definitions.')).toBe(
            false
        )
    })

    it('builds the edit path with the version id', () => {
        expect(documentEditContentPath('doc-9', 15)).toBe(
            '/plan/documents/doc-9/edit-version?redirect=/plan/documents/doc-9&fillPendingVersion=15'
        )
    })
})
