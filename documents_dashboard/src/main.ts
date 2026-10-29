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

const bootstrap = async () => {
    await initializeRuntimeConfig()

    const app = createApp(App as any)
    const pinia = createPinia()
    app.use(pinia)
    app.use(router)
    app.use(i18n)
    app.mount('#app')
}

bootstrap()
