<template>
    <div id="root" class="min-h-screen ">
        <BreadCrums :crumbs="[
            {
                name: t('admin_users.breadcrumb_management'),
                path: '/admin/users',
                icon: 'fa-solid fa-users text-neutral-700 text-2xl'
            }
        ]">

        </BreadCrums>

        <div test-id="user-management-table-wrapper">
            <Table :cols="tableCols" :rows="rows" :page="page" :total="total" :per-page="perPage"
                :total-pages="totalPages" :on-next-page="onNextPage" :on-previous-page="onPreviousPage"
                :set-page="setPage" :entities="users" :entity-name="t('admin_users.entity_user')"
                :on-success="onSuccess" :on-search="(val: string) => {
                    query = val
                }
                    " :loading="loading" :subject="'users'"
                :search-placeholder="t('admin_users.search_users_placeholder')" :handleDelete="handleDelete"
                :hideDelete="(entity) => entity?.id === authStore.state?.userDetails?.id">
                <template #extra-search>
                    <div class="flex items-center gap-4">
                        <Can :subject="'users'" :actions="['create']">
                            <AppButton test-id="user-management-add-user" buttonStyle="primary" href="/admin/users/add">
                                <i class="fa-solid fa-plus"></i>
                                <span class="ml-2">{{ t('admin_users.add_user') }}</span>
                            </AppButton>
                        </Can>
                    </div>
                </template>
                <template #extra-field="{ entity }">
                 
                    <Can :subject="'users'" :actions="['update']" v-if="!entity.verifiedAt && !entity.isActive">
                        <span class="text-gray-800 hover:text-gray-400 cursor-pointer ml-4"
                            :test-id="`user-resend-invitation-${entity.id}`" @click="resendInvitation(entity)">
                            <i class="fa-solid fa-envelope"></i>
                        </span>
                    </Can>
                    <Can :subject="'users'" :actions="['update']"
                        v-if="+entity.failedLogins >= 3 && entity.id !== authStore.state?.userDetails?.id">
                        <span class="text-gray-800 hover:text-gray-400 cursor-pointer ml-4" @click="unlockUser(entity)">
                            <i class="fa-solid fa-unlock"></i>
                        </span>
                    </Can>
                </template>
            </Table>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Table from '@/components/Table.vue'
import type { User } from '@/util/interfaces'
import { apiGet, apiDelete, apiPut } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import AppButton from '@/components/AppButton.vue'
import { useRouter } from 'vue-router'
import BreadCrums from '@/components/breadCrums.vue'
import Can from '@/components/Can.vue'
import { useToast } from '@/stores/notification'
import { useDialog } from '@/stores/dialog'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { formatApiErrorMessage } from '@/util/util'

const { t, locale } = useI18n()

const users = ref<User[]>([])
const page = ref(1)
const perPage = ref(15)
const total = ref(1)
const totalPages = ref(1)
const query = ref('')
const loading = ref(true)
const rows = ref<{ [key: string]: any }[]>([])
const allUsers = ref<User[]>([])
const authStore = useAuthStore()
const router = useRouter()
const toast = useToast()
const dialog = useDialog()

const tableCols = computed(() => [
    t('admin_users.col_name'),
    t('admin_users.col_email'),
    t('admin_users.col_mobile'),
    t('admin_users.col_status'),
    t('admin_users.col_top_management')
])

const isInvited = (user: User) => !user.verifiedAt && !user.isActive

const getUserStatus = (user: User) => {
    if (isInvited(user)) return t('admin_users.status_invited')
    return user.isActive ? t('statuses.active') : t('admin_users.status_disabled')
}

const mapRows = (userList: User[]) => {
    const [cName, cEmail, cPhone, cStatus, cTopManagement] = tableCols.value
    return userList.map((user) => ({
        id: user.id,
        [cName]: `${user.fname} ${user.lname}`,
        [cEmail]: user.email,
        [cPhone]: user.phone,
        [cStatus]: getUserStatus(user),
        [cTopManagement]: user.isTopManagement
            ? t('admin_users.top_management_yes')
            : t('admin_users.top_management_no')
    }))
}

const unlockUser = (user: User) => {
    const name = `${user.fname} ${user.lname}`
    dialog.openDialog(ConfirmDialog, {
        message: t('admin_users.unlock_user_confirm', { name }),
        onConfirm: async () => {
            try {
                await apiPut(`/users/${user.id}/unlock`, {}, authStore)
                toast.showToast(t('common.success'), t('admin_users.toast_user_unlocked'), 'success')
                onSuccess()
            } catch (error: any) {
                console.error('Error unlocking user:', error)
                toast.showToast(
                    t('common.error'),
                    error?.response?.data?.message || t('admin_users.toast_unlock_failed'),
                    'error'
                )
            } finally {
                dialog.closeDialog()
            }
        },
        onCancel: () => {
            dialog.closeDialog()
        }
    })
}

const resendInvitation = async (user: User) => {
    try {
        await apiGet(`/auth/activation?email=${encodeURIComponent(user.email)}`, authStore)
        toast.showToast(
            t('admin_users.toast_activation_sent_title'),
            t('admin_users.toast_activation_sent_detail'),
            'success'
        )
    } catch (error: any) {
        toast.showToast(
            t('admin_users.toast_activation_error_title'),
            formatApiErrorMessage(error?.response?.data, t, 'errors.user') ||
            t('admin_users.toast_activation_error_body'),
            'error'
        )
    }
}

const filterUsers = (userList: User[], searchQuery: string) => {
    if (!searchQuery) return userList
    const q = searchQuery.toLowerCase()
    return userList.filter(
        (user) =>
            user.fname.toLowerCase().includes(q) ||
            user.lname.toLowerCase().includes(q) ||
            user.email.toLowerCase().includes(q) ||
            user.phone?.toLowerCase().includes(q) ||
            `${user.fname} ${user.lname}`.toLowerCase().includes(q)
    )
}

const updatePagination = () => {
    const filteredUsers = filterUsers(allUsers.value, query.value)
    total.value = filteredUsers.length
    totalPages.value = Math.ceil(total.value / perPage.value)

    const startIndex = (page.value - 1) * perPage.value
    const endIndex = startIndex + perPage.value
    users.value = filteredUsers.slice(startIndex, endIndex)
    rows.value = mapRows(users.value)
}

watch(locale, () => {
    updatePagination()
})

const onNextPage = () => {
    if (page.value < totalPages.value) {
        page.value = page.value + 1
        updatePagination()
    }
}

const onPreviousPage = () => {
    if (page.value > 1) {
        page.value = page.value - 1
        updatePagination()
    }
}

const setPage = (newPage: number) => {
    if (newPage != page.value) {
        page.value = newPage
        updatePagination()
    }
}

const extraFieldAction = (entity: User) => {
    router.push(`/admin/users/${entity.id}/permissions`)
}

const handleDelete = async (entity: User) => {
    if (entity.id === authStore.state?.userDetails?.id) {
        toast.showToast(
            t('common.error'),
            t('errors.user.USER_022'),
            'error'
        )
        return
    }

    const name = `${entity.fname} ${entity.lname}`
    dialog.openDialog(ConfirmDialog, {
        message: t('admin_users.delete_user_confirm', { name }),
        onConfirm: async () => {
            try {
                await apiDelete(`/users/${entity.id}`, authStore)
                toast.showToast(t('common.success'), t('admin_users.toast_user_deleted'), 'success')
                await onSuccess()
            } catch (error: any) {
                console.error('Error deleting user:', error)
                toast.showToast(
                    t('common.error'),
                    formatApiErrorMessage(error?.response?.data, t, 'errors.user') ||
                        error?.response?.data?.message ||
                        t('admin_users.toast_delete_failed'),
                    'error'
                )
            } finally {
                dialog.closeDialog()
            }
        },
        onCancel: () => {
            dialog.closeDialog()
        }
    })
}

const onSuccess = () => {
    apiGet<User[]>(`/users`, authStore)
        .then((res) => {
            loading.value = false
            allUsers.value = res
            updatePagination()
        })
        .catch(() => {
            loading.value = false
        })
}

onMounted(async () => {
    onSuccess()
})

watch(query, () => {
    page.value = 1
    onSuccess()
})
</script>
