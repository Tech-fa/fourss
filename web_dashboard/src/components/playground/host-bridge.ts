import { PLAYGROUND_FRAME_NAMESPACE } from './iframe-bootstrap'

export type FrameCall = {
    id: string
    method: 'get' | 'list' | 'save' | 'remove' | 'fail'
    payload: Record<string, unknown>
}

export function readFrameMessage(
    data: unknown,
    source: MessageEventSource | null,
    frame: Window | null
): { ready: true } | { call: FrameCall } | null {
    if (!frame || source !== frame) return null
    if (!data || typeof data !== 'object') return null
    const message = data as { namespace?: string; type?: string; id?: string; method?: string; payload?: unknown }
    if (message.namespace !== PLAYGROUND_FRAME_NAMESPACE) return null
    if (message.type === 'ready') return { ready: true }
    if (message.type !== 'call' || typeof message.id !== 'string') return null
    if (
        message.method !== 'get' &&
        message.method !== 'list' &&
        message.method !== 'save' &&
        message.method !== 'remove' &&
        message.method !== 'fail'
    ) {
        return null
    }
    const payload =
        message.payload && typeof message.payload === 'object'
            ? (message.payload as Record<string, unknown>)
            : {}
    return { call: { id: message.id, method: message.method, payload } }
}

export function frameCallUsesRecordWrite(method: FrameCall['method']) {
    return method === 'save' || method === 'remove'
}
