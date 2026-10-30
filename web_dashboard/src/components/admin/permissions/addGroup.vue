<template>
    <div id="root" class="min-h-screen bg-neutral-50">
        <BreadCrums :crumbs="breadcrumbCrumbs">
            <Can :subject="'permissions'" :actions="['update']">
                <AppButton v-if="isViewMode && group.custom" buttonStyle="secondary"
                    :href="`/admin/permissions/roles/${route.params.id}/edit`" test-id="edit-group-button">
                    <i class="fa-solid fa-pencil mr-2"></i>
                    {{ t('admin_permission_groups.btn_edit_group') }}
                </AppButton>
            </Can>
        </BreadCrums>

        <main id="main-content" class="p-6 max-w-4xl mx-auto" v-if="!initialLoading">



            <Form @submit="saveGroup" :class="tab === 0 ? 'space-y-6' : 'hidden'">
                <div class="bg-white rounded-lg border p-4 pb-8">
                    <Notice v-if="isEditMode && isViewMode"
                        :description="t('admin_permission_groups.notice_default_readonly')" level="info" />
                    <div class="mt-4" v-if="isEditMode && isViewMode"></div>
                    <AppInputForm name="name" :label="t('admin_permission_groups.label_group_name')"
                        v-if="!isEditMode || (isEditMode && group.name)" :value="group.name"
                        :disabled="isEditMode && isViewMode" :rules="groupNameRule"
                        :placeholder="t('admin_permission_groups.placeholder_group_name')" :required="true"
                        test-id="group-name-input" />

                    <div class="mt-4">
                        <AppTextareaForm name="description"
                            :label="t('admin_permission_groups.label_group_description')" :value="group.description"
                            :disabled="isEditMode && isViewMode"
                            :placeholder="t('admin_permission_groups.placeholder_group_description')"
                            test-id="group-description-textarea" />
                    </div>
                </div>
                <div id="permissions-selection" class="bg-white rounded-lg border p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-lg">{{ t('admin_permission_groups.heading_permissions') }}</h2>
                        <div class="flex items-center space-x-2">
                            <input v-model="permissionSearch" type="text"
                                :placeholder="t('admin_permission_groups.placeholder_search_permissions')"
                                class="px-3 py-2 border rounded-lg" test-id="permissions-search-input" />
                        </div>
                    </div>

                    <div test-id="permissions-section" class="space-y-4">
                        <div v-for="module in filteredPermissions" :key="module.subject" class="border rounded-lg p-4">
                            <div class="flex items-center justify-between mb-3">
                                <div class="flex items-center">
                                    <input type="checkbox" class="mr-3" :id="module.subject"
                                        :checked="isModuleSelected(module as PermissionTree)"
                                        @change="toggleModule(module as PermissionTree)"
                                        :disabled="isEditMode && isViewMode"
                                        :test-id="`permission-module-checkbox-${module.subject}`" />
                                    <label :for="module.subject">{{
                                        translatePermissionLabel(module.label)
                                        }}</label>
                                </div>
                                <button class="text-neutral-600" type="button"
                                    @click="toggleModuleExpanded(module as PermissionTree)"
                                    :test-id="`expand-permissions-${module.subject}`">
                                    <span v-if="isModuleExpanded(module as PermissionTree)">
                                        <i class="fa-solid fa-chevron-up"></i>
                                    </span>
                                    <span v-else>
                                        <i class="fa-solid fa-chevron-down"></i>
                                    </span>
                                </button>
                            </div>
                            <transition name="slide-fade" @enter="startTransition" @after-enter="endTransition"
                                @after-leave="endTransition" @leave="endTransition">
                                <div v-if="isModuleExpanded(module as PermissionTree)" class="ml-7 space-y-2">
                                    <div v-for="action in module.actions" :key="action" class="flex items-center">
                                        <input type="checkbox" class="mr-2"
                                            :checked="isPermissionSelected(module.subject, action)"
                                            @change="togglePermission(module.subject, action)"
                                            :disabled="isEditMode && isViewMode" />
                                        <span>{{ translatePermissionAction(action) }}</span>
                                    </div>
                                    <div v-if="module.submodules" class="space-y-4">
                                        <div v-for="submodule in module.submodules" :key="submodule.subject"
                                            class="ml-4 border-l-2 pl-4">
                                            <div class="flex items-center justify-between mb-2">
                                                <div class="flex items-center">
                                                    <input type="checkbox" class="mr-3" :id="submodule.subject"
                                                        :checked="isModuleSelected(submodule)"
                                                        @change="toggleModule(submodule)"
                                                        :disabled="isEditMode && isViewMode" />
                                                    <label :for="submodule.subject">{{
                                                        translatePermissionLabel(submodule.label)
                                                        }}</label>
                                                </div>
                                                <button class="text-neutral-600" type="button"
                                                    @click="toggleModuleExpanded(submodule)">
                                                    <span v-if="isModuleExpanded(submodule)">
                                                        <i class="fa-solid fa-chevron-up"></i>
                                                    </span>
                                                    <span v-else>
                                                        <i class="fa-solid fa-chevron-down"></i>
                                                    </span>
                                                </button>
                                            </div>
                                            <transition name="slide-fade" @enter="startTransition"
                                                @after-enter="endTransition" @after-leave="endTransition"
                                                @leave="endTransition">
                                                <div v-if="isModuleExpanded(submodule)" class="ml-7 space-y-2">
                                                    <div v-for="action in submodule.actions" :key="action"
                                                        class="flex items-center">
                                                        <input type="checkbox" class="mr-2" :checked="isPermissionSelected(
                                                            submodule.subject,
                                                            action
                                                        )
                                                            " @change="
                                                                togglePermission(
                                                                    submodule.subject,
                                                                    action
                                                                )
                                                                " />
                                                        <span>{{ translatePermissionAction(action) }}</span>
                                                    </div>
                                                </div>
                                            </transition>
                                        </div>
                                    </div>
                                </div>
                            </transition>
                        </div>
                    </div>
                </div>

                <div class="flex justify-end space-x-4" v-if="!isViewMode">
                    <AppButton test-id="cancel-button" buttonStyle="secondary" :href="'/admin/permissions/roles'">
                        {{ t('common.cancel') }}
                    </AppButton>
                    <AppButton buttonStyle="primary" type="submit" :loading="loading"
                        :disabled="isEditMode && isViewMode" test-id="save-group-button">
                        {{ t('common.save_changes') }}
                    </AppButton>
                </div>
            </Form>
        </main>
        <div v-else class="flex justify-center items-center h-full w-full">
            <Spinner width="5" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { apiGet, apiPost, apiPut } from '@/util/api'
import AppButton from '@/components/AppButton.vue'
import type { PermissionGroup } from '@/util/interfaces'
import type { PermissionTree } from '@/stores/auth'
import { Form } from 'vee-validate'
import AppInputForm from '@/components/AppInputForm.vue'
import { exists, formatApiErrorMessage } from '@/util/util'
import { useToast } from '@/stores/notification'
import MemberIcon from '@/components/memberIcon.vue'
import Spinner from '@/components/Spinner.vue'
import Notice from '@/components/Notice.vue'
import AppTextareaForm from '@/components/AppTextareaForm.vue'
import BreadCrums from '@/components/breadCrums.vue'
import Can from '@/components/Can.vue'

const { t, te } = useI18n()

const formatActionName = (action: string) => {
    return action.split(/(?=[A-Z])/).join(' ')
}

/** Backend `label` / `action` strings are the JSON keys under `permission_labels` / `permission_actions`. */
function translatePermissionLabel(label: string): string {
    if (!label) return label
    const key = `admin_permission_groups.permission_labels.${label}`
    return te(key) ? t(key) : label
}

function translatePermissionAction(action: string): string {
    if (!action) return action
    const key = `admin_permission_groups.permission_actions.${action}`
    if (te(key)) return t(key)
    return formatActionName(action)
}
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()



const groupNameRule = (v: any) => (!exists(v) ? t('admin_permission_groups.rule_group_name') : true)
const loading = ref(false)
const initialLoading = ref(false)
const permissionSearch = ref('')
const expandedModules = ref<string[]>([])
const tab = ref(0)
const group = ref<PermissionGroup>({
    id: 0,
    name: '',
    permissions: []
})
const isEditMode = computed(() => !!route.params.id)
const isViewMode = computed(() => !route.path.includes('edit') && !!route.params.id)

const breadcrumbCrumbs = computed(() => [
    {
        name: t('nav.permissionGroups'),
        path: '/admin/permissions/roles',
        icon: 'fa-solid fa-users-gear text-neutral-700 text-2xl'
    },
    {
        name: isViewMode.value
            ? t('admin_permission_groups.breadcrumb_view')
            : isEditMode.value
                ? t('admin_permission_groups.breadcrumb_edit')
                : t('admin_permission_groups.breadcrumb_new'),
        path: '',
        icon: ''
    }
])

const assignableActionsForModule = (module: {
    actions: string[]
    ownerOnlyActions?: string[]
}) => {
    if (!module.ownerOnlyActions?.length) {
        return module.actions
    }
    const isBuiltInGroupView =
        isViewMode.value && group.value.custom === false
    if (isBuiltInGroupView) {
        return module.actions
    }
    return module.actions.filter((a) => !module.ownerOnlyActions!.includes(a))
}

const filteredPermissions = computed(() => {
    const searchTerm = permissionSearch.value.toLowerCase()
    let permissions: { [key: string]: PermissionTree } = {}
    const userPermissions = authStore.state.userDetails.permissions;
    for (const [key, module] of Object.entries(authStore.permissions)) {
        if (userPermissions.some(p => p.subject == module.subject || p.subject == 'all' || module.submodules?.some(s => s.subject == p.subject))) {
            permissions[key] = module
        }
    }
    const filtered: {
        [key: string]: {
            actions: string[]
            ownerOnlyActions?: string[]
            submodules?: PermissionTree[]
            label: string
            subject: string
        }
    } = {}

    Object.entries(permissions).forEach(([moduleName, module]) => {
        const moduleMatches =
            module.label.toLowerCase().includes(searchTerm) ||
            translatePermissionLabel(module.label).toLowerCase().includes(searchTerm)
        const actionsMatch = module.actions.some(
            (action) =>
                action.toLowerCase().includes(searchTerm) ||
                translatePermissionAction(action).toLowerCase().includes(searchTerm)
        )
        const submodulesMatch = module.submodules?.some(
            (submodule) =>
                submodule.subject.toLowerCase().includes(searchTerm) ||
                translatePermissionLabel(submodule.label)
                    .toLowerCase()
                    .includes(searchTerm) ||
                submodule.actions.some(
                    (action) =>
                        action.toLowerCase().includes(searchTerm) ||
                        translatePermissionAction(action).toLowerCase().includes(searchTerm)
                )
        )

        if (moduleMatches || actionsMatch || submodulesMatch) {
            filtered[moduleName] = {
                label: module.label,
                actions: assignableActionsForModule(module).filter((action) =>
                    action.toLowerCase().includes(searchTerm)
                ),
                subject: module.subject,
                ownerOnlyActions: module.ownerOnlyActions,
                submodules: module.submodules
                    ?.map((submodule) => ({
                        ...submodule,
                        actions: assignableActionsForModule(submodule).filter((action) =>
                            action.toLowerCase().includes(searchTerm)
                        )
                    }))
                    .filter(
                        (submodule) =>
                            submodule.subject.toLowerCase().includes(searchTerm) ||
                            submodule.actions.length > 0
                    )
            }
        }
    })

    return filtered
})

const isModuleExpanded = (module: PermissionTree) => expandedModules.value.includes(module.subject)
const toggleModuleExpanded = (module: PermissionTree) => {
    const index = expandedModules.value.indexOf(module.subject)
    if (index === -1) {
        expandedModules.value.push(module.subject)
    } else {
        expandedModules.value.splice(index, 1)
    }
}

const isModuleSelected = (module: PermissionTree) => {
    return group.value.permissions.some(
        (permission) =>
            permission.subject === module.subject ||
            module.submodules?.find((sub) => sub.subject === permission.subject) ||
            (permission.subject === 'all' && permission.action === 'manage')
    )
}

const isPermissionSelected = (moduleName: string, action: string) => {
    return group.value.permissions.some(
        (permission) =>
            (permission.subject === moduleName && permission.action === action) ||
            (permission.subject === 'all' && permission.action === 'manage')
    )
}

const toggleModule = (module: PermissionTree) => {
    const allSelected = isModuleSelected(module)

    if (allSelected) {
        // Remove all permissions for this module and its submodules
        group.value.permissions = group.value.permissions.filter((permission) => {
            const isSubmodule = module.submodules?.some((sub) => sub.subject === permission.subject)
            return permission.subject !== module.subject && !isSubmodule
        })
    } else {
        // Add all permissions for this module
        module.actions.forEach((action) => {
            const permission = { subject: module.subject, action: action }
            if (
                !group.value.permissions.some(
                    (p) => p.subject === module.subject && p.action === action
                )
            ) {
                group.value.permissions.push(permission)
            }
        })

        // Add all permissions for submodules
        module.submodules?.forEach((submodule) => {
            submodule.actions.forEach((action) => {
                const permission = { subject: submodule.subject, action: action }
                if (
                    !group.value.permissions.some(
                        (p) => p.subject === submodule.subject && p.action === action
                    )
                ) {
                    group.value.permissions.push(permission)
                }
            })
        })
    }
}

const togglePermission = (moduleName: string, action: string) => {
    const index = group.value.permissions.findIndex(
        (p) => p.subject === moduleName && p.action === action
    )

    if (index === -1) {
        group.value.permissions.push({ subject: moduleName, action: action })
    } else {
        group.value.permissions.splice(index, 1)
    }
}

const saveGroup = async (values: any) => {
    loading.value = true
    try {
        if (isEditMode.value) {
            await apiPut(
                `/permissions/roles/${route.params.id}`,
                { ...group.value, name: values.name, description: values.description },
                authStore
            )
            toast.showToast(t('common.success'), t('admin_permission_groups.toast_group_updated'), 'success')
        } else {
            await apiPost(
                '/permissions/roles',
                { ...group.value, name: values.name, description: values.description },
                authStore
            )
            toast.showToast(t('common.success'), t('admin_permission_groups.toast_group_created'), 'success')
        }
        router.push('/admin/permissions/roles')
    } catch (error: any) {
        console.error('Error saving group:', error)
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, 'errors.permission') || t('admin_permission_groups.toast_group_save_failed'),
            'error'
        )
    } finally {
        loading.value = false
    }
}

const startTransition = (el: Element) => {
    const height = el.scrollHeight
        ; (el as HTMLElement).style.height = '0px'
        ; (el as HTMLElement).style.overflow = 'hidden'
    requestAnimationFrame(() => {
        ; (el as HTMLElement).style.height = `${height}px`
    })
}

const endTransition = (el: Element) => {
    ; (el as HTMLElement).style.height = ''
        ; (el as HTMLElement).style.overflow = ''
}

onMounted(async () => {
    if (isEditMode.value) {
        initialLoading.value = true
        try {
            const response = await apiGet<PermissionGroup>(
                `/permissions/roles/${route.params.id}`,
                authStore
            )
            group.value = response
            if (!group.value.custom && !isViewMode.value) {
                router.push('/admin/permissions/roles')
            }
        } catch (error) {
            console.error('Error fetching group:', error)
            router.push('/admin/permissions/roles')
        } finally {
            initialLoading.value = false
        }
    }
})
</script>

<style scoped>
.slide-fade-enter-active {
    transition: all 0.1s ease-out;
}

.slide-fade-leave-active {
    transition: all 0.1s ease-in;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

.scrollbar-reserved {
    padding-right: calc(100vw - 8px);
}
</style>
