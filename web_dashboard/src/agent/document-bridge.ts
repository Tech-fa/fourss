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
    acceptNewSections?: () => boolean
    api?: () => unknown
    changed?: () => void
}) {
    const previous = {
        read: window.__agentReadDocumentContent,
        editPath: window.__agentDocumentEditPath,
        insert: window.__agentInsertDocumentContent,
        acceptNewSections: window.__agentDocumentAcceptNewSections,
        api: window.__agentDocumentApi,
        changed: window.__agentDocumentChanged
    }
    if (source.read) window.__agentReadDocumentContent = source.read
    if (source.editPath) window.__agentDocumentEditPath = source.editPath
    if (source.insert) window.__agentInsertDocumentContent = source.insert
    if (source.acceptNewSections) window.__agentDocumentAcceptNewSections = source.acceptNewSections
    if (source.api) window.__agentDocumentApi = source.api
    if (source.changed) window.__agentDocumentChanged = source.changed
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
        if (
            source.acceptNewSections &&
            window.__agentDocumentAcceptNewSections === source.acceptNewSections
        ) {
            window.__agentDocumentAcceptNewSections = previous.acceptNewSections
        }
        if (source.api && window.__agentDocumentApi === source.api) {
            window.__agentDocumentApi = previous.api
        }
        if (source.changed && window.__agentDocumentChanged === source.changed) {
            window.__agentDocumentChanged = previous.changed
        }
    }
}

/** The add-document page has no saved body yet. Report that empty document before the editor is opened. */
export function readDocumentForAgent(input: {
    creating: boolean
    editorOpen: boolean
    readOpenEditor: () => Promise<AgentDocumentRead | null> | AgentDocumentRead | null
}) {
    if (input.creating && !input.editorOpen) return { markdown: '', complete: true }
    return input.readOpenEditor()
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
            if (inserted && editorKeptContent(current, markdown)) {
                onChanged()
                return true
            }
        }
        await new Promise((resolve) => setTimeout(resolve, 200))
    }
    throw new Error('The document editor is not ready.')
}

function editorKeptContent(editor: EditorHandle, markdown: string) {
    if (!markdown.trim()) return true
    const plain = editor.getPlainText?.() ?? ''
    const exported = editor.getMarkdown?.()
    const canRead = editor.getPlainText != null || typeof exported === 'string'
    if (!canRead) return true
    if (plain.trim()) return true
    return typeof exported === 'string' && exported.trim().length > 0
}
