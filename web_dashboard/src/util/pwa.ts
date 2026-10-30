const STANDALONE_MEDIA = [
    '(display-mode: standalone)',
    '(display-mode: fullscreen)',
    '(display-mode: minimal-ui)',
    '(display-mode: window-controls-overlay)'
] as const

export const BROWSER_IDLE_MS = 10 * 60 * 1000
export const STANDALONE_IDLE_MS = 30 * 60 * 1000
export const PWA_INSTALL_DISMISSED_KEY = 'pwa-install-dismissed'
export const IDLE_ACTIVITY_EVENTS = [
    'mousemove',
    'keydown',
    'click',
    'scroll',
    'touchstart',
    'touchend'
] as const

export interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[]
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type NavigatorStandalone = Navigator & { standalone?: boolean }

const matchesMedia = (query: string) => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return false
    }
    return window.matchMedia(query).matches
}

/** True when the app is installed (home screen / standalone window), not a browser tab. */
export const isStandaloneDisplay = () => {
    if (STANDALONE_MEDIA.some((query) => matchesMedia(query))) {
        return true
    }
    if (typeof navigator === 'undefined') {
        return false
    }
    return (navigator as NavigatorStandalone).standalone === true
}

/** iPhone / iPad Safari. Uses UA + touch points, never viewport width. */
export const isIosSafari = () => {
    if (typeof navigator === 'undefined') {
        return false
    }
    const ua = navigator.userAgent
    const iPhoneOrIpad = /iPhone|iPad|iPod/.test(ua)
    const iPadOsDesktopUa =
        navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1
    if (!iPhoneOrIpad && !iPadOsDesktopUa) {
        return false
    }
    return /WebKit/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua)
}

export const getIdleTimeoutMs = () =>
    isStandaloneDisplay() ? STANDALONE_IDLE_MS : BROWSER_IDLE_MS

export const isPwaInstallDismissed = () => {
    if (typeof localStorage === 'undefined') {
        return false
    }
    return localStorage.getItem(PWA_INSTALL_DISMISSED_KEY) === '1'
}

export const dismissPwaInstall = () => {
    localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, '1')
}
