export const PLAYGROUND_SOURCE_LIMIT = 262144

export const PLAYGROUND_PAGE_MESSAGE = 'Open the Playground page first.'

export type PlaygroundAgentInput = {
    name?: string
    html?: string
    js?: string
    backend?: string
    source?: string
}

export type PlaygroundFiles = {
    indexHtml?: string
    appJs?: string
    serverJs?: string
}

export type PlaygroundAgentResult = {
    id: string
    name: string
    revision: number
}

export function playgroundFiles(input: PlaygroundAgentInput): PlaygroundFiles {
    const source = typeof input.source === 'string' ? input.source : ''
    const html = typeof input.html === 'string' ? input.html : ''
    const js = typeof input.js === 'string' ? input.js : ''
    const backend = typeof input.backend === 'string' ? input.backend : ''
    if (!source.trim() && !html.trim() && !js.trim() && !backend.trim()) {
        throw new Error('html, js, backend, or source is required.')
    }
    const files: PlaygroundFiles = {}
    if (source.trim()) files.appJs = limit(source)
    if (html.trim()) files.indexHtml = limit(html.includes('<html') ? html : wrap(html))
    if (js.trim()) files.appJs = limit(js)
    if (backend.trim()) files.serverJs = limit(backend)
    return files
}

function wrap(html: string) {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
</head>
<body>
${html}
<script src="app.js"></script>
</body>
</html>
`
}

export async function runAgentPlayground(args: Record<string, unknown>) {
    const apply = window.__agentApplyPlayground
    if (!apply) throw new Error(PLAYGROUND_PAGE_MESSAGE)
    return apply({
        name: typeof args.name === 'string' ? args.name : undefined,
        html: typeof args.html === 'string' ? args.html : undefined,
        js: typeof args.js === 'string' ? args.js : undefined,
        backend: typeof args.backend === 'string' ? args.backend : undefined,
        source: typeof args.source === 'string' ? args.source : undefined
    })
}

function limit(source: string) {
    if (source.length > PLAYGROUND_SOURCE_LIMIT) throw new Error('The playground program is too long.')
    return source
}

declare global {
    interface Window {
        __agentApplyPlayground?: (input: string | PlaygroundAgentInput) => Promise<PlaygroundAgentResult>
    }
}
