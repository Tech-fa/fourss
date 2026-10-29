<template>
    <div
        v-if="!props.activate"
        id="modal"
        class="bg-white rounded-lg shadow-lg w-full max-w-md"
        test-id="confirm-user-status-modal"
    >
        <div id="modal-header" class="p-6 border-b">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <i class="fa-solid fa-ban text-neutral-700 text-xl"></i>
                    <h2 class="text-lg">{{ t('admin_users.deactivate_title') }}</h2>
                </div>
                <button @click="handleCancel" class="text-neutral-400 hover:text-neutral-600">
                    <i class="fa-solid fa-xmark text-xl"></i>
                </button>
            </div>
        </div>

        <div id="modal-content" class="p-6">
            <div class="flex items-center gap-4 mb-6">
                <i class="fa-solid fa-user-circle text-neutral-700 text-5xl"></i>
                <div>
                    <h3>{{ userName }}</h3>
                    <p class="text-neutral-600 text-sm">{{ props.user.email }}</p>
                </div>
            </div>

            <div class="space-y-4">
                <p class="text-neutral-700">
                    {{ t('admin_users.deactivate_body') }}
                </p>

                <div class="bg-neutral-50 p-4 rounded-md">
                    <label class="flex items-start gap-3">
                        <input v-model="sendEmail" type="checkbox" class="mt-1" />
                        <span class="text-sm text-neutral-600">{{
                            t('admin_users.deactivate_send_email')
                        }}</span>
                    </label>
                </div>
            </div>
        </div>

        <div id="modal-footer" class="p-6 border-t bg-neutral-50 rounded-b-lg">
            <div class="flex justify-end gap-3">
                <AppButton @click="handleCancel" buttonStyle="secondary">{{ t('common.cancel') }}</AppButton>
                <AppButton @click="handleDeactivate" buttonStyle="danger" :loading="loading">
                    {{ t('admin_users.btn_confirm_deactivate') }}
                </AppButton>
            </div>
        </div>
    </div>

    <div
        v-else
        id="modal"
        class="bg-white rounded-lg shadow-lg w-full max-w-lg"
        test-id="confirm-user-status-modal"
    >
        <div id="modal-header" class="p-6 border-b">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <i class="fa-solid fa-user-check text-neutral-700 text-xl"></i>
                    <h2 class="text-lg">{{ t('admin_users.activate_title') }}</h2>
                </div>
                <button @click="handleCancel" class="text-neutral-400 hover:text-neutral-600">
                    <i class="fa-solid fa-xmark text-xl"></i>
                </button>
            </div>
        </div>

        <div id="modal-content" class="p-6">
            <div class="flex items-center gap-4 mb-6">
                <i class="fa-solid fa-user-circle text-neutral-700 text-5xl"></i>
                <div>
                    <h3 class="text-lg">{{ userName }}</h3>
                    <p class="text-neutral-600">{{ props.user.email }}</p>
                </div>
            </div>

            <div class="bg-neutral-50 rounded-lg p-4 mb-6">
                <div class="flex items-center gap-2 mb-4">
                    <i class="fa-solid fa-circle-info text-neutral-600"></i>
                    <span class="text-neutral-800">{{ t('admin_users.user_details') }}</span>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="text-sm text-neutral-600 mb-1">{{ t('admin_users.label_mobile') }}</p>
                        <p class="text-neutral-800">{{
                            props.user.mobilePhone || t('admin_users.value_not_available')
                        }}</p>
                    </div>
                    <div>
                        <p class="text-sm text-neutral-600 mb-1">{{ t('admin_users.label_work_phone') }}</p>
                        <p class="text-neutral-800">{{
                            props.user.workPhone || t('admin_users.value_not_available')
                        }}</p>
                    </div>
                    <div>
                        <p class="text-sm text-neutral-600 mb-1">{{ t('admin_users.label_extension') }}</p>
                        <p class="text-neutral-800">{{
                            props.user.officeExtension || t('admin_users.value_not_available')
                        }}</p>
                    </div>
                    <div>
                        <p class="text-sm text-neutral-600 mb-1">{{ t('admin_users.label_current_status') }}</p>
                        <span class="px-2 py-1 text-sm rounded-full bg-neutral-200 text-neutral-800">{{
                            t('admin_users.status_disabled')
                        }}</span>
                    </div>
                </div>
            </div>

            <p class="text-neutral-600 mb-6">
                {{ t('admin_users.activate_body') }}
            </p>
        </div>

        <div id="modal-footer" class="p-6 border-t bg-neutral-50 rounded-b-lg">
            <div class="flex justify-end gap-3">
                <AppButton @click="handleCancel" buttonStyle="secondary">{{ t('common.cancel') }}</AppButton>
                <AppButton @click="handleActivate" buttonStyle="primary" :loading="loading">
                    {{ t('admin_users.btn_confirm_activate') }}
                </AppButton>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/AppButton.vue'
import { apiPut } from '@/util/api'
import { useToast } from '@/stores/notification'
import { useAuthStore } from '@/stores/auth'
import type { User } from '@/util/interfaces'

const { t } = useI18n()
const authStore = useAuthStore()
const props = defineProps<{
    activate: boolean
    user: User
    onSuccess: () => void
    onCancel: () => void
}>()

const toast = useToast()
const loading = ref(false)
const sendEmail = ref(true)

const userName = computed(() => {
    return `${props.user.fname} ${props.user.lname}`
})

const handleActivate = async () => {
    loading.value = true
    try {
        await apiPut(`users/${props.user.id}/activate`, {}, authStore)
        toast.showToast(t('common.success'), t('admin_users.toast_activated'), 'success')
        props.onSuccess()
    } catch (error: any) {
        toast.showToast(
            t('common.error'),
            error?.response?.data?.message || t('admin_users.toast_activate_failed'),
            'error'
        )
        console.error('Error activating user:', error)
    } finally {
        loading.value = false
    }
}

const handleDeactivate = async () => {
    loading.value = true
    try {
        await apiPut(`users/${props.user.id}/deactivate`, {}, authStore)
        toast.showToast(t('common.success'), t('admin_users.toast_deactivated'), 'success')
        props.onSuccess()
    } catch (error: any) {
        toast.showToast(
            t('common.error'),
            error?.response?.data?.message || t('admin_users.toast_deactivate_failed'),
            'error'
        )
        console.error('Error deactivating user:', error)
    } finally {
        loading.value = false
    }
}

const handleCancel = () => {
    props.onCancel()
}
</script>
