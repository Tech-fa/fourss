import { describe, expect, it } from 'vitest'
import { IFRAME_BOOTSTRAP } from './iframe-bootstrap'
import { frameCallUsesRecordWrite, readFrameMessage } from './host-bridge'

describe('playground iframe', () => {
    it('locks the frame down and does not embed a user program', () => {
        expect(IFRAME_BOOTSTRAP).toContain("connect-src 'none'")
        expect(IFRAME_BOOTSTRAP).toContain("form-action 'none'")
        expect(IFRAME_BOOTSTRAP).not.toContain('inspection_note')
        expect(IFRAME_BOOTSTRAP).not.toContain('allow-same-origin')
    })

    it('ignores messages that are not from the frame', () => {
        const frame = {} as Window
        expect(readFrameMessage({ namespace: 'fourss-playground', type: 'ready' }, {} as Window, frame)).toBeNull()
    })

    it('maps a save to a record write and a get to a read', () => {
        const frame = {} as Window
        const save = readFrameMessage(
            {
                namespace: 'fourss-playground',
                type: 'call',
                id: '1',
                method: 'save',
                payload: { entityType: 'inspection_note', data: { note: 'Torque' } }
            },
            frame,
            frame
        )
        const get = readFrameMessage(
            {
                namespace: 'fourss-playground',
                type: 'call',
                id: '2',
                method: 'get',
                payload: { entityType: 'document', entityId: 'doc-1' }
            },
            frame,
            frame
        )
        expect(save && 'call' in save && frameCallUsesRecordWrite(save.call.method)).toBe(true)
        expect(get && 'call' in get && frameCallUsesRecordWrite(get.call.method)).toBe(false)
    })
})
