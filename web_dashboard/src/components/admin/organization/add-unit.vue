<template>
    <main id="main" class="container mx-auto px-4 py-6 lg:w-[600px] max-h-[800px] overflow-y-auto">
        <div class="max-w-2xl mx-auto bg-white rounded-lg p-2">
            <div class="flex items-center space-x-3 mb-6">
                <span v-if="props.org" class="text-neutral-600">
                    <i class="fa-solid fa-pencil"></i>
                </span>
                <span v-else class="text-neutral-600">
                    <i class="fa-solid fa-plus"></i>
                </span>
                <h2 class="text-xl" test-id="edit-org-unit-title">
                    {{
                        props.org
                            ? t('admin_org_unit_tree.modal_edit_org_unit')
                            : t('admin_org_unit_tree.modal_add_org_unit')
                    }}
                </h2>
            </div>
            <div v-if="error" class="text-red-500 mb-4">{{ error }}</div>
            <Form @submit="onSubmit" class="w-full space-y-4">
                <AppInputForm :label="t('admin_org_unit_tree.label_unit_name')" :required="true" name="unitName"
                    :placeholder="t('admin_org_unit_tree.placeholder_unit_name')" :rules="unitNameRequiredRule"
                    :value="props.org?.name" :hide-border-error="true" :ignore-blur="true"
                    test-id="edit-org-unit-name-input" />

                <div v-if="adminMembers.length > 0">
                    <label class="block text-sm font-bold text-neutral-700 mb-2">
                        {{ t('admin_org_unit_tree.label_admin_members') }}
                    </label>
                    <Notice
                        :description="t('admin_org_unit_tree.admin_members_notice')"
                        level="info"
                    />
                    <div class="mt-2 space-y-2" test-id="admin-members-list">
                        <div
                            v-for="member in adminMembers"
                            :key="member.user.id"
                            class="flex items-center justify-between border rounded-lg p-3 bg-neutral-50"
                            :test-id="`admin-member-${member.user.id}`"
                        >
                            <span>{{ member.user.fname }} {{ member.user.lname }}</span>
                            <span class="text-xs text-neutral-500">Admin</span>
                        </div>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-bold text-neutral-700 mb-2">
                        {{ t('admin_org_unit_tree.label_members') }}
                    </label>
                    <div class="space-y-3" test-id="edit-org-unit-members">
                        <div
                            v-for="(entry, index) in memberEntries"
                            :key="entry.key"
                            class="border rounded-lg p-3 space-y-3"
                            :test-id="`member-entry-${index}`"
                        >
                            <div class="flex items-start justify-between gap-2">
                                <span class="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                                    {{ t('admin_org_unit_tree.member_entry_label', { n: index + 1 }) }}
                                </span>
                                <button
                                    type="button"
                                    class="p-1 text-neutral-500 hover:text-red-600 rounded"
                                    @click="removeMemberEntry(entry.key)"
                                    :test-id="`remove-member-entry-${index}`"
                                >
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>

                            <div>
                                <label class="block text-sm font-bold text-neutral-700 mb-2">
                                    {{ t('admin_org_unit_tree.label_member_user') }}
                                    <span class="text-red-700">*</span>
                                </label>
                                <Select2
                                    v-model="entry.user"
                                    :values="availableUsersForEntry(entry.key)"
                                    :placeholder="t('admin_org_unit_tree.placeholder_search_members')"
                                    :display="(user: User) => `${user?.fname} ${user?.lname}`"
                                    :optional="true"
                                    :test-id="`member-user-${index}`"
                                />
                                <p v-if="entryErrors[entry.key]?.user" class="text-red-600 text-xs mt-1">
                                    {{ t('admin_org_unit_tree.rule_member_user_required') }}
                                </p>
                            </div>

                            <div>
                                <label class="block text-sm font-bold text-neutral-700 mb-2">
                                    {{ t('admin_org_unit_tree.label_permission_group') }}
                                    <span class="text-red-700">*</span>
                                </label>
                                <Select2
                                    v-model="entry.permissionGroup"
                                    :values="permissionGroups"
                                    :placeholder="t('admin_org_unit_tree.placeholder_permission_group')"
                                    :display="(group: PermissionGroup) => group?.name"
                                    :optional="true"
                                    :test-id="`member-group-${index}`"
                                />
                                <p v-if="entryErrors[entry.key]?.group" class="text-red-600 text-xs mt-1">
                                    {{ t('admin_org_unit_tree.rule_permission_group_required') }}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            class="text-neutral-600 hover:text-neutral-900 flex items-center space-x-2"
                            @click="addMemberEntry"
                            test-id="add-member-entry"
                        >
                            <i class="fa-solid fa-plus"></i>
                            <span>{{ t('admin_org_unit_tree.add_member') }}</span>
                        </button>
                    </div>
                </div>

                <div class="flex justify-end space-x-3 pt-4 border-t mt-4">
                    <AppButton button-style="secondary" type="button" @click="() => props.onCancel()"
                        test-id="edit-org-unit-cancel">
                        {{ t('common.cancel') }}
                    </AppButton>
                    <AppButton button-style="primary" type="submit" :loading="loading" test-id="edit-org-unit-save">
                        {{ t('common.save_changes') }}
                    </AppButton>
                </div>
            </Form>
        </div>
    </main>
</template>

<script setup lang="ts">
import { Form } from 'vee-validate'
import { exists, formatApiErrorMessage } from '@/util/util'
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiGet, apiPost, apiPut, renewToken } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import AppButton from '@/components/AppButton.vue'
import AppInputForm from '@/components/AppInputForm.vue'
import Select2 from '@/components/Select2.vue'
import Notice from '@/components/Notice.vue'
import type { OrganizationUnit, PermissionGroup, User } from '@/util/interfaces'

type MemberEntry = {
    key: string
    user: User | null
    permissionGroup: PermissionGroup | null
}

type EntryErrors = Record<string, { user?: boolean; group?: boolean }>

const { t } = useI18n()
const unitNameRequiredRule = (v: any) =>
    !exists(v) ? t('admin_org_unit_tree.rule_unit_name_required') : true

const props = defineProps<{
    onSubmit: Function
    onCancel: () => void
    org?: OrganizationUnit
}>()

const authStore = useAuthStore()
const loading = ref(false)
const error = ref('')
const permissionGroups = ref<PermissionGroup[]>([])
const availableUsers = ref<User[]>([])
const memberEntries = ref<MemberEntry[]>([])
const entryErrors = reactive<EntryErrors>({})
let entryKeyCounter = 0

const isAdminMember = (member: OrganizationUnit['members'][number]) =>
    member.role?.name === 'Admin'

const adminMembers = computed(() =>
    (props.org?.members || []).filter((member) => member.user && isAdminMember(member))
)

const createMemberEntry = (
    user: User | null = null,
    permissionGroup: PermissionGroup | null = null
): MemberEntry => ({
    key: `member-${entryKeyCounter++}`,
    user,
    permissionGroup
})

const addMemberEntry = () => {
    memberEntries.value.push(createMemberEntry())
}

const removeMemberEntry = (key: string) => {
    memberEntries.value = memberEntries.value.filter((entry) => entry.key !== key)
    delete entryErrors[key]
}

const availableUsersForEntry = (entryKey: string) => {
    const selectedIds = new Set(
        memberEntries.value
            .filter((entry) => entry.key !== entryKey && entry.user)
            .map((entry) => entry.user!.id)
    )
    const adminIds = new Set(adminMembers.value.map((member) => member.user.id))
    return availableUsers.value.filter(
        (user) => !selectedIds.has(user.id) && !adminIds.has(user.id)
    )
}

const validateMemberEntries = () => {
    Object.keys(entryErrors).forEach((key) => delete entryErrors[key])
    let valid = true

    for (const entry of memberEntries.value) {
        const hasUser = !!entry.user
        const hasGroup = !!entry.permissionGroup
        if (!hasUser && !hasGroup) {
            continue
        }
        if (!hasUser || !hasGroup) {
            entryErrors[entry.key] = {
                user: !hasUser,
                group: !hasGroup
            }
            valid = false
        }
    }

    return valid
}

onMounted(async () => {
    const [groupsResult, usersResult] = await Promise.allSettled([
        apiGet<PermissionGroup[]>('/permissions/roles', authStore),
        apiGet<User[]>('/users', authStore)
    ])
    if (groupsResult.status === 'fulfilled') {
        permissionGroups.value = (groupsResult.value || []).filter((g) => g.name !== 'Admin')
    }
    if (usersResult.status === 'fulfilled') {
        availableUsers.value = usersResult.value || []
    }

    const existingMembers = (props.org?.members || []).filter(
        (member) => member.user && !isAdminMember(member)
    )
    if (existingMembers.length > 0) {
        memberEntries.value = existingMembers.map((member) =>
            createMemberEntry(
                member.user,
                member.role ||
                    permissionGroups.value.find((g) => g.id === member.roleId) ||
                    null
            )
        )
    }
})

const onSubmit = async (values: any) => {
    try {
        if (!validateMemberEntries()) {
            return
        }

        loading.value = true
        error.value = ''
        const members = memberEntries.value
            .filter((entry) => entry.user && entry.permissionGroup)
            .map((entry) => ({
                userId: entry.user!.id,
                roleId: entry.permissionGroup!.id
            }))

        const payload: {
            name: string
            members: { userId: string; roleId: number }[]
        } = {
            name: values.unitName,
            members
        }

        if (props.org) {
            await apiPut(`teams/${props.org.id}`, payload, authStore)
        } else {
            await apiPost('teams', payload, authStore)
        }
        renewToken(authStore, true)
        props.onSubmit()
    } catch (err) {
        loading.value = false
        error.value =
            formatApiErrorMessage((err as any).response?.data, t, 'errors.org_unit') ||
            t('admin_org_unit_tree.toast_generic_error')
    }
}
</script>
