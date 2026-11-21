import { randomBytes } from 'crypto'
import { All, Controller, Post, Req, Res } from '@nestjs/common'
import type { Request, Response } from 'express'
import { ApiExcludeController } from '@nestjs/swagger'
import { Public } from '../util/constants'
import { AgentHelperBroker, type HelperHttpResponse } from './helper-broker'

type AuthedRequest = Request & { user?: { id?: string } }

@ApiExcludeController()
@Controller('__agent-helper')
export class AgentHelperController {
    private readonly sessions = new Map<string, { userId: string; broker: AgentHelperBroker }>()
    private readonly byUser = new Map<string, string>()

    @Post('session')
    open(@Req() req: AuthedRequest, @Res() res: Response) {
        const userId = String(req.user?.id || '')
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized.' })
            return
        }
        const token = this.tokenFor(userId, requestedToken(req.body))
        res.status(200).json({ token })
    }

    @Post('session/end')
    end(@Req() req: AuthedRequest, @Res() res: Response) {
        const userId = String(req.user?.id || '')
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized.' })
            return
        }
        this.replaceUser(userId)
        res.status(204).end()
    }

    @Public()
    @All('mcp')
    mcp(@Req() req: Request, @Res() res: Response) {
        return this.forward(req, res)
    }

    @Public()
    @Post('wait')
    wait(@Req() req: Request, @Res() res: Response) {
        return this.forward(req, res)
    }

    @Public()
    @Post('result')
    result(@Req() req: Request, @Res() res: Response) {
        return this.forward(req, res)
    }

    @Public()
    @Post('release')
    release(@Req() req: Request, @Res() res: Response) {
        return this.forward(req, res)
    }

    private tokenFor(userId: string, requested: string) {
        const current = this.byUser.get(userId)
        if (current && this.sessions.has(current)) return current
        if (requested && this.canAdopt(userId, requested)) {
            this.bind(userId, requested)
            return requested
        }
        const token = randomBytes(32).toString('base64url')
        this.bind(userId, token)
        return token
    }

    private canAdopt(userId: string, token: string) {
        if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return false
        const existing = this.sessions.get(token)
        return !existing || existing.userId === userId
    }

    private bind(userId: string, token: string) {
        if (!this.sessions.has(token)) {
            this.sessions.set(token, {
                userId,
                broker: new AgentHelperBroker(token, { access: 'account' })
            })
        }
        this.byUser.set(userId, token)
    }

    private replaceUser(userId: string) {
        const previous = this.byUser.get(userId)
        if (previous) this.drop(previous)
    }

    private drop(token: string) {
        const session = this.sessions.get(token)
        if (!session) return
        session.broker.close()
        this.sessions.delete(token)
        if (this.byUser.get(session.userId) === token) this.byUser.delete(session.userId)
    }

    private async forward(req: Request, res: Response) {
        const token = tokenFrom(req)
        const session = token ? this.sessions.get(token) : undefined
        if (!session) {
            res.status(401).json({ error: 'Unauthorized.' })
            return
        }
        const signal = abortWhenClosed(res)
        const response = await session.broker.handle({
            method: req.method,
            path: req.path,
            query: new URLSearchParams(token ? { token } : {}),
            host: req.headers.host || 'localhost',
            origin: header(req, 'origin'),
            site: header(req, 'sec-fetch-site'),
            body: req.body ?? null,
            signal
        })
        write(res, response)
    }
}

function tokenFrom(req: Request) {
    const token = req.query.token
    return typeof token === 'string' ? token : ''
}

function requestedToken(body: unknown) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return ''
    const token = (body as { token?: unknown }).token
    return typeof token === 'string' ? token.trim() : ''
}

function header(req: Request, name: string) {
    const value = req.headers[name]
    return typeof value === 'string' ? value : undefined
}

function abortWhenClosed(res: Response) {
    const controller = new AbortController()
    res.on('close', () => {
        if (!res.writableEnded) controller.abort()
    })
    return controller.signal
}

function write(res: Response, response: HelperHttpResponse) {
    if (res.writableEnded) return
    res.status(response.status)
    res.setHeader('cache-control', 'no-store')
    if (response.body == null) {
        res.end()
        return
    }
    res.setHeader('content-type', 'application/json')
    res.send(response.body)
}
