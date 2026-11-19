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

    it('writes the first section into an empty document', () => {
        const planned = planDocumentBodyWrite({
            current: '',
            incoming: '## 1. Purpose\n\nState the purpose.\n',
            readComplete: true
        })
        expect(planned.markdown).toContain('1. Purpose')
        expect(planned.markdown).toContain('State the purpose.')
    })

    it('writes a whole document into an empty editor before any section exists', () => {
        const incoming = '# Policy\n\n## 1. Purpose\n\nState the purpose.\n\n## 2. Scope\n\nThe scope.\n'
        const planned = planDocumentBodyWrite({
            current: ' \n',
            incoming,
            readComplete: false
        })
        expect(planned.markdown).toContain('State the purpose.')
        expect(planned.markdown).toContain('The scope.')
    })

    it('adds a missing section while a new document is being written', () => {
        const planned = planDocumentBodyWrite({
            current: '## 1. Purpose\n\nKeep this purpose.\n',
            incoming: '## 2. Scope\n\nThe scope.\n',
            readComplete: true,
            acceptNewSections: true
        })
        expect(planned.markdown).toContain('Keep this purpose.')
        expect(planned.markdown).toContain('2. Scope')
        expect(planned.markdown).toContain('The scope.')
    })

    it('replaces a new document when the next write is the whole document', () => {
        const planned = planDocumentBodyWrite({
            current: '## 1. Purpose\n\nKeep this purpose.\n',
            incoming: '# Policy\n\n## 1. Purpose\n\nState the purpose.\n\n## 2. Scope\n\nThe scope.\n',
            readComplete: true,
            acceptNewSections: true
        })
        expect(planned.markdown).toContain('# Policy')
        expect(planned.markdown).toContain('The scope.')
        expect(planned.markdown).not.toContain('Keep this purpose.')
    })

    it('still replaces one existing section while new sections are allowed', () => {
        const planned = planDocumentBodyWrite({
            current: policy,
            incoming: '## Scope\n\nNew scope.\n',
            readComplete: false,
            acceptNewSections: true
        })
        expect(planned.markdown).toContain('Keep this purpose.')
        expect(planned.markdown).toContain('New scope.')
        expect(planned.markdown).not.toContain('Old scope.')
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
