import { describe, expect, it } from 'vitest'
import {
    applyDocumentOperations,
    documentOperations,
    readDocumentBlocks,
    type DocumentApi
} from './document-commands'

describe('document commands', () => {
    it('keeps the SuperDoc write operations and refuses the rest', () => {
        expect(
            documentOperations([
                { operationId: 'create.heading', input: { level: 1, text: 'Purpose', at: { kind: 'documentEnd' } } }
            ])
        ).toEqual([
            {
                operationId: 'create.heading',
                input: { level: 1, text: 'Purpose', at: { kind: 'documentEnd' } }
            }
        ])
        expect(() => documentOperations([{ operationId: 'clearContent', input: {} }])).toThrow(/not available/)
    })

    it('reads a window of blocks from the open editor', () => {
        const api: DocumentApi = {
            blocks: {
                list: (input) => {
                    expect(input).toMatchObject({ offset: 0, limit: 40, includeText: true })
                    return {
                        total: 2,
                        blocks: [
                            { ordinal: 1, nodeId: 'h1', nodeType: 'heading', headingLevel: 1, text: 'Purpose' },
                            {
                                ordinal: 2,
                                nodeId: 'p1',
                                nodeType: 'paragraph',
                                text: 'The purpose.',
                                numbering: { marker: '1.' }
                            }
                        ]
                    }
                }
            }
        }
        expect(readDocumentBlocks(api, {})).toEqual({
            total: 2,
            blocks: [
                { ordinal: 1, nodeId: 'h1', nodeType: 'heading', headingLevel: 1, text: 'Purpose' },
                { ordinal: 2, nodeId: 'p1', nodeType: 'paragraph', text: 'The purpose.', marker: '1.' }
            ]
        })
    })

    it('applies operations through the document plan and reports a failed one', () => {
        const applied: unknown[] = []
        const api: DocumentApi = {
            plan: {
                execute: (input) => {
                    applied.push(input.entries)
                    return { failure: { operationId: 'create.table', message: 'rows is required.' } }
                }
            }
        }
        expect(() =>
            applyDocumentOperations(api, [{ operationId: 'create.table', input: { columns: 2 } }])
        ).toThrow('rows is required.')
        expect(applied).toEqual([[{ operationId: 'create.table', input: { columns: 2 } }]])
    })
})
