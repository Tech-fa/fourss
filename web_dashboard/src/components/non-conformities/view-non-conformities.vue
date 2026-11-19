<template>
    <div class="min-h-screen bg-neutral-50">
        <BreadCrums :crumbs="crumbs"> </BreadCrums>

        <!-- Main Detail Area -->
        <main id="main-content" class="flex-1 p-6">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="text-center">
                    <Spinner width="5" />
                </div>
            </div>

            <!-- Content -->
            <div v-else-if="nonConformity">
                <!-- Detail Header -->
                <div id="detail-header" class="mb-6">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <h2 class="text-3xl text-neutral-900" test-id="nc-details-title">
                                {{ nonConformity?.name || `NC-${nonConformity.id.slice(0, 8)}` }}
                            </h2>
                            <span
                                class="inline-flex px-3 py-1 text-sm rounded-full"
                                :class="
                                    displayStatus === 'OVERDUE'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-neutral-100 text-neutral-800'
                                "
                                test-id="nc-details-status"
                                >{{ getStatusText(displayStatus) }}</span
                            >
                        </div>
                        <div class="flex gap-3">
                            <Can subject="non_conformities" :actions="['amend_due_date']">
                                <AppButton
                                    v-if="isOverdue"
                                    buttonStyle="secondary"
                                    test-id="nc-details-amend-due-date-button"
                                    @click="handleAmendDueDate"
                                >
                                    <i class="fa-solid fa-calendar-days me-2"></i>
                                    {{ $t('nc.detail.amendDueDate') }}
                                </AppButton>
                            </Can>
                            <Can subject="non_conformities" :actions="['update']">
                                <AppButton
                                    v-if="canMutate"
                                    buttonStyle="secondary"
                                    test-id="nc-details-edit-button"
                                    @click="
                                        router.push({
                                            path: `/act/non-conformities/${nonConformity.id}/edit`,
                                            query: { fromView: 'true' }
                                        })
                                    "
                                >
                                    <i class="fa-solid fa-edit me-2"></i>
                                    {{ $t('nc.detail.edit') }}
                                </AppButton>
                            </Can>
                            <!-- <Can subject="non_conformities" :actions="['read']">
                                <AppButton buttonStyle="secondary">
                                    <i class="fa-solid fa-print mr-2"></i>
                                    Print
                                </AppButton>
                            </Can> -->
                            <Can subject="non_conformities" :actions="['close']">
                                <AppButton
                                    buttonStyle="primary"
                                    v-if="canMutate"
                                    test-id="nc-details-close-button"
                                    :loading="loading || isClosingNc"
                                    @click="handleCloseNC"
                                >
                                    <i class="fa-solid fa-check me-2"></i>
                                    {{ $t('nc.detail.closeNC') }}
                                </AppButton>
                            </Can>
                        </div>
                    </div>
                </div>

                <div
                    v-if="isOverdue"
                    class="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                    test-id="nc-overdue-banner"
                >
                    {{ $t('nc.detail.overdueLocked') }}
                </div>

                <!-- Tabs -->
                <Tabs 
                    :tabs="tabs" 
                    v-model="currentTab"
                    :testIds="tabTestIds"
                />

                <div class="mt-6">
                    <!-- Details Tab -->
                    <div v-if="currentTab === 0" class="space-y-6">
                        <NonConformitiesDetails :nonConformity="nonConformity" />
                    </div>

                    <!-- Immediate Actions Tab -->
                    <div v-if="currentTab === 1" class="space-y-6">
                        <Can subject="immediate_actions" :actions="['read']">
                            <NcImmediateActions
                                :non-conformity-id="nonConformity.id"
                                :can-edit="canMutate"
                                action-view-path="/tasks/immediate-actions"
                            />
                        </Can>
                    </div>

                    <!-- Timeline Tab -->
                    <div v-if="currentTab === 2" class="space-y-6">
                        <InvestigationTimeline ref="timelineRef" :nonConformity="nonConformity" />
                    </div>

                    <!-- Investigation & Root Cause Analysis Tab -->
                    <div v-if="currentTab === 3" class="space-y-6">
                        <!-- Investigation Details -->
                        <InvestigationDetails
                            :nonConformityId="nonConformity.id"
                            @investigation-updated="handleInvestigationUpdate"
                            :nonConformity="nonConformity"
                        />
                        <!-- Investigation Evidence (show after investigation is created) -->
                        <InvestigationEvidence
                            v-if="firstInvestigationId"
                            :investigationId="firstInvestigationId"
                            :nonConformity="nonConformity"
                        />
                        <!-- Root Cause Analysis -->
                        <RcaDetails
                            v-if="shouldShowRCA"
                            :nonConformityId="nonConformity.id"
                            :nonConformity="nonConformity"
                        />
                    </div>
                </div>
            </div>

            <!-- Error State -->
            <div v-else class="flex items-center justify-center py-12">
                <div class="text-center">
                    <i class="fa-solid fa-exclamation-triangle text-4xl text-neutral-400 mb-4"></i>
                    <p class="text-neutral-600">{{ $t('nc.list.notFound') }}</p>
                    <Can subject="non_conformities" :actions="['read']">
                        <AppButton
                            buttonStyle="secondary"
                            class="mt-4"
                            @click="router.push('/act/non-conformities')"
                        >
                            {{ $t('nc.list.backToList') }}
                        </AppButton>
                    </Can>
                </div>
            </div>
        </main>
    </div>
</template>

<script setup lang="ts">
import BreadCrums from '../breadCrums.vue'
import NonConformitiesDetails from './non-conformities-details.vue'
import Tabs from '@/components/Tabs.vue'
import AppButton from '../AppButton.vue'
import Can from '../Can.vue'
import InvestigationEvidence from './investigation-evidence.vue'
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick, defineComponent, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { apiGet } from '@/util/api'
import { getAllInvestigations, closeNonConformity, amendNonConformityDueDate, NON_CONFORMITY_ERROR_I18N_PREFIX } from './endpoints'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { useDialog } from '@/stores/dialog'
import { formatApiErrorMessage, isInPast, ncDisplayStatus, isNonConformityOverdue, canMutateNonConformity } from '@/util/util'
import {
    type NonConformityResponseDTO,
    type InvestigationResponseDTO
} from '@/util/interfaces'
import AppTextareaForm from '@/components/AppTextareaForm.vue'
import AppInputForm from '@/components/AppInputForm.vue'
import NcImmediateActions from './nc-immediate-actions.vue'

const CommonModal = defineComponent({
    name: 'CommonModal',
    props: {
        title: { type: String, default: '' },
        fieldsComponent: { type: Object, default: null }
    },
    setup(props) {
        return () =>
            h('div', { class: 'bg-white rounded-lg p-6 w-[480px]' }, [
                h('h2', { class: 'text-lg mb-4' }, props.title),
                props.fieldsComponent ? h(props.fieldsComponent as any) : null
            ])
    }
})
import InvestigationDetails from './investigation-details.vue'
import RcaDetails from './rca-details.vue'
import InvestigationTimeline from './investigation-timeline.vue'
import Spinner from '../Spinner.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToast()
const dialog = useDialog()
const { t } = useI18n()

// Tab state
const currentTab = ref(0)
const tabs = computed(() => [
    t('nc.detail.tabDetails'),
    t('nc.detail.tabImmediateActions'),
    t('nc.detail.tabTimeline'),
    t('nc.detail.tabInvestigation')
])
const tabTestIds = [
    'nc-details-tab',
    'nc-immediate-actions-tab',
    'nc-timeline-tab',
    'nc-investigation-rca-tab'
]

// Non-conformity data
const nonConformity = ref<NonConformityResponseDTO | null>(null)
const loading = ref(true)
const isClosingNc = ref(false)
const investigations = ref<InvestigationResponseDTO[]>([])
const id = route.params.id as string
// Timeline component reference
const timelineRef = ref<InstanceType<typeof InvestigationTimeline> | null>(null)
const refreshTimeoutId = ref<NodeJS.Timeout | null>(null)

// Computed properties
const shouldShowRCA = computed(() => {
    return investigations.value.some((inv) => inv.action === 'openRCA')
})

const shouldShowCorrectiveActions = computed(() => {
    return investigations.value.some((inv) => inv.action === 'openCA')
})

// Add a computed property for the first investigationId
const firstInvestigationId = computed(() =>
    investigations.value.length > 0 ? investigations.value[0].id : null
)

const isOverdue = computed(() => isNonConformityOverdue(nonConformity.value))
const displayStatus = computed(() => ncDisplayStatus(nonConformity.value))
const canMutate = computed(() => canMutateNonConformity(nonConformity.value))

// Fetch non-conformity by ID
const fetchNonConformity = async () => {
    if (!id) {
        toast.showToast(t('common.error'), t('nc.detail.idRequired'), 'error')
        router.push('/act/non-conformities')
        return
    }

    loading.value = true
    try {
        const response = await apiGet<NonConformityResponseDTO>(
            `/non-conformities/${id}`,
            authStore
        )
        nonConformity.value = response
    } catch (error: any) {
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.detail.loadError'),
            'error'
        )
        router.push('/act/non-conformities')
    } finally {
        loading.value = false
    }
}
const tabParam = route.query.tab
if (tabParam && !isNaN(Number(tabParam))) {
    const tabIndex = Number(tabParam)
    if (tabIndex >= 0 && tabIndex < 4) {
        currentTab.value = tabIndex
    }
}
watch(currentTab, (newTab) => {
    router.replace({
        query: {
            ...route.query,
            tab: newTab
        }
    })
})

const getStatusText = (status: string) => {
    switch (status) {
        case 'OPEN':
            return t('nc.detail.statusOpen')
        case 'OVERDUE':
            return t('nc.detail.statusOverdue')
        case 'IN_PROGRESS':
            return t('nc.detail.statusInProgress')
        case 'CLOSED':
            return t('nc.detail.statusClosed')
        default:
            return status
    }
}

const handleAmendDueDate = () => {
    if (!nonConformity.value || !isOverdue.value) return

    const Fields = defineComponent({
        name: 'NcAmendDueDateFields',
        setup() {
            return () =>
                h('div', { class: 'space-y-2' }, [
                    h('p', { class: 'text-neutral-800' }, t('nc.detail.amendDueDateDialog.message')),
                    h(AppInputForm as any, {
                        name: 'dueDate',
                        type: 'date',
                        label: t('nc.detail.amendDueDateDialog.dueDateLabel'),
                        placeholder: t('nc.detail.amendDueDateDialog.dueDatePlaceholder'),
                        rules: (v: string) => {
                            if (!v) return t('nc.form.dueDateRequired')
                            if (isInPast(v)) return t('nc.form.dueDatePast')
                            return true
                        }
                    })
                ])
        }
    })

    dialog.openDialog(CommonModal as any, {
        title: t('nc.detail.amendDueDateDialog.title'),
        initialValues: { dueDate: '' },
        fieldsComponent: Fields as any,
        submitLabel: t('nc.detail.amendDueDateDialog.submitLabel'),
        submitTestId: 'nc-amend-due-date-submit',
        onSubmit: async (values: any) => {
            if (!values?.dueDate) {
                toast.showToast(t('common.validationError'), t('nc.form.dueDateRequired'), 'error')
                return
            }
            if (isInPast(values.dueDate)) {
                toast.showToast(t('common.validationError'), t('nc.form.dueDatePast'), 'error')
                return
            }
            try {
                await amendNonConformityDueDate(nonConformity.value!.id, values.dueDate, authStore)
                toast.showToast(
                    t('common.success'),
                    t('nc.detail.amendDueDateDialog.success'),
                    'success'
                )
                await fetchNonConformity()
                timelineRef.value?.refreshTimeline()
                dialog.closeDialog()
            } catch (error: any) {
                toast.showToast(
                    t('common.error'),
                    formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) ||
                        t('nc.detail.amendDueDateDialog.error'),
                    'error'
                )
            }
        },
        onCancel: dialog.closeDialog
    })
}

// Fetch investigations for the current NC
const fetchInvestigations = async () => {
    try {
        const response = (await getAllInvestigations(id, authStore)) as any
        investigations.value = response.data || response || []
    } catch (error: any) {
        console.error('Error fetching investigations:', error)
        investigations.value = []
    }
}

// Handle investigation updates
const handleInvestigationUpdate = () => {
    fetchInvestigations()
    // Also refresh the timeline to show new events
    timelineRef.value?.refreshTimeline()
}

// Close NC functionality with optional closing comment
const handleCloseNC = () => {
    if (!nonConformity.value || loading.value || isClosingNc.value) return

    const Fields = defineComponent({
        name: 'NcCloseFields',
        setup() {
            return () =>
                h('div', { class: 'space-y-2' }, [
                    h('div', { class: 'text-neutral-800' }, t('nc.detail.closeDialog.message')),
                    h(AppTextareaForm as any, {
                        name: 'closingComment',
                        placeholder: t('nc.detail.closeDialog.commentPlaceholder')
                    })
                ])
        }
    })

    dialog.openDialog(CommonModal as any, {
        title: t('nc.detail.closeDialog.title'),
        initialValues: { closingComment: '' },
        fieldsComponent: Fields as any,
        submitLabel: t('nc.detail.closeDialog.submitLabel'),
        loading: loading.value || isClosingNc.value,
        onSubmit: async (values: any) => {
            isClosingNc.value = true
            try {
                await closeNonConformity(nonConformity.value!.id, authStore, values.closingComment)
                toast.showToast(t('common.success'), t('nc.detail.closeDialog.success'), 'success')

                await fetchNonConformity()
                timelineRef.value?.refreshTimeline()

                dialog.closeDialog()
            } catch (error: any) {
                toast.showToast(
                    t('common.error'),
                    formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.detail.closeDialog.error'),
                    'error'
                )
            } finally {
                isClosingNc.value = false
            }
        },
        onCancel: () => {
            if (isClosingNc.value) return
            dialog.closeDialog()
        }
    })
}

onMounted(async () => {
    await Promise.all([fetchNonConformity(), fetchInvestigations()])
})

const crumbs = computed(() => {
    const instanceId = route.query.instanceId as string | undefined
    const programId = route.query.programId as string | undefined

    const base = [
        {
            name: t('nc.breadcrumbs.nonConformities'),
            path: '/act/non-conformities',
            icon: 'fa-solid fa-exclamation-triangle'
        }
    ]

    if (instanceId && programId) {
        base.push({
            name: t('nc.breadcrumbs.instance'),
            path: `/check/audits/${programId}/instances/${instanceId}?tab=2`,
            icon: 'fa-solid fa-file-pen'
        })
    }

    base.push({
        name: t('nc.breadcrumbs.viewNonConformities'),
        path: '/act/non-conformities/view',
        icon: 'fa-solid fa-eye'
    })
    return base
})
</script>
