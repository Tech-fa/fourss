<template>
    <div id="root" class="min-h-screen ">
        <BreadCrums :crumbs="crums" />

        <main id="main-content" class="p-4 sm:p-6 lg:p-8 ">
            <div id="edit-form" class="max-w-3xl mx-auto bg-white rounded-lg border border-black">
                <div class="p-6 border-b" v-if="tab === 0">
                    <div class="flex items-center gap-4">
                        <div v-if="!isEditMode">
                            <h2 class="text-lg">{{ t('admin_users.page_title_add') }}</h2>
                            <p class="text-neutral-500">{{ t('admin_users.page_subtitle_add') }}</p>
                        </div>
                        <div v-else>
                            <h2 class="text-lg">{{ t('admin_users.page_title_edit') }}</h2>
                            <p class="text-neutral-500">{{ t('admin_users.page_subtitle_edit') }}</p>
                        </div>
                    </div>
                </div>

                <Form @submit="submitForm" :class="tab === 0 ? 'p-6 space-y-6' : 'hidden'"
                    v-if="!isEditMode || (isEditMode && initialValues.fname)">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <AppInputForm test-id="first-name" name="fname" :label="t('admin_users.label_first_name')"
                            :placeholder="t('admin_users.placeholder_first_name')" :value="initialValues.fname"
                            :rules="firstNameRule" :required="true" />
                        <AppInputForm test-id="last-name" name="lname" :label="t('admin_users.label_last_name')"
                            :placeholder="t('admin_users.placeholder_last_name')" :value="initialValues.lname"
                            :rules="lastNameRule" :required="true" />
                    </div>

                    <AppInputForm test-id="email" name="email" :label="t('admin_users.label_email')"
                        :placeholder="t('admin_users.placeholder_email')" :value="initialValues.email"
                        :rules="emailRule" :disabled="isEditMode && !!verifiedAt" :required="true" />

                    <AppInputForm test-id="phone" name="phone" :label="t('admin_users.label_mobile_phone')"
                        :placeholder="t('admin_users.placeholder_mobile_phone')" :value="initialValues.phone"
                        :rules="phoneRule" :required="true" />

                    <div class="space-y-3">
                        <div class="flex items-center justify-between gap-3">
                            <label class="block text-sm text-neutral-700 font-bold">
                                {{ t('admin_users.heading_memberships') }}
                                <span class="text-red-700">*</span>
                            </label>
                            <button
                                type="button"
                                class="px-3 py-1.5 text-sm border rounded-lg hover:bg-neutral-50"
                                @click="openAddMembershipDialog"
                                test-id="add-membership-button"
                            >
                                <i class="fa-solid fa-plus mr-2"></i>
                                {{ t('admin_users.btn_add_membership') }}
                            </button>
                        </div>
                        <div
                            v-if="memberships.length === 0"
                            class="text-neutral-500 text-sm border rounded-lg p-4"
                            test-id="memberships-empty"
                        >
                            {{ t('admin_users.memberships_empty') }}
                        </div>
                        <div v-else class="space-y-2" test-id="memberships-list">
                            <div
                                class="grid grid-cols-12 gap-3 px-3 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide"
                            >
                                <div class="col-span-5">{{ t('admin_users.col_team') }}</div>
                                <div class="col-span-5">{{ t('admin_users.col_group') }}</div>
                                <div class="col-span-2"></div>
                            </div>
                            <div
                                v-for="membership in memberships"
                                :key="membership.key"
                                :test-id="'membership-' + membership.key"
                                class="grid grid-cols-12 gap-3 items-center p-3 border rounded-lg"
                            >
                                <div class="col-span-5 flex items-center space-x-3 min-w-0">
                                    <i class="fa-solid fa-people-group text-neutral-500"></i>
                                    <span class="font-medium truncate">
                                        {{
                                            membership.team
                                                ? membership.team.name
                                                : t('admin_users.team_all_teams')
                                        }}
                                    </span>
                                </div>
                                <div class="col-span-5 flex items-center space-x-3 min-w-0">
                                    <i class="fa-solid fa-users text-neutral-500"></i>
                                    <span class="truncate">{{ membership.group.name }}</span>
                                </div>
                                <div class="col-span-2 flex justify-end">
                                    <button
                                        type="button"
                                        class="text-neutral-600 hover:text-red-600 p-2 rounded"
                                        @click="removeMembership(membership)"
                                        :test-id="`remove-membership-${membership.key}`"
                                    >
                                        <i class="fa-solid fa-xmark"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <p v-if="showValidation && memberships.length === 0" class="text-red-600 text-xs">
                            {{ t('admin_users.toast_membership_required') }}
                        </p>
                    </div>

                    <div class="space-y-2">
                        <label class="block text-sm text-black font-bold">{{ t('admin_users.label_status') }}</label>
                        <Select2 test-id="status-select" v-if="isEditMode" v-model="isActive" :values="[true, false]"
                            :placeholder="isActive ? t('statuses.active') : t('admin_users.status_disabled')
                                " :display="statusDisplay" />
                        <p v-else class="text-black/70">
                            {{ t('admin_users.new_user_must_activate') }}
                        </p>
                    </div>

                    <div class="flex items-center gap-2">
                        <input id="top-management" test-id="top-management-checkbox" type="checkbox"
                            v-model="isTopManagement"
                            class="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500" />
                        <label for="top-management" class="text-sm text-neutral-700">
                            {{ t('admin_users.label_top_management') }}
                        </label>
                    </div>



                    <AppButton v-if="isEditMode && !verifiedAt" buttonStyle="secondary" type="button"
                        @click="sendActivationEmail" :loading="isSendingActivationEmail">
                        {{ t('admin_users.btn_send_activation_email') }}
                    </AppButton>

                    <div class="p-6 border-t  flex items-center justify-end gap-4">
                        <AppButton test-id="cancel-user-button" buttonStyle="secondary" type="button" @click="cancel">
                            {{ t('common.cancel') }}
                        </AppButton>
                        <AppButton test-id="save-user-button" buttonStyle="primary" type="submit"
                            :loading="isSubmitting">
                            {{ t('common.save_changes') }}
                        </AppButton>
                    </div>
                </Form>

                <div v-else>
                    <div class="p-6 border-t  flex items-center justify-center gap-4 h-60">
                        <Spinner width="30" height="30" />
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Form } from 'vee-validate'
import { useRouter, useRoute } from 'vue-router'
import AppInputForm from '@/components/AppInputForm.vue'
import { useAuthStore } from '../../../stores/auth'
import { apiPost, apiGet, apiPut } from '../../../util/api'
import { useToast } from '../../../stores/notification'
import { exists, isEmail, isPhone, formatApiErrorMessage } from '../../../util/util'
import AppButton from '../../AppButton.vue'
import Spinner from '../../Spinner.vue'
import Select2 from '@/components/Select2.vue'
import BreadCrums from '@/components/breadCrums.vue'
import AddMembershipDialog from './AddMembershipDialog.vue'
import { getOrgUnits } from '@/components/common/endpoints'
import type { OrganizationUnit, PermissionGroup, User } from '../../../util/interfaces'
import { useDialog } from '../../../stores/dialog'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const isSubmitting = ref(false)
const isActive = ref(true)
const isTopManagement = ref(false)
const toast = useToast()
const dialog = useDialog()
const userId = route.params.userId
const isEditMode = !!userId
const initialValues = ref<{ [key: string]: string }>({})
const verifiedAt = ref<number | null>(null)
const isSendingActivationEmail = ref(false)
const tab = ref(0)
const availableGroups = ref<PermissionGroup[]>([])
const teams = ref<OrganizationUnit[]>([])
const permissionGroups = ref<PermissionGroup[]>([])
const groupOrgUnits = ref<{ [key: number]: OrganizationUnit[] }>({})
const showValidation = ref(false)

type MembershipRow = {
    key: string
    group: PermissionGroup
    team: OrganizationUnit | null
}

const firstNameRule = (v: any) => (!exists(v) ? t('admin_users.rule_first_name') : true)
const lastNameRule = (v: any) => (!exists(v) ? t('admin_users.rule_last_name') : true)
const emailRule = (v: any) => (!exists(v) || !isEmail(v) ? t('admin_users.rule_email') : true)
const phoneRule = (v: any) =>
    !exists(v) || !isPhone(v) ? t('admin_users.rule_mobile_phone') : true

const statusDisplay = (item: any) =>
    item ? t('statuses.active') : t('admin_users.status_disabled')

const memberships = computed<MembershipRow[]>(() => {
    const rows: MembershipRow[] = []
    for (const group of permissionGroups.value) {
        if (group.name === 'Admin') {
            rows.push({
                key: `admin-${group.id}`,
                group,
                team: null
            })
            continue
        }
        for (const team of groupOrgUnits.value[group.id] || []) {
            rows.push({
                key: `${group.id}-${team.id}`,
                group,
                team
            })
        }
    }
    return rows
})

const crums = computed(() => [
    {
        name: t('admin_users.breadcrumb_management'),
        path: '/admin/users',
        icon: 'fa-solid fa-users text-neutral-700 text-2xl'
    },
    {
        name: isEditMode ? t('admin_users.breadcrumb_edit_user') : t('admin_users.breadcrumb_add_user'),
        path: '',
        icon: ''
    }
])

onMounted(async () => {
    try {
        const [groups, units] = await Promise.all([
            apiGet<PermissionGroup[]>('/permissions/roles', authStore),
            getOrgUnits('users', authStore)
        ])
        availableGroups.value = groups || []
        teams.value = units || []

        if (isEditMode) {
            const response = await apiGet<User>(`/users/${userId}`, authStore)
            const userData = response

            initialValues.value = {
                fname: userData.fname,
                lname: userData.lname,
                email: userData.email,
                phone: userData.phone
            }

            isActive.value = userData.isActive
            isTopManagement.value = userData.isTopManagement ?? false
            verifiedAt.value = userData.verifiedAt

            const nextGroups: PermissionGroup[] = []
            const nextOrgUnits: { [key: number]: OrganizationUnit[] } = {}
            for (const membership of userData.teamMemberships || []) {
                const group =
                    membership.role ||
                    availableGroups.value.find((g) => g.id === membership.roleId)
                if (!group) continue
                if (!nextGroups.some((g) => g.id === group.id)) {
                    nextGroups.push(group)
                }
                if (group.name === 'Admin') {
                    nextOrgUnits[group.id] = []
                    continue
                }
                const team =
                    membership.team ||
                    teams.value.find((t) => t.id === membership.teamId)
                if (!team) continue
                const existing = nextOrgUnits[group.id] || []
                if (!existing.some((t) => t.id === team.id)) {
                    nextOrgUnits[group.id] = [...existing, team]
                }
            }
            permissionGroups.value = nextGroups
            groupOrgUnits.value = nextOrgUnits
        }
    } catch (error: any) {
        toast.showToast(
            t('admin_users.toast_load_user_title'),
            formatApiErrorMessage(error?.response?.data, t, 'errors.user') || t('admin_users.toast_load_user_body'),
            'error'
        )
        if (isEditMode) {
            router.push('/admin/users')
        }
    }
})

const submitForm = async (values: any) => {
    showValidation.value = true
    const roles = permissionGroups.value.map((group) => {
        if (group.name === 'Admin') {
            return { roleId: group.id, teamIds: [] as number[] }
        }
        return {
            roleId: group.id,
            teamIds: (groupOrgUnits.value[group.id] || []).map((unit) => unit.id)
        }
    })
    if (roles.length === 0) {
        return
    }

    const hasAdmin = permissionGroups.value.some((g) => g.name === 'Admin')
    if (hasAdmin && roles.length > 1) {
        toast.showToast(t('common.error'), t('errors.permission.PERMISSION_017'), 'error')
        return
    }

    const teamIds = roles.flatMap((group) => group.teamIds)
    if (new Set(teamIds).size !== teamIds.length) {
        toast.showToast(t('common.error'), t('errors.permission.PERMISSION_017'), 'error')
        return
    }

    if (
        roles.some(
            (group) =>
                group.teamIds.length === 0 &&
                permissionGroups.value.find((g) => g.id === group.roleId)?.name !==
                    'Admin'
        )
    ) {
        toast.showToast(
            t('common.error'),
            t('admin_users.toast_org_unit_required_for_groups'),
            'error'
        )
        return
    }

    isSubmitting.value = true

    const userData: Record<string, unknown> = {
        fname: values.fname,
        lname: values.lname,
        email: values.email,
        phone: values.phone,
        isActive: isActive.value,
        isTopManagement: isTopManagement.value,
        roles
    }

    try {
        let response: any
        if (isEditMode) {
            response = await apiPut(`/users/${userId}`, userData, authStore)
            toast.showToast(
                t('admin_users.toast_user_updated'),
                t('admin_users.toast_user_updated_detail'),
                'success'
            )
        } else {
            response = await apiPost('/users', userData, authStore)
            toast.showToast(
                t('admin_users.toast_user_created'),
                t('admin_users.toast_user_created_detail'),
                'success'
            )
        }
        router.push(`/admin/users/${response.id}`)
    } catch (error: any) {
        isSubmitting.value = false
        toast.showToast(
            isEditMode ? t('admin_users.toast_error_update_title') : t('admin_users.toast_error_create_title'),
            formatApiErrorMessage(error?.response?.data, t, 'errors.user') || t('admin_users.toast_error_save_body'),
            'error'
        )
    }
}

const cancel = () => {
    router.push('/admin/users')
}

const removeMembership = (membership: MembershipRow) => {
    if (membership.group.name === 'Admin' || !membership.team) {
        permissionGroups.value = permissionGroups.value.filter((g) => g.id !== membership.group.id)
        delete groupOrgUnits.value[membership.group.id]
        return
    }

    const remaining = (groupOrgUnits.value[membership.group.id] || []).filter(
        (team) => team.id !== membership.team!.id
    )
    if (remaining.length === 0) {
        permissionGroups.value = permissionGroups.value.filter((g) => g.id !== membership.group.id)
        delete groupOrgUnits.value[membership.group.id]
    } else {
        groupOrgUnits.value[membership.group.id] = remaining
    }
}

const applyMembership = ({
    group,
    team
}: {
    group: PermissionGroup
    team: OrganizationUnit | null
}) => {
    if (group.name === 'Admin') {
        permissionGroups.value = [group]
        groupOrgUnits.value = { [group.id]: [] }
        dialog.closeDialog()
        return
    }

    const resolvedTeam = team || teams.value[0] || null
    if (!resolvedTeam) {
        dialog.closeDialog()
        return
    }

    for (const existingGroup of [...permissionGroups.value]) {
        if (existingGroup.name === 'Admin') {
            permissionGroups.value = permissionGroups.value.filter(
                (g) => g.id !== existingGroup.id
            )
            delete groupOrgUnits.value[existingGroup.id]
            continue
        }
        const remaining = (groupOrgUnits.value[existingGroup.id] || []).filter(
            (t) => t.id !== resolvedTeam.id
        )
        if (remaining.length === 0) {
            permissionGroups.value = permissionGroups.value.filter(
                (g) => g.id !== existingGroup.id
            )
            delete groupOrgUnits.value[existingGroup.id]
        } else {
            groupOrgUnits.value[existingGroup.id] = remaining
        }
    }

    const alreadyAssigned = permissionGroups.value.some((g) => g.id === group.id)
    if (!alreadyAssigned) {
        permissionGroups.value = [...permissionGroups.value, group]
    }
    const existingTeams = groupOrgUnits.value[group.id] || []
    if (!existingTeams.some((t) => t.id === resolvedTeam.id)) {
        groupOrgUnits.value[group.id] = [...existingTeams, resolvedTeam]
    }

    dialog.closeDialog()
}

const openAddMembershipDialog = () => {
    const assignedTeamIds = memberships.value
        .map((m) => m.team?.id)
        .filter((id): id is number => id != null)

    dialog.openDialog(AddMembershipDialog, {
        availableGroups: authStore.isAdmin()
            ? availableGroups.value
            : availableGroups.value.filter((group) => group.name !== 'Admin'),
        availableTeams: teams.value,
        assignedTeamIds,
        existingAdmin: permissionGroups.value.some((g) => g.name === 'Admin'),
        onSuccess: ({
            group,
            team
        }: {
            group: PermissionGroup
            team: OrganizationUnit | null
        }) => {
            applyMembership({ group, team })
        },
        onCancel: () => {
            dialog.closeDialog()
        }
    })
}

const sendActivationEmail = async () => {
    try {
        isSendingActivationEmail.value = true

        await apiGet(`/auth/activation?email=${encodeURIComponent(initialValues.value.email)}`, authStore)
        toast.showToast(
            t('admin_users.toast_activation_sent_title'),
            t('admin_users.toast_activation_sent_detail'),
            'success'
        )
    } catch (error: any) {
        toast.showToast(
            t('admin_users.toast_activation_error_title'),
            formatApiErrorMessage(error?.response?.data, t, 'errors.user') || t('admin_users.toast_activation_error_body'),
            'error'
        )
    } finally {
        isSendingActivationEmail.value = false
    }
}
</script>
