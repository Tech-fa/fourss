import { onUnmounted } from 'vue'

const LIST_CODE_KEY = 'fourss.sharedStandardListCode'

export function rememberSharedListCode(code: string) {
    sessionStorage.setItem(LIST_CODE_KEY, code)
}

export function readSharedListCode(): string | null {
    const value = sessionStorage.getItem(LIST_CODE_KEY)
    if (!value || value.length > 4096) return null
    return value
}

export function usePrivateSharePage(blockSave = false) {
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex, nofollow'
    const referrer = document.createElement('meta')
    referrer.name = 'referrer'
    referrer.content = 'no-referrer'
    document.head.appendChild(robots)
    document.head.appendChild(referrer)

    const onKey = (event: KeyboardEvent) => {
        if ((event.ctrlKey || event.metaKey) && ['s', 'p'].includes(event.key.toLowerCase())) {
            event.preventDefault()
        }
    }
    if (blockSave) window.addEventListener('keydown', onKey)

    onUnmounted(() => {
        robots.remove()
        referrer.remove()
        if (blockSave) window.removeEventListener('keydown', onKey)
    })
}
