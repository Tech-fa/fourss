<template>
    <div id="main" class="min-h-screen bg-neutral-50 pb-10">
        <BreadCrums :crumbs="[{ name: t('userNotifications.title'), path: '', icon: 'fa-solid fa-bell' }]" />

        <div id="content" class="mb-8 px-4 sm:px-6 lg:px-8 mt-8">
            <div
                id="notifications-list"
                class="space-y-4"
                ref="scrollContainer"
                @scroll="handleScroll"
            >
                <div
                    v-for="notification in notifications"
                    :key="notification.id"
                    class=" p-6 rounded-lg border border-neutral-200 relative cursor-pointer"
                    :class="{ 'bg-blue-50': !notification.viewed,'bg-white':notification.viewed }"
                    @click="router.push(notification.data.link)"
                >
                    <div class="flex items-start justify-between">
                        <div class="flex items-start space-x-4">
                            <div class="bg-neutral-100 p-3 rounded-full shrink-0">
                                <i class="fa-solid fa-bell text-neutral-600"></i>
                            </div>
                            <div>
                                <h3 class="mb-1">{{ notification.data.title }}</h3>
                                <p class="text-green-600 text-sm mb-2 ">
                                    {{ notification.data.message }}
                                </p>
                                <div class="flex items-center space-x-4 text-sm text-neutral-500">
                                    <span class="flex items-center">
                                        <i class="fa-regular fa-clock mr-2"></i>
                                        {{ formatTimeAgo(+notification.createdAt) }}
                                    </span>
                                </div>
                            </div>
                        </div>
                      
                    </div>
                </div>
                <div v-if="loading">
                    <div class="text-center text-neutral-500 my-10">
                        <Spinner width="5" />
                    </div>
                </div>
                <div v-else-if="notifications.length === 0">
                    <div class="text-center text-neutral-500 my-10">{{ $t('userNotifications.empty') }}</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watchEffect } from 'vue'
import BreadCrums from './breadCrums.vue'
import { useAuthStore } from '@/stores/auth'
import { apiGet, apiPut } from '@/util/api'
import type { PaginatedResponse, UserNotification } from '@/util/interfaces'
import { useRouter } from 'vue-router'
import Spinner from './Spinner.vue'
import { useNotificationCountStore } from '@/stores/notification-count'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const authStore = useAuthStore()
const router = useRouter()
const scrollContainer = ref<HTMLElement | null>(null)
const notifications = ref<UserNotification[]>([])
const loading = ref(false)
const currentPage = ref(1)
const total = ref(0)
const notificationCountStore = useNotificationCountStore()
const timeRangeOptions = [
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
    { value: 'all', label: 'All time' }
]

// Computed property for filtered notifications

const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString()
}

const formatTimeAgo = (timestamp: number) => {
    const now = new Date()
    const date = new Date(timestamp)
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return t('userNotifications.justNow')
    if (diffInSeconds < 3600) return t('userNotifications.minutesAgo', { n: Math.floor(diffInSeconds / 60) })
    if (diffInSeconds < 86400) return t('userNotifications.hoursAgo', { n: Math.floor(diffInSeconds / 3600) })
    if (diffInSeconds < 604800) return t('userNotifications.daysAgo', { n: Math.floor(diffInSeconds / 86400) })
    return formatDate(timestamp)
}



const handleScroll = () => {
    const scrollPosition = window.scrollY + window.innerHeight
    const bodyHeight = document.body.scrollHeight
    // Load more when user scrolls to 80% of the page
    if (scrollPosition >= bodyHeight * 0.8) {
        if (currentPage.value * 10 < total.value) {
            currentPage.value = currentPage.value + 1
        }
    }
}

watchEffect(() => {
    loading.value = true
    apiGet<PaginatedResponse<UserNotification>>(
        `/user-notifications?perPage=10&page=${currentPage.value}`,
        authStore
    )
        .then((response) => {
            notifications.value = [...notifications.value, ...response.data]
            total.value = response.totalCount
            apiPut(
                `/user-notifications/mark-all-as-read`,
                { notificationIds: notifications.value.map((n) => n.id) },
                authStore
            ).then(() => {
                apiGet<number>(`/user-notifications/unviewed-count`, authStore).then((response) => {
                    notificationCountStore.setCount(response)
                })
            })
        })
        .catch((error) => {
            console.error('Failed to fetch notifications:', error)
        })
        .finally(() => {
            loading.value = false
        })
})

onMounted(() => {
    window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
})

// Watch for filter changes
</script>
