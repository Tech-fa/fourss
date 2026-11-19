import { afterEach, describe, expect, it, vi } from 'vitest'
import { readDocumentForAgent, writeEditorMarkdown } from './document-bridge'

describe('document bridge', () => {
    afterEach(() => {
        vi.useRealTimers()
    })

    it('reports an empty document on the add page before the editor is opened', () => {
        const read = readDocumentForAgent({
            creating: true,
            editorOpen: false,
            readOpenEditor: () => {
                throw new Error('The editor is not open.')
            }
        })
        expect(read).toEqual({ markdown: '', complete: true })
    })

    it('reads the open editor once the new document is being edited', async () => {
        const read = await readDocumentForAgent({
            creating: true,
            editorOpen: true,
            readOpenEditor: async () => ({ markdown: '## 1. Purpose\n\nText.\n', complete: true })
        })
        expect(read).toEqual({ markdown: '## 1. Purpose\n\nText.\n', complete: true })
    })

    it('writes again until the editor keeps the text', async () => {
        vi.useFakeTimers()
        let text = ''
        let calls = 0
        const pending = writeEditorMarkdown(
            () => ({
                replaceContent: async () => {
                    calls += 1
                    if (calls > 1) text = '1. Purpose State the purpose.'
                    return true
                },
                getPlainText: () => text,
                getMarkdown: () => text
            }),
            '## 1. Purpose\n\nState the purpose.\n',
            () => {}
        )
        await vi.advanceTimersByTimeAsync(200)
        await expect(pending).resolves.toBe(true)
        expect(calls).toBe(2)
    })

    it('refuses a write that never stays in the editor', async () => {
        vi.useFakeTimers()
        const pending = writeEditorMarkdown(
            () => ({
                replaceContent: async () => true,
                getPlainText: () => '',
                getMarkdown: () => ''
            }),
            '## 1. Purpose\n\nState the purpose.\n',
            () => {}
        )
        const refused = expect(pending).rejects.toThrow(/not ready/)
        await vi.advanceTimersByTimeAsync(8000)
        await refused
    })
})
