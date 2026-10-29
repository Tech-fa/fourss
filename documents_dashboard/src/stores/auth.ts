// stores/auth.ts
import { getRootUnits, parseJwt } from '@/util/util'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import i18n from '@/i18n'
import { apiCall } from '@/util/api'
export interface UserDetails {
    permissions: Permission[]
    companyName?: string
    id: string
    teams: { id: number, name: string }[]
    fname?: string
    lname?: string
    email?: string
    isTopManagement?: boolean
    isAdmin?: boolean
}
interface Permission {
    subject: string
    action: string
}
export interface AuthState {
    isLoggedIn: boolean
    token: string | null
    userDetails: UserDetails
    expiryDate: number
}
export interface PermissionTree {
    subject: string
    actions: string[]
    ownerOnlyActions?: string[]
    submodules?: PermissionTree[]
    label: string
}
export const useAuthStore = defineStore('auth', () => {
    const initialAuth = JSON.parse(localStorage.getItem('auth') || '{}')
    const initialPermissions = JSON.parse(localStorage.getItem('permissions') || '{}') as {
        [key: string]: PermissionTree
    }

    const permissions = ref<{ [key: string]: PermissionTree }>(initialPermissions)
    const locale = ref<'en' | 'ar' | 'fr'>((localStorage.getItem('locale') as 'en' | 'ar' | 'fr') || 'en')

    const state = ref<AuthState>({
        isLoggedIn: initialAuth.isLoggedIn || false,
        token: initialAuth.token || null,
        userDetails: initialAuth.userDetails || {},
        expiryDate: initialAuth.expiryDate || 0,
    })
    function setLoginState(token: string, userDetails: UserDetails & { locale?: 'en' | 'ar'| 'fr' }) {
        const expiryDate = parseJwt(token).exp
        state.value.token = token
        state.value.isLoggedIn = true
        state.value.userDetails = userDetails
        state.value.expiryDate = expiryDate

        localStorage.setItem(
            'auth',
            JSON.stringify({
                token,
                isLoggedIn: true,
                userDetails,
                expiryDate
            })
        )
        if (userDetails.locale) {
            setLocale(userDetails.locale)
        }
    }
    function renewToken(token: string, userDetails: UserDetails) {
        const expiryDate = parseJwt(token).exp
        state.value = { ...state.value, token, expiryDate, userDetails }
        localStorage.setItem(
            'auth',
            JSON.stringify({
                token,
                isLoggedIn: true,
                userDetails,
                expiryDate
            })
        )
    }
    function logout() {
        const userId = state.value.userDetails?.id || state.value.userDetails?.email
        if (userId) {
            localStorage.removeItem(`agentChat:${userId}`)
        }
        state.value.token = null
        state.value.isLoggedIn = false
        state.value.userDetails = {} as UserDetails
        state.value.expiryDate = 0
        localStorage.removeItem('auth')
        localStorage.removeItem('permissions')
    }

    function isAdmin() {
        const details = state.value.userDetails
        if (typeof details?.isAdmin === 'boolean') {
            return details.isAdmin
        }
        return (details?.permissions || []).some(
            (permission) => permission.subject === 'all' && permission.action === 'manage'
        )
    }
    function hasPermissions({ subject, actions }: { subject: string; actions: string[] }) {
        if (!subject || !actions) {
            return false
        }
        const userPermissions = state.value.userDetails.permissions
       
        const userHasPermission = userPermissions?.find((permission) => {
            return (
                (permission.subject === subject ||
                    permission.subject === 'all' ||
                     Object.values(permissions.value).find(p => p.subject === permission.subject)?.submodules?.some(
                        (submodule) => submodule.subject == subject
                    )) &&
                (actions.includes(permission.action) || permission.action === 'manage')
            )
        })
        return !!userHasPermission
    }
    function setPermissionTree(permissionTree: { [key: string]: PermissionTree }) {
        permissions.value = permissionTree
        localStorage.setItem('permissions', JSON.stringify(permissionTree))
    }
    function setLocale(lang: 'en' | 'ar' | 'fr') {
        locale.value = lang
        localStorage.setItem('locale', lang)
        i18n.global.locale.value = lang
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
        if (state.value.token) {
            apiCall.patch('/users/me/locale', { locale: lang }, {
                headers: { authorization: state.value.token },
            }).catch(() => {})
        }
    }
    return {
        state,
        locale,
        setLoginState,
        logout,
        hasPermissions,
        isAdmin,
        renewToken,
        setPermissionTree,
        setLocale,
        permissions
    }
})
