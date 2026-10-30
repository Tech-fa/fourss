<template>
    <div id="root" class="min-h-screen bg-neutral-50">
        <BreadCrums
            :crumbs="[
                {
                    name: t('admin_users.breadcrumb_management'),
                    path: '/admin/users',
                    icon: 'fa-solid fa-users text-neutral-700 text-2xl'
                },
                { name: t('admin_users.breadcrumb_user_details'), path: '', icon: '' }
            ]"
        >
            <div class="flex items-center gap-4">
                <AppButton
                    :href="`/admin/users/${user.id}/edit`"
                    button-style="secondary"
                    :test-id="'edit-user-button'"
                >
                    <i class="fa-solid fa-pen-to-square"></i>
                    <span class="ml-2">{{ t('common.edit') }}</span>
                </AppButton>
                <AppButton
                    v-if="isInvited"
                    button-style="primary"
                    @click="resendInvitation"
                    :loading="isResendingInvitation"
                    test-id="resend-invitation-button"
                >
                    <span class="flex items-center gap-2">
                        <i class="fa-solid fa-envelope"></i>
                        <span>{{ t('admin_users.btn_resend_invitation') }}</span>
                    </span>
                </AppButton>
                <AppButton
                    v-else
                    button-style="primary"
                    @click="toggleUserStatus"
                    :test-id="user.isActive ? 'deactivate-user-button' : 'activate-user-button'"
                >
                    <span v-if="user.isActive" class="flex items-center gap-2">
                        <i class="fa-solid fa-ban"></i>
                        <span>{{ t('admin_users.deactivate_title') }}</span>
                    </span>
                    <span v-else class="flex items-center gap-2">
                        <i class="fa-solid fa-check"></i>
                        <span>{{ t('admin_users.activate_title') }}</span>
                    </span>
                </AppButton>
            </div>
        </BreadCrums>

        <main id="main-content" class="p-4 sm:p-6 lg:p-8">
            <div v-if="loading" class="flex justify-center items-center py-12">
                <Spinner width="10" />
            </div>

            <template v-else>
                <div id="user-profile" class="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div class="flex items-center gap-4 mb-6">
                        <i class="fa-solid fa-user-circle text-5xl"></i>
                        <div>
                            <h2 class="text-2xl">
                                {{ fullName }}
                                <span class="text-neutral-500 text-sm" v-if="user.createdBy">
                                    ({{
                                        t('admin_users.created_by_caption', {
                                            fname: user.createdBy.fname,
                                            lname: user.createdBy.lname
                                        })
                                    }})
                                </span>
                                <span class="text-neutral-500 text-sm" v-else>
                                    ({{ t('admin_users.created_by_company_admin') }})
                                </span>
                            </h2>
                            <span
                                class="px-2 py-1 text-sm rounded-full"
                                :class="
                                    !user.verifiedAt && !user.isActive
                                        ? 'bg-amber-100 text-amber-800'
                                        : user.isActive
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-neutral-100 text-neutral-800'
                                "
                            >
                                {{
                                    !user.verifiedAt && !user.isActive
                                        ? t('admin_users.status_invited')
                                        : user.isActive
                                          ? t('statuses.active')
                                          : t('admin_users.status_disabled')
                                }}
                            </span>
                            <span
                                v-if="user.isTopManagement"
                                class="px-2 py-1 text-sm rounded-full bg-blue-100 text-blue-800 ml-2"
                            >
                                {{ t('admin_users.top_management_yes') }}
                            </span>
                        </div>
                    </div>

                    <div id="user-details-tab" class="space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div id="personal-info" class="space-y-4">
                                <h3 class="text-lg mb-4">{{ t('admin_users.section_personal') }}</h3>

                                <div class="space-y-2">
                                    <label class="text-sm text-neutral-600">{{
                                        t('admin_users.label_first_name')
                                    }}</label>
                                    <p class="text-neutral-900">{{ user.fname }}</p>
                                </div>

                                <div class="space-y-2">
                                    <label class="text-sm text-neutral-600">{{
                                        t('admin_users.label_last_name')
                                    }}</label>
                                    <p class="text-neutral-900">{{ user.lname }}</p>
                                </div>

                                <div class="space-y-2">
                                    <label class="text-sm text-neutral-600">{{
                                        t('admin_users.label_email')
                                    }}</label>
                                    <p class="text-neutral-900">{{ user.email }}</p>
                                </div>

                                <div class="space-y-2">
                                    <label class="text-sm text-neutral-600">{{
                                        t('admin_users.label_top_management')
                                    }}</label>
                                    <p class="text-neutral-900">
                                        {{
                                            user.isTopManagement
                                                ? t('admin_users.top_management_yes')
                                                : t('admin_users.top_management_no')
                                        }}
                                    </p>
                                </div>

                                <div class="space-y-2">
                                    <label class="text-sm text-neutral-600">{{
                                        t('admin_users.label_permission_group')
                                    }}</label>
                                    <p class="text-neutral-900" test-id="user-permission-group">
                                        {{ permissionGroupNames || t('admin_users.field_not_provided') }}
                                    </p>
                                </div>
                            </div>

                            <div id="contact-info" class="space-y-4">
                                <h3 class="text-lg mb-4">{{ t('admin_users.section_contact') }}</h3>

                                <div class="space-y-2">
                                    <label class="text-sm text-neutral-600">{{
                                        t('admin_users.label_mobile_phone')
                                    }}</label>
                                    <p class="text-neutral-900">
                                        {{ user.phone || t('admin_users.field_not_provided') }}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div id="activity-log" class="border-t border-neutral-200 pt-6">
                            <h3 class="text-lg mb-4">{{ t('admin_users.section_activity_log') }}</h3>
                            <div v-if="activities.length === 0" class="text-neutral-600 py-4">
                                {{ t('admin_users.activity_empty') }}
                            </div>
                            <div v-else class="space-y-4">
                                <div
                                    v-for="(activity, index) in activities"
                                    :key="index"
                                    class="flex items-center gap-4 py-3"
                                    :class="index < activities.length - 1 ? 'border-b' : ''"
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </main>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { apiGet } from '@/util/api'
import type { User } from '@/util/interfaces'
import AppButton from '@/components/AppButton.vue'
import Spinner from '@/components/Spinner.vue'
import BreadCrums from '@/components/breadCrums.vue'
import { useDialog } from '@/stores/dialog'
import ActivateUser from './activateUser.vue'
import { useToast } from '@/stores/notification'
import { formatApiErrorMessage } from '@/util/util'

const { t } = useI18n()
const user = ref<User>({
    id: '',
    fname: '',
    lname: '',
    email: '',
    phone: '',
    isActive: false,
    isTopManagement: false,
    createdAt: '',
    updatedAt: '',
    createdBy: {
        id: 0,
        fname: '',
        lname: ''
    },
    verifiedAt: 0
})
const authStore = useAuthStore()
const loading = ref(true)
const isResendingInvitation = ref(false)
const error = ref('')
const activities = ref([])
const route = useRoute()
const { openDialog, onChangeDialog } = useDialog()
const toast = useToast()

const isInvited = computed(() => !user.value.verifiedAt && !user.value.isActive)

const userId = computed(() => {
    return route.params.userId as string
})

const fullName = computed(() => {
    return `${user.value.fname} ${user.value.lname}`
})

const permissionGroupNames = computed(() => {
    const names = (user.value.teamMemberships || [])
        .map((m) => m.role?.name)
        .filter((name): name is string => !!name)
    return [...new Set(names)].join(', ')
})

async function fetchUserData() {
    loading.value = true
    try {
        const response = await apiGet<User>(`/users/${userId.value}`, authStore)
        user.value = response
    } catch (err) {
        error.value = t('admin_users.view_load_error')
    } finally {
        loading.value = false
    }
}

function toggleUserStatus() {
    openDialog(ActivateUser, {
        user: user.value,
        onSuccess: () => {
            fetchUserData()
            onChangeDialog(false)
        },
        onCancel: () => {
            onChangeDialog(false)
        },
        activate: !user.value.isActive
    })
}

async function resendInvitation() {
    try {
        isResendingInvitation.value = true
        await apiGet(`/auth/activation?email=${encodeURIComponent(user.value.email)}`, authStore)
        toast.showToast(
            t('admin_users.toast_activation_sent_title'),
            t('admin_users.toast_activation_sent_detail'),
            'success'
        )
    } catch (err: any) {
        toast.showToast(
            t('admin_users.toast_activation_error_title'),
            formatApiErrorMessage(err?.response?.data, t, 'errors.user') ||
                t('admin_users.toast_activation_error_body'),
            'error'
        )
    } finally {
        isResendingInvitation.value = false
    }
}

onMounted(() => {
    fetchUserData()
})
</script>
