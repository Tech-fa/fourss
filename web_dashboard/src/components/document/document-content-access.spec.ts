import { describe, expect, it } from 'vitest'
import { userCanEditDocumentContent } from './document-content-access'

describe('userCanEditDocumentContent', () => {
    const document = {
        createdBy: { id: 'owner' },
        contentContributors: [{ id: 'contributor' }],
    }

    it('allows the owner and content contributors to edit or create a version', () => {
        expect(userCanEditDocumentContent('owner', document)).toBe(true)
        expect(userCanEditDocumentContent('contributor', document)).toBe(true)
    })

    it('denies other users', () => {
        expect(userCanEditDocumentContent('reviewer', document)).toBe(false)
        expect(userCanEditDocumentContent('owner', null)).toBe(false)
    })
})
