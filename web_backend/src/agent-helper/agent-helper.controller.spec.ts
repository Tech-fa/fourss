import { AgentHelperController } from './agent-helper.controller'
import type { Request, Response } from 'express'

function fakeResponse() {
    let statusCode = 200
    let payload: unknown = null
    let ended = false
    const res = {
        status(code: number) {
            statusCode = code
            return res
        },
        json(body: unknown) {
            payload = body
            ended = true
            return res
        },
        setHeader() {
            return res
        },
        send(body: unknown) {
            payload = body
            ended = true
            return res
        },
        end() {
            ended = true
            return res
        },
        get writableEnded() {
            return ended
        },
        on() {
            return res
        }
    }
    return {
        res: res as unknown as Response,
        read: () => ({ statusCode, payload })
    }
}

function fakeRequest(overrides: Partial<Request> & { user?: { id?: string } } = {}) {
    return {
        method: 'POST',
        path: '/__agent-helper/mcp',
        headers: { host: 'api.example.com' },
        query: {},
        body: null,
        ...overrides
    } as Request & { user?: { id?: string } }
}

describe('agent helper controller', () => {
    it('gives a signed-in user a token and refuses everyone else', async () => {
        const controller = new AgentHelperController()
        const missing = fakeResponse()
        controller.open(fakeRequest({ path: '/__agent-helper/session' }), missing.res)
        expect(missing.read().statusCode).toBe(401)

        const opened = fakeResponse()
        controller.open(fakeRequest({ path: '/__agent-helper/session', user: { id: 'user-1' } }), opened.res)
        const token = (opened.read().payload as { token: string }).token
        expect(token).toEqual(expect.any(String))

        const blocked = fakeResponse()
        await controller.mcp(fakeRequest({ headers: { host: 'api.example.com' }, query: {} }), blocked.res)
        expect(blocked.read().statusCode).toBe(401)
    })

    it('keeps one token for a login across reloads and mints a new one after that login ends', async () => {
        const controller = new AgentHelperController()
        const first = fakeResponse()
        controller.open(fakeRequest({ user: { id: 'user-1' } }), first.res)
        const firstToken = (first.read().payload as { token: string }).token

        const reloaded = fakeResponse()
        await controller.release(
            fakeRequest({
                path: '/__agent-helper/release',
                query: { token: firstToken },
                body: { pageId: 'p1' }
            }),
            reloaded.res
        )

        const second = fakeResponse()
        controller.open(fakeRequest({ user: { id: 'user-1' } }), second.res)
        expect((second.read().payload as { token: string }).token).toBe(firstToken)

        const listed = fakeResponse()
        await controller.mcp(
            fakeRequest({
                headers: { host: 'api.example.com' },
                query: { token: firstToken },
                body: { jsonrpc: '2.0', id: 1, method: 'tools/list' }
            }),
            listed.res
        )
        expect(listed.read().statusCode).toBe(200)

        const ended = fakeResponse()
        controller.end(fakeRequest({ user: { id: 'user-1' } }), ended.res)
        expect(ended.read().statusCode).toBe(204)

        const stale = fakeResponse()
        await controller.mcp(
            fakeRequest({
                headers: { host: 'api.example.com' },
                query: { token: firstToken },
                body: { jsonrpc: '2.0', id: 1, method: 'tools/list' }
            }),
            stale.res
        )
        expect(stale.read().statusCode).toBe(401)

        const nextLogin = fakeResponse()
        controller.open(fakeRequest({ user: { id: 'user-1' } }), nextLogin.res)
        expect((nextLogin.read().payload as { token: string }).token).not.toBe(firstToken)
    })

    it('adopts the token this login already published and will not take another user\'s', () => {
        const controller = new AgentHelperController()
        const kept = 'a'.repeat(43)
        const opened = fakeResponse()
        controller.open(
            fakeRequest({ user: { id: 'user-1' }, body: { token: kept } }),
            opened.res
        )
        expect((opened.read().payload as { token: string }).token).toBe(kept)

        const again = fakeResponse()
        controller.open(
            fakeRequest({ user: { id: 'user-1' }, body: { token: 'b'.repeat(43) } }),
            again.res
        )
        expect((again.read().payload as { token: string }).token).toBe(kept)

        const other = fakeResponse()
        controller.open(
            fakeRequest({ user: { id: 'user-2' }, body: { token: kept } }),
            other.res
        )
        expect((other.read().payload as { token: string }).token).not.toBe(kept)
    })
})
