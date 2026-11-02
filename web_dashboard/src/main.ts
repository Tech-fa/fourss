import './assets/main.css'
import './assets/calendar.css'
import './assets/document-editor-fonts.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
import 'superdoc/style.css'
import './assets/superdoc-document-fonts.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { initializeRuntimeConfig } from './util/runtime-config'
import { installAgentPageLinks } from './agent/install-page-links'

const clearInstalledPwa = () => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
        return
    }
    navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
            registration.unregister()
        })
    })
    if ('caches' in window) {
        caches.keys().then((keys) => {
            keys.forEach((key) => {
                caches.delete(key)
            })
        })
    }
}

const bootstrap = async () => {
    clearInstalledPwa()
    await initializeRuntimeConfig()

    const app = createApp(App as any)
    const pinia = createPinia()
    app.use(pinia)
    app.use(router)
    installAgentPageLinks(router)
    app.use(i18n)
    app.mount('#app')
}

bootstrap()
