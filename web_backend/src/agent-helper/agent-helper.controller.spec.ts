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

    it('replaces the previous session when the same user turns the helper on again', async () => {
        const controller = new AgentHelperController()
        const first = fakeResponse()
        controller.open(fakeRequest({ user: { id: 'user-1' } }), first.res)
        const firstToken = (first.read().payload as { token: string }).token

        const second = fakeResponse()
        controller.open(fakeRequest({ user: { id: 'user-1' } }), second.res)
        const secondToken = (second.read().payload as { token: string }).token
        expect(secondToken).not.toBe(firstToken)

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

        const listed = fakeResponse()
        await controller.mcp(
            fakeRequest({
                headers: { host: 'api.example.com' },
                query: { token: secondToken },
                body: { jsonrpc: '2.0', id: 1, method: 'tools/list' }
            }),
            listed.res
        )
        expect(listed.read().statusCode).toBe(200)
        const tools = (
            listed.read().payload as { result: { tools: Array<{ name: string }> } }
        ).result.tools
        expect(tools.map((tool) => tool.name)).toContain('api_access')
        expect(tools.map((tool) => tool.name)).toContain('submit_form')
    })
})
