import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import svgLoader from 'vite-svg-loader'

const htmlPlugin = (config: any) => {
    return {
        name: 'html-transform',
        transformIndexHtml(html: any) {
            // Transform the Vite client script path
            const clientScriptTag = `<script type="module" src="/@vite/client"></script>`
            const newClientScriptTag = `<script type="module" src="${config.base}@vite/client"></script>`
            html = html.replace(clientScriptTag, newClientScriptTag)

            // Transform the main application entry script path
            const mainScriptTag = `<script type="module" src="/src/main.ts"></script>`
            const newMainScriptTag = `<script type="module" src="${config.base}src/main.ts"></script>`
            html = html.replace(mainScriptTag, newMainScriptTag)

            return html
        }
    }
}
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    process.env = { ...process.env, ...loadEnv(mode, process.cwd()) }
    const base = process.env.VITE_BASE || '/'
    return {
        plugins: [
            vue(),
            vueJsx(),
            svgLoader(),
            htmlPlugin({ base })
        ],
        base,
        server: {
            port: +(process.env.VITE_PORT || 3003)
        },
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url))
            }
        }
    }
})
