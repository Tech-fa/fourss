import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import svgLoader from 'vite-svg-loader'
import { VitePWA } from 'vite-plugin-pwa'

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
    const isTest = mode === 'test' || Boolean(process.env.VITEST)
    return {
        plugins: [
            vue(),
            vueJsx(),
            svgLoader(),
            htmlPlugin({ base }), // Pass the base config to the plugin
            !isTest &&
                VitePWA({
                    registerType: 'autoUpdate',
                    includeAssets: [
                        'favicon.ico',
                        'apple-touch-icon.png',
                        'pwa-192x192.png',
                        'pwa-512x512.png',
                        'pwa-maskable-512x512.png',
                        'robots.txt'
                    ],
                    manifest: {
                        id: '/',
                        name: 'Documents',
                        short_name: 'Documents',
                        description: 'Document control, authentication, and permissions.',
                        theme_color: '#3b82f6',
                        background_color: '#f3f4f6',
                        display: 'standalone',
                        start_url: './',
                        scope: './',
                        lang: 'en',
                        icons: [
                            {
                                src: 'pwa-192x192.png',
                                sizes: '192x192',
                                type: 'image/png'
                            },
                            {
                                src: 'pwa-512x512.png',
                                sizes: '512x512',
                                type: 'image/png',
                                purpose: 'any'
                            },
                            {
                                src: 'pwa-maskable-512x512.png',
                                sizes: '512x512',
                                type: 'image/png',
                                purpose: 'maskable'
                            }
                        ]
                    },
                    workbox: {
                        clientsClaim: true,
                        skipWaiting: true,
                        cleanupOutdatedCaches: true,
                        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
                        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff,ttf,otf}'],
                        navigateFallback: 'index.html',
                        navigateFallbackDenylist: [/^\/config\.json$/],
                        runtimeCaching: [
                            {
                                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                                handler: 'CacheFirst',
                                options: {
                                    cacheName: 'google-fonts-css',
                                    expiration: {
                                        maxEntries: 8,
                                        maxAgeSeconds: 60 * 60 * 24 * 365
                                    },
                                    cacheableResponse: {
                                        statuses: [0, 200]
                                    }
                                }
                            },
                            {
                                urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                                handler: 'CacheFirst',
                                options: {
                                    cacheName: 'google-fonts-webfonts',
                                    expiration: {
                                        maxEntries: 20,
                                        maxAgeSeconds: 60 * 60 * 24 * 365
                                    },
                                    cacheableResponse: {
                                        statuses: [0, 200]
                                    }
                                }
                            }
                        ]
                    }
                })
        ].filter(Boolean),
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
