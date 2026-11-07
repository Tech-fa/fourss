import { PLAYGROUND_FRAME_NAMESPACE } from './iframe-bootstrap'

export type FrameMethod = 'sql' | 'fetch' | 'api'

export type FrameCall = {
    id: string
    method: FrameMethod
    payload: Record<string, unknown>
}

const METHODS = new Set<FrameMethod>(['sql', 'fetch', 'api'])

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
    if (!METHODS.has(message.method as FrameMethod)) return null
    const payload =
        message.payload && typeof message.payload === 'object'
            ? (message.payload as Record<string, unknown>)
            : {}
    return { call: { id: message.id, method: message.method as FrameMethod, payload } }
}

export function frameFile(value: unknown): File | undefined {
    if (value instanceof File) return value
    if (value instanceof Blob) {
        return new File([value], 'attachment', { type: value.type || 'application/octet-stream' })
    }
    if (!value || typeof value !== 'object') return undefined
    const file = value as { buffer?: unknown; type?: unknown; name?: unknown }
    const bytes =
        file.buffer instanceof ArrayBuffer
            ? new Uint8Array(file.buffer)
            : file.buffer instanceof Uint8Array
              ? file.buffer
              : null
    if (!bytes) return undefined
    const type = typeof file.type === 'string' && file.type ? file.type : 'application/octet-stream'
    const name = typeof file.name === 'string' && file.name ? file.name : 'attachment'
    return new File([bytes], name, { type })
}

export function frameCallWrites(call: FrameCall) {
    if (call.method !== 'api') return false
    return String(call.payload.method || 'GET').toUpperCase() !== 'GET'
}
