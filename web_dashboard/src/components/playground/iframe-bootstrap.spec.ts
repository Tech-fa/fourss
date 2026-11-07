import { describe, expect, it } from 'vitest'
import { playgroundFrame } from './iframe-bootstrap'
import { frameCallWrites, frameFile, readFrameMessage } from './host-bridge'

describe('playground iframe', () => {
    it('locks the frame down and inlines the playground script', () => {
        const frame = playgroundFrame('<h1>Hello</h1><script src="app.js"></script>', 'app.textContent = "Hi"', true)
        expect(frame).toContain("connect-src 'none'")
        expect(frame).toContain('arrayBuffer')
        expect(frame).toContain("form-action 'none'")
        expect(frame).toContain('app.textContent = "Hi"')
        expect(frame).toContain('<h1>Hello</h1>')
        expect(frame).not.toContain('src="app.js"')
        expect(frame).not.toContain('allow-same-origin')
    })

    it('ignores messages that are not from the frame', () => {
        const frame = {} as Window
        expect(readFrameMessage({ namespace: 'fourss-playground', type: 'ready' }, {} as Window, frame)).toBeNull()
    })

    it('treats a playground route that sends a file as a write and a fetch as a read', () => {
        const frame = {} as Window
        const write = readFrameMessage(
            {
                namespace: 'fourss-playground',
                type: 'call',
                id: '1',
                method: 'api',
                payload: { path: '/photos', method: 'POST', file: new Blob(['Torque'], { type: 'text/plain' }) }
            },
            frame,
            frame
        )
        const fetch = readFrameMessage(
            {
                namespace: 'fourss-playground',
                type: 'call',
                id: '2',
                method: 'fetch',
                payload: { path: '/documents/doc-1' }
            },
            frame,
            frame
        )
        expect(write && 'call' in write && frameCallWrites(write.call)).toBe(true)
        const buffer = new Uint8Array([1, 2, 3, 4]).buffer
        const rebuilt = frameFile({
            name: 'shot.png',
            type: 'image/png',
            buffer
        })
        expect(rebuilt?.name).toBe('shot.png')
        expect(rebuilt?.type).toBe('image/png')
        expect(rebuilt?.size).toBe(4)
        expect(fetch && 'call' in fetch && frameCallWrites(fetch.call)).toBe(false)
    })
})
