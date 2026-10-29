import axios from 'axios'
import { getRuntimeConfig } from './runtime-config'

interface AuthStore {
    logout: Function
    setLoginState: Function
    renewToken: Function
    state: { token: string | null; expiryDate: number }
    hasPermissions: Function
}

export const apiCall = axios.create({
    baseURL: getRuntimeConfig().apiUrl
})

apiCall.interceptors.request.use((config) => {
    const locale = localStorage.getItem('locale') || 'en'
    config.baseURL = getRuntimeConfig().apiUrl
    config.headers['x-locale'] = locale
    return config
})

export const apiGet = async <T>(
    path: string,
    authStore: AuthStore,
    params: { [key: string]: any } = {}
) => {
    try {
        renewToken(authStore)
        const response = await apiCall.get<T>(path, {
            headers: { authorization: authStore.state.token },
            params
        })
        return await response.data
    } catch (error) {
        checkAuth(error, authStore)
        throw error
    }
}

export const apiGetPublic = async <T>(path: string) => {
    const response = await apiCall.get<T>(path)
    return await response.data
}

export const apiPostPublic = async <T>(path: string, body: { [key: string]: any }) => {
    const response = await apiCall.post<T>(path, body)

    return await response.data
}

const checkAuth = (error: any, authStore: AuthStore) => {
    if (error?.message?.includes('401') || error?.message?.includes('403')) {
        authStore.logout()
    }
}
export const apiPost = async <T>(
    path: string,
    body: { [key: string]: any },
    authStore: AuthStore
) => {
    try {
        renewToken(authStore)
        const response = await apiCall.post<T>(path, body, {
            headers: { authorization: authStore.state.token }
        })

        return await response.data
    } catch (error) {
        checkAuth(error, authStore)
        throw error
    }
}

export const apiPostFormData = async <T>(
    path: string,
    formData: FormData,
    authStore: AuthStore
) => {
    try {
        renewToken(authStore)
        const response = await apiCall.post<T>(path, formData, {
            headers: {
                authorization: authStore.state.token,
                'Content-Type': 'multipart/form-data'
            }
        })

        return await response.data
    } catch (error) {
        checkAuth(error, authStore)
        throw error
    }
}

export const renewToken = async (authStore: AuthStore, force = false) => {
    if (new Date(authStore.state.expiryDate).valueOf() - new Date().valueOf() / 1000 < 60 * 5 || force) {
        try {
            const response = await apiCall.post(
                '/auth/renew',
                {},
                { headers: { authorization: authStore.state.token } }
            )
            // Extract the token from the headers
            const token = response.data.access_token
            // Update the state with the token and user details from the data part of the payload
            authStore.renewToken(`Bearer ${token}`, response.data.user)
        } catch (error) {}
    }
}

export const apiPut = async <T>(
    path: string,
    body: { [key: string]: any },
    authStore: AuthStore
) => {
    try {
        renewToken(authStore)
        const response = await apiCall.put<T>(path, body, {
            headers: { authorization: authStore.state.token }
        })

        return await response.data
    } catch (error) {
        checkAuth(error, authStore)
        throw error
    }
}

export const apiPutFormData = async <T>(
    path: string,
    formData: FormData,
    authStore: AuthStore
) => {
    try {
        renewToken(authStore)
        const response = await apiCall.put<T>(path, formData, {
            headers: {
                authorization: authStore.state.token,
                'Content-Type': 'multipart/form-data'
            }
        })

        return await response.data
    } catch (error) {
        checkAuth(error, authStore)
        throw error
    }
}
export const apiPatch = async <T>(
    path: string,
    body: { [key: string]: any },
    authStore: AuthStore
) => {
    try {
        renewToken(authStore)
        const response = await apiCall.patch<T>(path, body, {
            headers: { authorization: authStore.state.token }
        })

        return await response.data
    } catch (error) {
        checkAuth(error, authStore)
        throw error
    }
}

export const apiDelete = async <T>(path: string, authStore: AuthStore) => {
    try {
        renewToken(authStore)
        const response = await apiCall.delete<T>(path, {
            headers: { authorization: authStore.state.token }
        })

        return await response.data
    } catch (error) {
        checkAuth(error, authStore)
        throw error
    }
}
