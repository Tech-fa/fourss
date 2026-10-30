import { defineStore } from 'pinia'
import { ref, toRef } from 'vue'
import { apiGet } from '@/util/api'
import { useAuthStore } from '@/stores/auth'

export const useToast = defineStore('toast', () => {
    const show = ref(false)
    const title = ref('')
    const message = ref('')
    const status = ref<'success' | 'error' | 'info'>('success')
    const timeout = ref(5000)
    const testId = ref<string>()
    const showToast = (
        title2: string,
        message2: string,
        status2: 'success' | 'error' | 'info',
        timeout2 = 5000,
        testId2?: string
    ) => {
        show.value = true
        title.value = title2
        message.value = message2
        status.value = status2
        timeout.value = timeout2
        testId.value = testId2
    }

    return { showToast, show: toRef(show), title, message, status, timeout, testId }
})

export const useNotificationStore = defineStore('notification', () => {
    const authStore = useAuthStore()
    const unreadCount = ref<number>(0)
    const loading = ref(false)

    const fetchCount = async () => {
        if (!authStore.state.isLoggedIn) return
        
        loading.value = true
        try {
            const count = await apiGet<number>('/user-notifications/unviewed-count', authStore)
            unreadCount.value = count
        } catch (error) {
            console.error('Failed to fetch unread notification count:', error)
        } finally {
            loading.value = false
        }
    }

    return {
        unreadCount,
        loading,
        fetchCount
    }
})
