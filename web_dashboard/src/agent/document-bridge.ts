import { markdownCoversText, type AgentDocumentRead } from './document-markdown'

type EditorHandle = {
    isReady?: boolean
    getMarkdown?: () => string | null
    getPlainText?: () => string
    replaceContent?: (content: string, contentType?: 'markdown') => Promise<boolean> | boolean
    insertContent?: (content: string, contentType?: 'markdown') => Promise<boolean> | boolean
}

export function installAgentDocumentBridge(source: {
    read?: () => Promise<AgentDocumentRead | null> | AgentDocumentRead | null
    editPath?: () => string
    insert?: (markdown: string) => Promise<boolean | void> | boolean | void
}) {
    const previous = {
        read: window.__agentReadDocumentContent,
        editPath: window.__agentDocumentEditPath,
        insert: window.__agentInsertDocumentContent
    }
    if (source.read) window.__agentReadDocumentContent = source.read
    if (source.editPath) window.__agentDocumentEditPath = source.editPath
    if (source.insert) window.__agentInsertDocumentContent = source.insert
    return () => {
        if (source.read && window.__agentReadDocumentContent === source.read) {
            window.__agentReadDocumentContent = previous.read
        }
        if (source.editPath && window.__agentDocumentEditPath === source.editPath) {
            window.__agentDocumentEditPath = previous.editPath
        }
        if (source.insert && window.__agentInsertDocumentContent === source.insert) {
            window.__agentInsertDocumentContent = previous.insert
        }
    }
}

export async function readReadyDocument(
    read: () => { markdown: string; plainText: string } | null,
    giveUp?: () => boolean
): Promise<AgentDocumentRead | null> {
    const deadline = Date.now() + 8000
    while (Date.now() < deadline) {
        if (giveUp?.()) return null
        const value = read()
        if (value) {
            return {
                markdown: value.markdown,
                complete: markdownCoversText(value.markdown, value.plainText)
            }
        }
        await new Promise((resolve) => setTimeout(resolve, 200))
    }
    return null
}

export function readEditorDocument(editor: EditorHandle | null) {
    if (!editor?.isReady || !editor.getMarkdown) return null
    const markdown = editor.getMarkdown()
    if (typeof markdown !== 'string') return null
    return { markdown, plainText: editor.getPlainText?.() ?? '' }
}

export async function writeEditorMarkdown(
    editor: () => EditorHandle | null,
    markdown: string,
    onChanged: () => void
) {
    const deadline = Date.now() + 8000
    while (Date.now() < deadline) {
        const current = editor()
        if (current) {
            const inserted = current.replaceContent
                ? await current.replaceContent(markdown, 'markdown')
                : await current.insertContent?.(markdown, 'markdown')
            if (inserted) {
                onChanged()
                return true
            }
        }
        await new Promise((resolve) => setTimeout(resolve, 200))
    }
    throw new Error('The document editor is not ready.')
}
