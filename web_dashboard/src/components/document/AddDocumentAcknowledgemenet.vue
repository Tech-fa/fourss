<template>
    <div id="root" class="min-h-screen bg-neutral-50">
        <BreadCrums :crumbs="crums" />
        <main id="main-content" class="p-4 sm:p-6 lg:p-8">
            <div
                id="acknowledgement-form"
                class="max-w-3xl mx-auto bg-white rounded-lg shadow-sm text-start"
                :dir="isRtl ? 'rtl' : 'ltr'"
            >
                <div class="p-6 border-b">
                    <h2 class="text-lg">
                        {{
                            isEditing
                                ? t('document.settings.document_acknowledgements.form.title_edit')
                                : t('document.settings.document_acknowledgements.form.title_add')
                        }}
                    </h2>
                    <p class="text-neutral-500">
                        {{
                            isEditing
                                ? t('document.settings.document_acknowledgements.form.subtitle_edit')
                                : t('document.settings.document_acknowledgements.form.subtitle_add')
                        }}
                    </p>
                </div>

                <Form @submit="submitForm" class="p-6 space-y-6" v-if="!loading">
                    <div class="space-y-4">
                        <AppInputForm
                            :value="acknowledgement?.name"
                            name="name"
                            :label="t('document.settings.document_acknowledgements.form.name_label')"
                            type="text"
                            :placeholder="
                                t('document.settings.document_acknowledgements.form.name_placeholder')
                            "
                            :required="true"
                            :rules="nameRule"
                            test-id="acknowledgement-name-input"
                        />
                    </div>

                    <div class="space-y-3">
                        <label class="block text-sm text-neutral-700">
                            {{ t('document.settings.document_acknowledgements.form.scope_label') }}
                        </label>
                        <div class="flex flex-wrap gap-4">
                            <label class="inline-flex items-center gap-2 text-sm">
                                <input
                                    type="radio"
                                    value="org_unit"
                                    v-model="acknowledgementScope"
                                    :disabled="isEditing"
                                    test-id="acknowledgement-scope-org-unit"
                                />
                                {{
                                    t(
                                        'document.settings.document_acknowledgements.form.scope_org_unit'
                                    )
                                }}
                            </label>
                            <label class="inline-flex items-center gap-2 text-sm">
                                <input
                                    type="radio"
                                    value="category"
                                    v-model="acknowledgementScope"
                                    :disabled="isEditing"
                                    test-id="acknowledgement-scope-category"
                                />
                                {{
                                    t(
                                        'document.settings.document_acknowledgements.form.scope_category'
                                    )
                                }}
                            </label>
                        </div>
                    </div>

                    <div class="space-y-2" v-if="acknowledgementScope === 'org_unit' && showTeamSelect">
                        <label class="block text-sm text-neutral-700">
                            {{ t('document.settings.document_acknowledgements.form.scope_org_unit') }}
                            <span class="text-red-700">*</span>
                        </label>
                        <SearcheableMultiSelect
                            v-model="selectedUnits"
                            :results="teams"
                            :display="(team?: OrganizationUnit) => team?.name || ''"
                            :placeholder="t('admin_org_unit_tree.search_placeholder')"
                            test-id="organization-unit-tree"
                        />
                    </div>

                    <div class="space-y-2" v-else>
                        <div class="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                            <label class="block text-sm text-neutral-700">
                                {{
                                    t(
                                        'document.settings.document_acknowledgements.form.category_label'
                                    )
                                }}
                                <span class="text-red-700">*</span>
                            </label>
                            <AddAndReload
                                href="/plan/documents/settings?tab=2"
                                :addText="t('document.form.add_category')"
                                add-test-id="document-add-category-button"
                                reload-test-id="document-reload-categories-button"
                                @reload="reloadDocumentCategories"
                            />
                        </div>
                        <Select2
                            v-model="selectedCategory"
                            :values="availableCategories"
                            :display="displayCategoryName"
                            :placeholder="
                                t(
                                    'document.settings.document_acknowledgements.form.category_placeholder'
                                )
                            "
                            :optional="false"
                            test-id="document-acknowledgement-category-select"
                        />
                    </div>

                    <div class="space-y-4" v-if="scopeReady">
                        <div class="flex items-center justify-between">
                            <h3 class="text-lg">
                                {{ t('document.settings.document_acknowledgements.form.section_users') }}
                            </h3>
                            <div v-if="acknowledgementScope === 'org_unit'" class="flex items-center">
                                <input
                                    type="checkbox"
                                    id="all-users"
                                    v-model="allUsers"
                                    test-id="all-users-checkbox"
                                />
                                <label for="all-users" class="ml-2 text-sm">
                                    {{
                                        t(
                                            'document.settings.document_acknowledgements.form.all_users',
                                            { count: searchResults.length }
                                        )
                                    }}
                                </label>
                            </div>
                        </div>
                        <span class="text-sm text-neutral-500">
                            {{ t('document.settings.document_acknowledgements.form.users_hint') }}
                        </span>
                        <SearcheableMultiSelect
                            v-if="acknowledgementScope === 'category' || !allUsers"
                            v-model="selectedUsers"
                            :results="searchResults"
                            :display="(user: User) => `${user.fname} ${user.lname}`"
                            :placeholder="
                                t(
                                    'document.settings.document_acknowledgements.form.users_search_placeholder'
                                )
                            "
                            test-id="acknowledgement-users-multiselect"
                        />
                    </div>

                    <div
                        class="p-6 border-t bg-neutral-50 flex items-center justify-end gap-4 rtl:flex-row-reverse rtl:justify-start"
                    >
                        <AppButton
                            buttonStyle="secondary"
                            type="button"
                            @click="cancel"
                            test-id="cancel-button"
                        >
                            {{ t('common.cancel') }}
                        </AppButton>
                        <AppButton
                            buttonStyle="primary"
                            type="submit"
                            :loading="isSubmitting"
                            test-id="save-changes-button"
                        >
                            {{ t('document.settings.document_acknowledgements.form.save_changes') }}
                        </AppButton>
                    </div>
                </Form>
                <div v-else>
                    <div class="flex items-center justify-center h-full">
                        <Spinner width="5" />
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, watchEffect } from 'vue'
import { Form } from 'vee-validate'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AppInputForm from '@/components/AppInputForm.vue'
import AppButton from '@/components/AppButton.vue'
import BreadCrums from '@/components/breadCrums.vue'
import type { DocumentAcknowledgement, DocumentType, OrganizationUnit, User } from '@/util/interfaces'
import { useAuthStore } from '../../stores/auth'
import { apiGet, apiPost, apiPut } from '../../util/api'
import { formatApiErrorMessage } from '../../util/util'
import { useToast } from '../../stores/notification'
import Select2 from '../Select2.vue'
import AddAndReload from '../AddAndReload.vue'
import SearcheableMultiSelect from '../SearcheableMultiSelect.vue'
import Spinner from '../Spinner.vue'
import { getOrgUnits } from '@/components/common/endpoints'
import { showTeamPicker, resolveSelectedTeams } from '@/util/teams-feature'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToast()
const { t, locale } = useI18n()

const isRtl = computed(() => locale.value === 'ar')
const isSubmitting = ref(false)
const loading = ref(true)
const acknowledgementId = route.params.id
const isEditing = !!acknowledgementId

const acknowledgementScope = ref<'org_unit' | 'category'>('org_unit')
const teams = ref<OrganizationUnit[]>([])
const selectedUnits = ref<OrganizationUnit[]>([])
const documentTypes = ref<DocumentType[]>([])
const categoryIdsInUse = ref<Set<number>>(new Set())
const selectedCategory = ref<DocumentType | null>(null)
const allUsers = ref(false)
const selectedUsers = ref<User[]>([])
const searchResults = ref<User[]>([])
const acknowledgement = ref<(DocumentAcknowledgement & { users?: User[] }) | null>(null)
const showTeamSelect = computed(() => showTeamPicker(teams.value.length))

const displayCategoryName = (item: DocumentType) => item?.name || ''
const nameRule = (v: string) =>
    !v ? t('document.settings.document_acknowledgements.form.name_required') : true

const availableCategories = computed(() => {
    const currentCategoryId = selectedCategory.value?.id
    return documentTypes.value.filter(
        (type) => !categoryIdsInUse.value.has(type.id) || type.id === currentCategoryId
    )
})

const scopeReady = computed(() =>
    acknowledgementScope.value === 'category'
        ? !!selectedCategory.value?.id
        : selectedUnits.value.length > 0
)

const crums = computed(() => [
    {
        name: t('nav.documents'),
        path: '/plan/documents',
        icon: 'fa-solid fa-file-lines text-neutral-700 text-2xl'
    },
    {
        name: t('document.main.settings'),
        path: '/plan/documents/settings',
        icon: 'fa-solid fa-gear text-neutral-700 text-2xl'
    },
    {
        name: isEditing
            ? t('document.settings.document_acknowledgements.form.breadcrumb_edit')
            : t('document.settings.document_acknowledgements.form.breadcrumb_add'),
        path: '',
        icon: ''
    }
])

watch(acknowledgementScope, (scope) => {
    if (isEditing) return
    selectedUsers.value = []
    allUsers.value = false
    if (scope === 'category') {
        selectedUnits.value = []
    } else {
        selectedCategory.value = null
        selectedUnits.value = resolveSelectedTeams(teams.value)
    }
})

watch(allUsers, (value) => {
    if (value) {
        selectedUsers.value = []
    }
})

watch(selectedCategory, (newVal, oldVal) => {
    if (!oldVal?.id || newVal?.id === oldVal.id) return
    selectedUsers.value = []
})

watchEffect(async () => {
    if (!scopeReady.value) {
        searchResults.value = []
        return
    }

    const teamIds = (authStore.state.userDetails?.teams ?? []).map((team) => team.id)
    if (!teamIds.length) {
        searchResults.value = []
        return
    }

    try {
        const response = await apiPost<User[]>(
            '/permissions/teams/access',
            {
                teamIds,
                subject: 'documents'
            },
            authStore
        )
        searchResults.value = response
    } catch (error: any) {
        const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(
            t('document.settings.document_acknowledgements.form.toast_load_members_title'),
            apiMsg || t('document.settings.document_acknowledgements.form.toast_load_members_fallback'),
            'error'
        )
    }
})

onMounted(async () => {
    try {
        const [teamsResponse, typesResponse, acknowledgementsResponse] = await Promise.all([
            getOrgUnits('document_acknowledgements', authStore),
            apiGet<DocumentType[]>('/documents/types', authStore),
            apiGet<DocumentAcknowledgement[]>('/documents/document-acknowledgements', authStore)
        ])

        teams.value = teamsResponse ?? []
        documentTypes.value = typesResponse ?? []
        categoryIdsInUse.value = new Set(
            (acknowledgementsResponse ?? [])
                .map((item) => item.documentType?.id ?? item.documentTypeId)
                .filter((id): id is number => typeof id === 'number' && id > 0)
        )

        selectedUnits.value = resolveSelectedTeams(teams.value)

        if (isEditing) {
            const existingAcknowledgement = await apiGet<DocumentAcknowledgement & { users?: User[] }>(
                `/documents/document-acknowledgements/${acknowledgementId}`,
                authStore
            )
            acknowledgement.value = existingAcknowledgement

            const categoryId =
                existingAcknowledgement.documentType?.id ?? existingAcknowledgement.documentTypeId
            if (categoryId) {
                acknowledgementScope.value = 'category'
                selectedCategory.value =
                    documentTypes.value.find((type) => type.id === categoryId) ??
                    existingAcknowledgement.documentType ??
                    null
                allUsers.value = false
            } else {
                acknowledgementScope.value = 'org_unit'
                const linkedUnitIds = (
                    (existingAcknowledgement as { teams?: { id?: number; team?: { id?: number } }[] }).teams || []
                ).map((unit) => unit.team?.id ?? unit.id)
                selectedUnits.value = resolveSelectedTeams(
                    teams.value,
                    teams.value.filter((team) => linkedUnitIds.includes(team.id))
                )
                allUsers.value = !!existingAcknowledgement.allUsers
            }

            selectedUsers.value = existingAcknowledgement.users ?? []
        }
    } catch (error: any) {
        const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(
            t('document.settings.document_acknowledgements.form.toast_load_data_title'),
            apiMsg || t('document.settings.document_acknowledgements.form.toast_load_data_fallback'),
            'error'
        )
    } finally {
        loading.value = false
    }
})

const reloadDocumentCategories = async () => {
    try {
        const types = await apiGet<DocumentType[]>('/documents/types', authStore)
        documentTypes.value = types
    } catch (error: any) {
        const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(t('common.error'), apiMsg || t('document.form.toast_fetch_options_failed'), 'error')
    }
}

const submitForm = async (values: any) => {
    isSubmitting.value = true

    if (acknowledgementScope.value === 'org_unit' && !selectedUnits.value.length) {
        const msg = t('document.settings.document_acknowledgements.form.toast_ou_required')
        toast.showToast(msg, msg, 'error')
        isSubmitting.value = false
        return
    }

    if (acknowledgementScope.value === 'category' && !selectedCategory.value?.id) {
        const msg = t('document.settings.document_acknowledgements.form.toast_category_required')
        toast.showToast(msg, msg, 'error')
        isSubmitting.value = false
        return
    }

    const isCategoryScope = acknowledgementScope.value === 'category'

    try {
        const payload = {
            name: values.name,
            description: values.description || '',
            teams: isCategoryScope
                ? []
                : selectedUnits.value.map((unit) => ({ id: unit.id })),
            documentTypeId: isCategoryScope ? selectedCategory.value?.id : undefined,
            allUsers: isCategoryScope ? false : allUsers.value,
            includeChildren: false,
            users:
                isCategoryScope || !allUsers.value
                    ? selectedUsers.value.map((user) => ({ id: user.id }))
                    : []
        }
        if (isEditing) {
            await apiPut(
                `/documents/document-acknowledgements/${acknowledgementId}`,
                payload,
                authStore
            )
            toast.showToast(
                t('common.success'),
                t('document.settings.document_acknowledgements.form.toast_updated'),
                'success'
            )
        } else {
            await apiPost('/documents/document-acknowledgements', payload, authStore)
            toast.showToast(
                t('common.success'),
                t('document.settings.document_acknowledgements.form.toast_created'),
                'success'
            )
        }
        router.push('/plan/documents/settings?tab=1')
    } catch (error: any) {
        isSubmitting.value = false
        const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(
            isEditing
                ? t('document.settings.document_acknowledgements.form.toast_error_update_title')
                : t('document.settings.document_acknowledgements.form.toast_error_create_title'),
            apiMsg ||
                (isEditing
                    ? t('document.settings.document_acknowledgements.form.toast_error_update_body')
                    : t('document.settings.document_acknowledgements.form.toast_error_create_body')),
            'error'
        )
    }
}

const cancel = () => {
    router.push('/plan/documents/settings?tab=1')
}
</script>
