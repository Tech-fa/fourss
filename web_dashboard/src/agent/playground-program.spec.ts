import { describe, expect, it } from 'vitest'
import { playgroundFiles } from './playground-program'

describe('playground files', () => {
    it('puts html in the page and leaves the script for app.js', () => {
        const files = playgroundFiles({ html: '<h1>Hello</h1>' })
        expect(files.indexHtml).toContain('<h1>Hello</h1>')
        expect(files.indexHtml).toContain('app.js')
        expect(files.appJs).toBeUndefined()
        expect(files.serverJs).toBeUndefined()
    })

    it('stores a server function and a browser script', () => {
        const files = playgroundFiles({
            js: 'playground.sql("select 1")',
            backend: "route('POST', '/notes', async (playground, request) => request.body)"
        })
        expect(files.appJs).toContain('playground.sql')
        expect(files.serverJs).toContain("route('POST', '/notes'")
    })

    it('stores a full script as app.js', () => {
        const source = 'const app = document.getElementById("app")'
        expect(playgroundFiles({ source, html: '<p>ignored</p>' }).appJs).toBe(source)
        expect(playgroundFiles({ source, html: '<p>kept</p>' }).indexHtml).toContain('<p>kept</p>')
    })

    it('requires html, js, backend, or source', () => {
        expect(() => playgroundFiles({})).toThrow('html, js, backend, or source is required.')
    })
})
