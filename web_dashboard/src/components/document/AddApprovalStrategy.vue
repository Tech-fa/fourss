<template>
    <div id="root" class="min-h-screen bg-neutral-50">
        <BreadCrums :crumbs="crums" />
        <main id="main-content" class="p-4 sm:p-6 lg:p-8">
            <div
                id="approval-form"
                class="max-w-3xl mx-auto bg-white rounded-lg shadow-sm text-start"
                :dir="isRtl ? 'rtl' : 'ltr'"
            >
                <div class="p-6 border-b">
                    <div class="flex items-center gap-4">
                        <div>
                            <h2 class="text-lg">
                                {{
                                    isEditing
                                        ? t('document.settings.approval_strategies.form.title_edit')
                                        : t('document.settings.approval_strategies.form.title_add')
                                }}
                            </h2>
                            <p class="text-neutral-500">
                                {{
                                    isDefaultStrategy
                                        ? t('document.settings.approval_strategies.form.subtitle_default')
                                        : isEditing
                                          ? t('document.settings.approval_strategies.form.subtitle_edit')
                                          : t('document.settings.approval_strategies.form.subtitle_add')
                                }}
                            </p>
                        </div>
                    </div>
                </div>

                <Form @submit="submitForm" class="p-6 space-y-6" v-if="!loading">
                    <Notice
                        v-if="isDefaultStrategy"
                        level="info"
                        :description="
                            t('document.settings.approval_strategies.form.default_notice')
                        "
                    />

                    <div class="space-y-4">
                        <AppInputForm
                            v-if="!isEditing || (isEditing && strategy?.name)"
                            :value="strategy?.name"
                            name="name"
                            :label="t('document.settings.approval_strategies.form.strategy_name_label')"
                            type="text"
                            :placeholder="
                                t('document.settings.approval_strategies.form.strategy_name_placeholder')
                            "
                            :required="true"
                            :rules="strategyNameRule"
                            test-id="strategy-name-input"
                        />
                    </div>

                    <div class="space-y-2">
                        <div class="flex items-center">
                            <input
                                type="checkbox"
                                id="allow-ordering"
                                v-model="allowOrdering"
                                test-id="allow-ordering"
                            />
                            <label for="allow-ordering" class="ml-2 text-sm">
                                {{
                                    t(
                                        'document.settings.approval_strategies.form.allow_ordering_label'
                                    )
                                }}
                            </label>
                        </div>
                        <p class="text-sm text-neutral-500">
                            {{
                                t('document.settings.approval_strategies.form.allow_ordering_hint')
                            }}
                        </p>
                    </div>

                    <div class="space-y-2" v-if="isCategoryStrategy">
                        <div class="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                            <label class="block text-sm text-neutral-700">
                                {{ t('document.settings.approval_strategies.form.category_label') }}
                                <span class="text-red-700">*</span>
                            </label>
                            <AddAndReload
                                href="/plan/documents/settings?tab=1"
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
                            :placeholder="t('document.settings.approval_strategies.form.category_placeholder')"
                            :optional="false"
                            test-id="approval-strategy-category-select"
                        />
                    </div>

                    <div
                        id="reviewers-section"
                        class="space-y-4"
                        v-if="scopeReady"
                        test-id="reviewers-section"
                    >
                        <div class="flex items-center justify-between">
                            <h3 class="text-lg">
                                {{ t('document.settings.approval_strategies.form.section_reviewers') }}
                            </h3>
                            <div v-if="allowsSelectAllMembers" class="flex items-center">
                                <input
                                    type="checkbox"
                                    id="select-all-reviewers"
                                    v-model="selectAllReviewers"
                                    test-id="select-all-reviewers"
                                />
                                <label for="select-all-reviewers" class="ml-2 text-sm">
                                    {{
                                        t('document.settings.approval_strategies.form.select_all_members', {
                                            count: searchResults.length
                                        })
                                    }}
                                </label>
                            </div>
                            <div class="flex items-center">
                                <input type="checkbox" id="no-review" v-model="noReview" />
                                <label
                                    for="no-review"
                                    class="ml-2 text-sm"
                                    test-id="no-review-needed"
                                >
                                    {{ t('document.settings.approval_strategies.form.no_review_needed') }}
                                </label>
                            </div>
                        </div>
                        <template v-if="!noReview">
                            <span class="text-sm text-neutral-500">
                                {{
                                    isCategoryStrategy
                                        ? t(
                                              'document.settings.approval_strategies.form.category_reviewers_hint'
                                          )
                                        : t('document.settings.approval_strategies.form.reviewers_hint')
                                }}
                            </span>
                            <SearcheableMultiSelect
                                v-if="allowsSelectAllMembers ? !selectAllReviewers : true"
                                v-model="selectedReviewers"
                                :results="searchResults"
                                :display="(user: User) => `${user.fname} ${user.lname}`"
                                :placeholder="
                                    t(
                                        'document.settings.approval_strategies.form.reviewers_search_placeholder'
                                    )
                                "
                                test-id="reviewers-multiselect"
                            />
                            <div
                                v-if="allowOrdering && !selectAllReviewers && selectedReviewers.length"
                                class="space-y-2"
                                test-id="reviewer-orders"
                            >
                                <div
                                    v-for="user in selectedReviewers"
                                    :key="user.id"
                                    class="flex items-center justify-between gap-3"
                                >
                                    <span class="text-sm">{{ user.fname }} {{ user.lname }}</span>
                                    <label class="flex items-center gap-2 text-sm text-neutral-600">
                                        {{
                                            t(
                                                'document.settings.approval_strategies.form.order_label'
                                            )
                                        }}
                                        <input
                                            type="number"
                                            min="1"
                                            class="w-20 rounded border border-neutral-300 px-2 py-1 text-sm"
                                            :value="memberOrder(reviewerOrders, user.id)"
                                            @input="
                                                setMemberOrder(
                                                    reviewerOrders,
                                                    user.id,
                                                    ($event.target as HTMLInputElement).value
                                                )
                                            "
                                        />
                                    </label>
                                </div>
                            </div>
                        </template>
                    </div>

                    <div
                        id="approvers-section"
                        class="space-y-4"
                        v-if="scopeReady"
                        test-id="approvers-section"
                    >
                        <div class="flex items-center justify-between">
                            <h3 class="text-lg">
                                {{ t('document.settings.approval_strategies.form.section_approvers') }}
                            </h3>
                            <div v-if="allowsSelectAllMembers" class="flex items-center">
                                <input
                                    type="checkbox"
                                    id="select-all-approvers"
                                    v-model="selectAllApprovers"
                                    test-id="select-all-approvers"
                                />
                                <label for="select-all-approvers" class="ml-2 text-sm">
                                    {{
                                        t('document.settings.approval_strategies.form.select_all_members', {
                                            count: searchResults.length
                                        })
                                    }}
                                </label>
                            </div>
                            <div class="flex items-center">
                                <input type="checkbox" id="no-approve" v-model="noApprove" />
                                <label
                                    for="no-approve"
                                    class="ml-2 text-sm"
                                    test-id="no-approval-needed"
                                >
                                    {{ t('document.settings.approval_strategies.form.no_approval_needed') }}
                                </label>
                            </div>
                        </div>
                        <template v-if="!noApprove">
                            <span class="text-sm text-neutral-500">
                                {{
                                    isCategoryStrategy
                                        ? t(
                                              'document.settings.approval_strategies.form.category_approvers_hint'
                                          )
                                        : t('document.settings.approval_strategies.form.approvers_hint')
                                }}
                            </span>
                            <SearcheableMultiSelect
                                v-if="allowsSelectAllMembers ? !selectAllApprovers : true"
                                v-model="selectedApprovers"
                                :results="searchResults"
                                :display="(user: User) => `${user.fname} ${user.lname}`"
                                :placeholder="
                                    t(
                                        'document.settings.approval_strategies.form.approvers_search_placeholder'
                                    )
                                "
                                test-id="approvers-multiselect"
                            />
                            <div
                                v-if="allowOrdering && !selectAllApprovers && selectedApprovers.length"
                                class="space-y-2"
                                test-id="approver-orders"
                            >
                                <div
                                    v-for="user in selectedApprovers"
                                    :key="user.id"
                                    class="flex items-center justify-between gap-3"
                                >
                                    <span class="text-sm">{{ user.fname }} {{ user.lname }}</span>
                                    <label class="flex items-center gap-2 text-sm text-neutral-600">
                                        {{
                                            t(
                                                'document.settings.approval_strategies.form.order_label'
                                            )
                                        }}
                                        <input
                                            type="number"
                                            min="1"
                                            class="w-20 rounded border border-neutral-300 px-2 py-1 text-sm"
                                            :value="memberOrder(approverOrders, user.id)"
                                            @input="
                                                setMemberOrder(
                                                    approverOrders,
                                                    user.id,
                                                    ($event.target as HTMLInputElement).value
                                                )
                                            "
                                        />
                                    </label>
                                </div>
                            </div>
                        </template>
                    </div>

                    <div id="dates-section" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <AppInputForm
                            :value="strategy?.maxReviewDuration"
                            v-if="
                                !noReview &&
                                (!isEditing ||
                                    (isEditing && strategy?.maxReviewDuration !== undefined))
                            "
                            name="maxReviewDuration"
                            :label="
                                t('document.settings.approval_strategies.form.max_review_duration_label')
                            "
                            type="number"
                            :placeholder="
                                t(
                                    'document.settings.approval_strategies.form.max_review_duration_placeholder'
                                )
                            "
                        />
                        <AppInputForm
                            :value="strategy?.maxApprovalDuration"
                            v-if="
                                !noApprove &&
                                (!isEditing ||
                                    (isEditing && strategy?.maxApprovalDuration !== undefined))
                            "
                            name="maxApprovalDuration"
                            :label="
                                t(
                                    'document.settings.approval_strategies.form.max_approval_duration_label'
                                )
                            "
                            type="number"
                            :placeholder="
                                t(
                                    'document.settings.approval_strategies.form.max_approval_duration_placeholder'
                                )
                            "
                        />
                    </div>

                    <div id="minimum-requirements" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <AppInputForm
                            name="requiredReviews"
                            :label="
                                t('document.settings.approval_strategies.form.min_reviewers_label')
                            "
                            type="number"
                            min="1"
                            v-if="!noReview && searchResults.length > 0"
                            :value="strategy?.requiredReviews"
                            :placeholder="
                                t('document.settings.approval_strategies.form.min_reviewers_placeholder')
                            "
                            :rules="minReviewersRule"
                        />
                        <AppInputForm
                            name="requiredApprovals"
                            :label="
                                t('document.settings.approval_strategies.form.min_approvers_label')
                            "
                            type="number"
                            min="1"
                            v-if="!noApprove && searchResults.length > 0"
                            :value="strategy?.requiredApprovals"
                            :placeholder="
                                t('document.settings.approval_strategies.form.min_approvers_placeholder')
                            "
                            :rules="minApproversRule"
                            test-id="minimum-approvers-input"
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
                            {{ t('document.settings.approval_strategies.form.save_changes') }}
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
import { ref, onMounted, watchEffect, watch, computed } from 'vue'
import { Form } from 'vee-validate'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import AppInputForm from '@/components/AppInputForm.vue'
import AppButton from '@/components/AppButton.vue'
import { useAuthStore } from '../../stores/auth'
import { apiPost, apiGet, apiPut } from '../../util/api'
import { formatApiErrorMessage } from '../../util/util'
import { useToast } from '../../stores/notification'
import BreadCrums from '@/components/breadCrums.vue'
import SearcheableMultiSelect from '../SearcheableMultiSelect.vue'
import Select2 from '../Select2.vue'
import type { ApprovalStrategy, DocumentType, OrganizationUnit, User } from '@/util/interfaces'
import { useRoute } from 'vue-router'
import Spinner from '../Spinner.vue'
import AddAndReload from '../AddAndReload.vue'
import Notice from '../Notice.vue'
import { getOrgUnits } from '@/components/common/endpoints'
import { resolveSelectedTeam } from '@/util/teams-feature'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToast()
const { t, locale } = useI18n()
const isRtl = computed(() => locale.value === 'ar')

const strategyNameRule = (v: any) =>
    !v ? t('document.settings.approval_strategies.form.strategy_name_required') : true

const isSubmitting = ref(false)
const teams = ref<OrganizationUnit[]>([])
const documentTypes = ref<DocumentType[]>([])
const categoryIdsInUse = ref<Set<number>>(new Set())
const selectedCategory = ref<DocumentType | null>(null)
const searchResults = ref<User[]>([])
const selectedReviewers = ref<User[]>([])
const selectedApprovers = ref<User[]>([])
const reviewerOrders = ref<Record<string, number>>({})
const approverOrders = ref<Record<string, number>>({})
const allowOrdering = ref(false)
const selectAllReviewers = ref(false)
const selectAllApprovers = ref(false)
const strategyId = route.params.id
const strategy = ref<ApprovalStrategy>()
const noReview = ref(false)
const noApprove = ref(false)
const loading = ref(true)
const isEditing = !!strategyId
const isDefaultStrategy = computed(() => !!strategy.value?.isDefault)
const isCategoryStrategy = computed(() => {
    if (!isEditing) return true
    if (isDefaultStrategy.value) return false
    const categoryId = strategy.value?.documentType?.id ?? strategy.value?.documentTypeId
    return !!categoryId
})

const displayCategoryName = (item: DocumentType) => item?.name || ''

function memberOrder(orders: Record<string, number>, userId: string) {
    const value = orders[userId]
    return typeof value === 'number' && value >= 1 ? value : 1
}

function setMemberOrder(orders: Record<string, number>, userId: string, raw: string) {
    const parsed = Number.parseInt(raw, 10)
    orders[userId] = Number.isFinite(parsed) && parsed >= 1 ? parsed : 1
}

function ordersFromMembers(
    members: Array<{ user: User; order?: number }>
): Record<string, number> {
    return Object.fromEntries(
        members.map((member) => [
            member.user.id,
            typeof member.order === 'number' && member.order >= 1 ? member.order : 1
        ])
    )
}

function participantPayload(users: User[], orders: Record<string, number>) {
    return users.map((user) => ({
        id: user.id,
        order: memberOrder(orders, user.id)
    }))
}

const availableCategories = computed(() => {
    const currentCategoryId = selectedCategory.value?.id
    return documentTypes.value.filter(
        (type) => !categoryIdsInUse.value.has(type.id) || type.id === currentCategoryId
    )
})

const scopeReady = computed(() =>
    isCategoryStrategy.value ? !!selectedCategory.value?.id : true
)

const allowsSelectAllMembers = computed(() => !isCategoryStrategy.value)

const minReviewersRule = (v: any) => {
    const reviewerCount =
        allowsSelectAllMembers.value && selectAllReviewers.value
            ? searchResults.value.length
            : selectedReviewers.value.length
    if (+v > reviewerCount) {
        return t('document.settings.approval_strategies.form.min_reviewers_rule')
    }
    return true
}

const minApproversRule = (v: any) => {
    const approverCount =
        allowsSelectAllMembers.value && selectAllApprovers.value
            ? searchResults.value.length
            : selectedApprovers.value.length
    if (+v > approverCount) {
        return t('document.settings.approval_strategies.form.min_approvers_rule')
    }
    return true
}

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
            ? t('document.settings.approval_strategies.form.breadcrumb_edit')
            : t('document.settings.approval_strategies.form.breadcrumb_add'),
        path: '',
        icon: ''
    }
])

watch(noReview, (value) => {
    if (value) {
        selectAllReviewers.value = false
        selectedReviewers.value = []
    }
})

watch(noApprove, (value) => {
    if (value) {
        selectAllApprovers.value = false
        selectedApprovers.value = []
    }
})

watch(selectAllReviewers, (value) => {
    if (value) {
        noReview.value = false
    }
})

watch(selectAllApprovers, (value) => {
    if (value) {
        noApprove.value = false
    }
})

watch(selectedCategory, (newVal, oldVal) => {
    if (!oldVal?.id || newVal?.id === oldVal.id) return
    selectedReviewers.value = []
    selectedApprovers.value = []
    selectAllReviewers.value = false
    selectAllApprovers.value = false
})

onMounted(async () => {
    try {
        const [teamsResponse, typesResponse, strategiesResponse] = await Promise.all([
            getOrgUnits('approval_strategies', authStore),
            apiGet<DocumentType[]>('/documents/types', authStore),
            apiGet<ApprovalStrategy[]>('/documents/approval-strategies', authStore)
        ])
        teams.value = teamsResponse || []
        documentTypes.value = typesResponse ?? []
        categoryIdsInUse.value = new Set(
            (strategiesResponse ?? [])
                .map((item) => item.documentType?.id ?? item.documentTypeId)
                .filter((id): id is number => typeof id === 'number' && id > 0)
        )

        if (isEditing) {
            const existingStrategy = await apiGet<ApprovalStrategy>(
                `/documents/approval-strategies/${strategyId}`,
                authStore
            )
            strategy.value = existingStrategy

            const categoryId =
                existingStrategy.documentType?.id ?? existingStrategy.documentTypeId
            if (categoryId && !existingStrategy.isDefault) {
                selectedCategory.value =
                    documentTypes.value.find((type) => type.id === categoryId) ??
                    existingStrategy.documentType ??
                    null
            }

            const hasCategory =
                !!(existingStrategy.documentType?.id ?? existingStrategy.documentTypeId) &&
                !existingStrategy.isDefault
            selectAllReviewers.value = hasCategory ? false : existingStrategy.allReviewers
            selectAllApprovers.value = hasCategory ? false : existingStrategy.allApprovers

            const reviewers = existingStrategy.documentApprovers.filter(
                (approver) => approver.roleType === 'reviewer'
            )
            const approvers = existingStrategy.documentApprovers.filter(
                (approver) => approver.roleType === 'approver'
            )
            selectedReviewers.value = reviewers.map((approver) => approver.user)
            selectedApprovers.value = approvers.map((approver) => approver.user)
            reviewerOrders.value = ordersFromMembers(reviewers)
            approverOrders.value = ordersFromMembers(approvers)
            allowOrdering.value = !!existingStrategy.allowOrdering
            noReview.value = existingStrategy.noReview
            noApprove.value = existingStrategy.noApprove
        }
        loading.value = false
    } catch (error: any) {
        toast.showToast(
            t('document.settings.approval_strategies.form.toast_load_data_title'),
            formatApiErrorMessage(error.response?.data, t, 'errors.document'),
            'error'
        )
    }
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
            `/permissions/teams/access`,
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
            t('document.settings.approval_strategies.form.toast_load_members_title'),
            apiMsg || t('document.settings.approval_strategies.form.toast_load_members_fallback'),
            'error'
        )
    }
})

const submitForm = async (values: any) => {
    isSubmitting.value = true

    if (isCategoryStrategy.value && !selectedCategory.value?.id) {
        const categoryMsg = t('document.settings.approval_strategies.form.toast_category_required')
        toast.showToast(categoryMsg, categoryMsg, 'error')
        isSubmitting.value = false
        return
    }

    try {
        const firstTeam = resolveSelectedTeam(teams.value)
        const existingUnitIds = ((strategy.value as { teams?: { id?: number; team?: { id?: number } }[] })?.teams || [])
            .map((unit) => unit.team?.id ?? unit.id)
            .filter((id): id is number => typeof id === 'number' && id > 0)
        const fallbackUnits =
            existingUnitIds.length > 0
                ? existingUnitIds.map((id) => ({ id }))
                : firstTeam
                  ? [{ id: firstTeam.id }]
                  : []

        const strategyData = isCategoryStrategy.value
            ? {
                  maxReviewDuration: values.maxReviewDuration || 0,
                  maxApprovalDuration: values.maxApprovalDuration || 0,
                  requiredReviews: noReview.value ? 0 : values.requiredReviews || 0,
                  requiredApprovals: noApprove.value ? 0 : values.requiredApprovals || 0,
                  teams: [],
                  documentTypeId: selectedCategory.value?.id,
                  allReviewers: false,
                  allApprovers: false,
                  allowOrdering: allowOrdering.value,
                  includeChildren: false,
                  reviewers: noReview.value
                      ? []
                      : participantPayload(selectedReviewers.value, reviewerOrders.value),
                  approvers: noApprove.value
                      ? []
                      : participantPayload(selectedApprovers.value, approverOrders.value),
                  name: values.name,
                  noReview: noReview.value,
                  noApprove: noApprove.value
              }
            : {
                  maxReviewDuration: values.maxReviewDuration || 0,
                  maxApprovalDuration: values.maxApprovalDuration || 0,
                  requiredReviews: noReview.value ? 0 : values.requiredReviews || 0,
                  requiredApprovals: noApprove.value ? 0 : values.requiredApprovals || 0,
                  teams: isDefaultStrategy.value
                      ? firstTeam
                          ? [{ id: firstTeam.id }]
                          : fallbackUnits
                      : fallbackUnits,
                  allReviewers: selectAllReviewers.value,
                  allApprovers: selectAllApprovers.value,
                  allowOrdering: allowOrdering.value,
                  includeChildren: false,
                  reviewers:
                      noReview.value || selectAllReviewers.value
                          ? []
                          : participantPayload(selectedReviewers.value, reviewerOrders.value),
                  approvers:
                      noApprove.value || selectAllApprovers.value
                          ? []
                          : participantPayload(selectedApprovers.value, approverOrders.value),
                  name: values.name,
                  noReview: noReview.value,
                  noApprove: noApprove.value
              }

        if (isEditing) {
            await apiPut(`/documents/approval-strategies/${strategyId}`, strategyData, authStore)
            const msg = t('document.settings.approval_strategies.form.toast_updated')
            toast.showToast(t('common.success'), msg, 'success')
        } else {
            await apiPost('/documents/approval-strategies', strategyData, authStore)
            const msg = t('document.settings.approval_strategies.form.toast_created')
            toast.showToast(t('common.success'), msg, 'success')
        }
        router.push('/plan/documents/settings')
    } catch (error: any) {
        isSubmitting.value = false
        const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(
            isEditing
                ? t('document.settings.approval_strategies.form.toast_error_update_title')
                : t('document.settings.approval_strategies.form.toast_error_create_title'),
            apiMsg ||
                (isEditing
                    ? t('document.settings.approval_strategies.form.toast_error_update_body')
                    : t('document.settings.approval_strategies.form.toast_error_create_body')),
            'error'
        )
    }
}

const reloadDocumentCategories = async () => {
    try {
        const types = await apiGet<DocumentType[]>('/documents/types', authStore)
        documentTypes.value = types
    } catch (error: any) {
        const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(t('common.error'), apiMsg || t('document.form.toast_fetch_options_failed'), 'error')
    }
}

const cancel = () => {
    router.push('/plan/documents/settings')
}
</script>
