import { AUDIT_PROGRAM_GUIDE } from './audit-program'
import { INTEGRATIONS_GUIDE } from './integrations'
import { NON_CONFORMITY_GUIDE } from './non-conformity'
import { DOCUMENT_EDITOR_RULE, HELPER_OFF_MESSAGE, LEAVE_CONFIRMATION_TO_THE_USER, PLATFORM_CONTEXT, STAY_ON_PAGE_RULE, SUBMIT_FORM_REFUSAL, TASK_GUIDE_DESCRIPTION, TASK_GUIDE_RULE } from './instructions'
import { NO_PROCEDURE } from './task-guide'
import { AgentHelperBroker, type HelperHttpRequest, type HelperHttpResponse } from './helper-broker'

function signal() {
    return new AbortController().signal
}

function request(overrides: Partial<HelperHttpRequest> = {}): HelperHttpRequest {
    return {
        method: 'POST',
        path: '/__agent-helper/mcp',
        query: new URLSearchParams('token=secret'),
        host: '127.0.0.1:3003',
        origin: 'http://127.0.0.1:3003',
        site: 'same-origin',
        body: null,
        signal: signal(),
        ...overrides
    }
}

function mcp(name: string, args: Record<string, unknown> = {}, id = 1): HelperHttpRequest {
    return request({
        site: undefined,
        origin: undefined,
        body: {
            jsonrpc: '2.0',
            id,
            method: 'tools/call',
            params: { name, arguments: args }
        }
    })
}

function resultBody(response: HelperHttpResponse) {
    return (response.body as { result: { content: Array<{ text: string }>; isError?: boolean; structuredContent?: unknown } })
        .result
}

describe('agent helper broker', () => {
    it('tells a connected agent to stop before confirmation', async () => {
        const broker = new AgentHelperBroker('secret')
        const ready = await broker.handle(
            request({
                site: undefined,
                origin: undefined,
                body: {
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'initialize',
                    params: { protocolVersion: '2025-03-26' }
                }
            })
        )
        const body = ready.body as { result: { instructions: string; serverInfo: { name: string } } }
        expect(body.result.serverInfo.name).toBe('app-helper')
        expect(body.result.instructions.startsWith(PLATFORM_CONTEXT)).toBe(true)
        expect(body.result.instructions).toContain(TASK_GUIDE_RULE)
        expect(body.result.instructions).toContain(DOCUMENT_EDITOR_RULE)
        expect(body.result.instructions).toContain(LEAVE_CONFIRMATION_TO_THE_USER)
        expect(body.result.instructions).toContain(STAY_ON_PAGE_RULE)
        expect(body.result.instructions).not.toContain(AUDIT_PROGRAM_GUIDE)
        expect(body.result.instructions).not.toContain(NON_CONFORMITY_GUIDE)
        expect(body.result.instructions).not.toContain(INTEGRATIONS_GUIDE)
        expect(body.result.instructions).not.toContain('Creating an audit program')
        expect(body.result.instructions).not.toContain('then submit_form')

        const listed = await broker.handle(
            request({
                site: undefined,
                origin: undefined,
                body: { jsonrpc: '2.0', id: 2, method: 'tools/list' }
            })
        )
        const tools = (listed.body as { result: { tools: Array<{ name: string; description: string }> } }).result.tools
        expect(tools.map((tool) => tool.name)).toEqual([
            'task_guide',
            'list_pages',
            'navigate',
            'describe_page',
            'api_access',
            'set_fields',
            'select_option',
            'document_blocks',
            'document_apply',
            'apply_playground',
            'submit_form'
        ])
        expect(tools.find((tool) => tool.name === 'set_fields')?.description).toContain(
            'This does not write the document.'
        )
        expect(tools.find((tool) => tool.name === 'document_apply')?.description).toContain('create.heading')
        expect(tools.find((tool) => tool.name === 'api_access')?.description).toContain('localStorage')
        expect(tools.find((tool) => tool.name === 'apply_playground')?.description).toContain('It does not publish.')
        expect(tools.find((tool) => tool.name === 'select_option')?.description).toContain('multi-select')
        expect(tools.find((tool) => tool.name === 'describe_page')?.description).toContain('every select')
        expect(tools.find((tool) => tool.name === 'submit_form')?.description).toBe(SUBMIT_FORM_REFUSAL)
        expect(tools.find((tool) => tool.name === 'task_guide')?.description).toBe(TASK_GUIDE_DESCRIPTION)
        expect(tools.find((tool) => tool.name === 'task_guide')?.description).not.toContain('audit program')
    })

    it('returns only the procedure that matches the request', async () => {
        const broker = new AgentHelperBroker('secret', { waitMs: 30 })
        const waiting = broker.handle(request({ path: '/__agent-helper/wait', body: {} }))

        const documents = await broker.handle(
            mcp('task_guide', { intent: 'Build the quality manual and the document control procedure.' })
        )
        expect(resultBody(documents).isError).toBe(false)
        expect(resultBody(documents).content[0].text).toBe(NO_PROCEDURE)
        expect(resultBody(documents).content[0].text).not.toContain('Creating an audit program')
        expect(resultBody(documents).content[0].text).not.toContain('Working a non-conformity')
        expect(resultBody(documents).content[0].text).not.toContain('A connection is one row')

        const review = await broker.handle(mcp('task_guide', { intent: 'Please audit this document for completeness.' }))
        expect(resultBody(review).content[0].text).toBe(NO_PROCEDURE)

        const audit = await broker.handle(
            mcp('task_guide', { intent: 'Create an internal audit program for ISO 9001.' })
        )
        expect(resultBody(audit).content[0].text).toContain(AUDIT_PROGRAM_GUIDE)
        expect(resultBody(audit).content[0].text).not.toContain('Working a non-conformity')
        expect(resultBody(audit).content[0].text).not.toContain('A connection is one row')
        expect(resultBody(audit).content[0].text.length).toBeGreaterThan(AUDIT_PROGRAM_GUIDE.length)

        const finding = await broker.handle(
            mcp('task_guide', { intent: 'Log a non-conformity and run the five whys.' })
        )
        expect(resultBody(finding).content[0].text).toContain(NON_CONFORMITY_GUIDE)
        expect(resultBody(finding).content[0].text).not.toContain('Creating an audit program')

        const slack = await broker.handle(mcp('task_guide', { intent: 'Connect Slack.' }))
        expect(resultBody(slack).content[0].text).toContain(INTEGRATIONS_GUIDE)
        expect(resultBody(slack).content[0].text).not.toContain('Creating an audit program')

        const both = await broker.handle(
            mcp('task_guide', { intent: 'Create the audit program and a non-conformity.' })
        )
        expect(resultBody(both).content[0].text).toContain(AUDIT_PROGRAM_GUIDE)
        expect(resultBody(both).content[0].text).toContain(NON_CONFORMITY_GUIDE)
        expect(resultBody(both).content[0].text).not.toContain('A connection is one row')

        const missing = await broker.handle(mcp('task_guide', {}))
        expect(resultBody(missing).isError).toBe(true)
        expect(resultBody(missing).content[0].text).toBe('intent is required.')

        const page = await waiting
        expect(page.status).toBe(200)
        expect(page.body).toMatchObject({ idle: true })
        expect(page.body).not.toHaveProperty('call')
    })

    it('refuses submit_form without asking the page to click', async () => {
        const broker = new AgentHelperBroker('secret', { waitMs: 30 })
        const waiting = broker.handle(request({ path: '/__agent-helper/wait', body: {} }))
        const submitted = await broker.handle(mcp('submit_form', { button: 'Save' }))
        expect(resultBody(submitted).isError).toBe(true)
        expect(resultBody(submitted).content[0].text).toBe(SUBMIT_FORM_REFUSAL)

        const page = await waiting
        expect(page.status).toBe(200)
        expect(page.body).toMatchObject({ idle: true })
        expect(page.body).not.toHaveProperty('call')
    })

    it('gives the open tab a way to hand the agent the API and the browser token', async () => {
        const broker = new AgentHelperBroker('secret', { waitMs: 1000, callMs: 1000 })
        const turnedOff = await broker.handle(mcp('api_access'))
        expect(resultBody(turnedOff).content[0].text).toBe(HELPER_OFF_MESSAGE)
        expect(resultBody(turnedOff).content[0].text).not.toContain('Bearer')

        const waiting = broker.handle(request({ path: '/__agent-helper/wait', body: {} }))
        const calling = broker.handle(mcp('api_access'))
        const page = await waiting
        const call = (page.body as { pageId: string; call: { id: string; name: string } }).call
        expect(call.name).toBe('api_access')
        await broker.handle(
            request({
                path: '/__agent-helper/result',
                body: {
                    pageId: (page.body as { pageId: string }).pageId,
                    id: call.id,
                    ok: true,
                    result: {
                        openApiUrl: 'http://127.0.0.1:3012/docs-json',
                        authorization: 'Bearer browser-token'
                    }
                }
            })
        )
        expect(resultBody(await calling).structuredContent).toEqual({
            openApiUrl: 'http://127.0.0.1:3012/docs-json',
            authorization: 'Bearer browser-token'
        })
    })

    it('fills fields only while the dashboard tab is listening', async () => {
        const broker = new AgentHelperBroker('secret', { waitMs: 1000, callMs: 1000 })
        const turnedOff = await broker.handle(mcp('set_fields', { fields: { Title: 'Policy' } }))
        expect(resultBody(turnedOff).content[0].text).toBe(HELPER_OFF_MESSAGE)

        const waiting = broker.handle(request({ path: '/__agent-helper/wait', body: {} }))
        const calling = broker.handle(mcp('set_fields', { fields: { Title: 'Policy' } }))
        const page = await waiting
        const call = (page.body as { call: { id: string; name: string } }).call
        expect(call.name).toBe('set_fields')
        await broker.handle(
            request({
                path: '/__agent-helper/result',
                body: { pageId: (page.body as { pageId: string }).pageId, id: call.id, ok: true, result: { set: ['Title'] } }
            })
        )
        const filled = await calling
        expect(resultBody(filled).isError).toBe(false)
        expect(resultBody(filled).structuredContent).toEqual({ set: ['Title'] })
    })

    it('rejects another tab and a request from outside this computer', async () => {
        const broker = new AgentHelperBroker('secret', { waitMs: 40 })
        const controller = new AbortController()
        const first = broker.handle(
            request({ path: '/__agent-helper/wait', body: {}, signal: controller.signal })
        )
        const second = await broker.handle(request({ path: '/__agent-helper/wait', body: {} }))
        expect(second.status).toBe(409)
        controller.abort()
        expect((await first).status).toBe(499)

        const foreign = await broker.handle(request({ host: 'evil.example', site: undefined, origin: undefined }))
        expect(foreign.status).toBe(403)
        const missingToken = await broker.handle(request({ query: new URLSearchParams(), site: undefined, origin: undefined }))
        expect(missingToken.status).toBe(401)
        const browser = await broker.handle(
            request({
                site: 'cross-site',
                origin: 'http://evil.example',
                body: { jsonrpc: '2.0', id: 1, method: 'initialize' }
            })
        )
        expect(browser.status).toBe(403)
    })

    it('answers the streamable HTTP event-stream GET with method not allowed', async () => {
        const broker = new AgentHelperBroker('secret')
        const stream = await broker.handle(
            request({ method: 'GET', site: undefined, origin: undefined, body: null })
        )
        expect(stream.status).toBe(405)

        const browser = await broker.handle(
            request({
                method: 'GET',
                site: 'cross-site',
                origin: 'http://evil.example',
                body: null
            })
        )
        expect(browser.status).toBe(403)
    })

    it('lets a new tab take over after the first tab goes quiet', async () => {
        const broker = new AgentHelperBroker('secret', { waitMs: 15, staleMs: 20 })
        const first = await broker.handle(request({ path: '/__agent-helper/wait', body: {} }))
        const firstId = (first.body as { pageId: string }).pageId
        await new Promise((resolve) => setTimeout(resolve, 40))
        const second = await broker.handle(request({ path: '/__agent-helper/wait', body: {} }))
        expect((second.body as { pageId: string }).pageId).not.toBe(firstId)
    })

    it('gives the dashboard tab the MCP URL and withholds it from other clients', async () => {
        const broker = new AgentHelperBroker('secret')
        const hidden = await broker.handle(
            request({ method: 'GET', path: '/__agent-helper/session', site: undefined, origin: undefined, query: new URLSearchParams() })
        )
        expect(hidden.status).toBe(403)

        const session = await broker.handle(
            request({ method: 'GET', path: '/__agent-helper/session', query: new URLSearchParams() })
        )
        expect(session.status).toBe(200)
        expect(session.body).toMatchObject({
            token: 'secret',
            mcpUrl: 'http://127.0.0.1:3003/__agent-helper/mcp?token=secret'
        })
    })

    it('accepts the public API host for a signed-in account session', async () => {
        const broker = new AgentHelperBroker('secret', { access: 'account', waitMs: 1000, callMs: 1000 })
        const refused = await broker.handle(
            request({
                host: 'api.example.com',
                origin: 'https://dashboard.example.com',
                site: 'cross-site',
                query: new URLSearchParams()
            })
        )
        expect(refused.status).toBe(401)

        const waiting = broker.handle(
            request({
                host: 'api.example.com',
                origin: 'https://dashboard.example.com',
                site: 'cross-site',
                path: '/__agent-helper/wait',
                body: {}
            })
        )
        const calling = broker.handle(
            request({
                host: 'api.example.com',
                origin: undefined,
                site: undefined,
                body: {
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'tools/call',
                    params: { name: 'list_pages', arguments: {} }
                }
            })
        )
        const page = await waiting
        const call = (page.body as { pageId: string; call: { id: string; name: string } }).call
        expect(call.name).toBe('list_pages')
        await broker.handle(
            request({
                host: 'api.example.com',
                origin: 'https://dashboard.example.com',
                site: 'cross-site',
                path: '/__agent-helper/result',
                body: {
                    pageId: (page.body as { pageId: string }).pageId,
                    id: call.id,
                    ok: true,
                    result: { pages: [] }
                }
            })
        )
        expect(resultBody(await calling).isError).toBe(false)
    })
})
