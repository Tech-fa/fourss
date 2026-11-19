<template>
    <div class="bg-neutral-50 min-h-screen">
        <BreadCrums :crumbs="crumbs"> </BreadCrums>
        <div class="bg-white rounded-lg border border-neutral-200 max-w-4xl mx-auto mt-6" test-id="nc-form-card">
            <Form class="p-0" @submit="handleSubmit" @invalid-submit="onInvalidSubmit" v-if="!loadingEntity" test-id="nc-form">
                <div class="p-6">
                    <!-- Basic Information -->
                    <div id="basic-info" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div
                            v-if="isEdit || orgUnits.length > 0"
                            test-id="nc-org-unit-field"
                        >
                            <label class="block text-sm text-neutral-700 mb-2"
                                >{{ $t('nc.form.orgUnit') }} <span class="text-red-700">*</span></label
                            >
                            <Select2
                                v-if="!isEdit"
                                v-model="filters.orgUnit"
                                :values="orgUnits"
                                :display="(val?: OrganizationUnit) => val?.name || ''"
                                :placeholder="$t('nc.form.selectOrgUnit')"
                                test-id="nc-org-unit-select"
                            />
                            <p v-else class="text-sm text-black font-bold py-2">
                                {{ filters.orgUnit?.name || '' }}
                            </p>
                            <p
                                v-if="showValidationErrors && !filters.orgUnit"
                                class="text-red-600 text-xs mt-1"
                            >
                                {{ $t('nc.form.orgUnitRequired') }}
                            </p>
                        </div>
                        <div v-if="sitesModuleEnabled" test-id="nc-site-field">
                            <label class="block text-sm text-neutral-700 mb-2">{{
                                $t('nc.form.site')
                            }}</label>
                            <Select2
                                v-model="filters.site"
                                :values="sites"
                                :display="displaySite"
                                :optional="true"
                                :placeholder="
                                    filters.orgUnit || isEdit
                                        ? $t('nc.form.selectSite')
                                        : $t('nc.form.siteOrgHint')
                                "
                                test-id="nc-site-select"
                            />
                        </div>
                        <div class="" test-id="nc-representative-field">
                            <label class="block text-sm text-neutral-700 mb-2"
                                >{{ $t('nc.form.representative') }}</label
                            >
                            <div>
                                <Select2
                                    v-model="filters.ncRepresentative"
                                    :values="ncRepresentatives"
                                    :display="(val: any) => val?.firstName + ' ' + val?.lastName"
                                    :placeholder="
                                        filters.orgUnit
                                            ? $t('nc.form.selectRepresentative')
                                            : $t('nc.form.responsibleUserOrgHint')
                                    "
                                    test-id="nc-representative-select"
                                />
                            </div>
                        </div>
                        <div class="mb-4" test-id="nc-risk-level-field">
                            <label class="block text-sm text-neutral-700 mb-2"
                                >{{ $t('nc.form.riskLevel') }} <span class="text-red-700">*</span></label
                            >
                            <div :class="`flex ${!filters.riskLevel && showValidationErrors ? 'ring-1 ring-red-500 rounded-md' : ''}`">
                                <Select2
                                    v-model="filters.riskLevel"
                                    :values="riskLevels"
                                    :display="(val: NonConformityRiskLevel) => val?.name"
                                    :placeholder="$t('nc.form.selectRiskLevel')"
                                    test-id="nc-risk-level-select"
                                />
                            </div>
                            <div v-if="!filters.riskLevel && showValidationErrors" class="text-red-600 text-xs mt-1" test-id="nc-risk-level-error">
                                <p>{{ $t('nc.form.riskLevelRequired') }}</p>
                            </div>
                        </div>
                        <div class="mb-4" test-id="nc-type-field">
                            <label class="block text-sm text-neutral-700 mb-2"
                                >{{ $t('nc.form.ncrType') }} <span class="text-red-700">*</span></label
                            >
                            <div :class="`flex ${!filters.ncType && showValidationErrors ? 'ring-1 ring-red-500 rounded-md' : ''}`">
                                <Select2
                                    v-model="filters.ncType"
                                    :values="ncTypes"
                                    :display="(val: NonConformityType) => val?.name"
                                    :placeholder="$t('nc.form.selectNcrType')"
                                    test-id="nc-type-select"
                                />
                            </div>
                            <div v-if="!filters.ncType && showValidationErrors" class="text-red-600 text-xs mt-1" test-id="nc-type-error">
                                <p>{{ $t('nc.form.ncrTypeRequired') }}</p>
                            </div>
                        </div>
                    </div>
                    <!-- Date Information -->
                    <div id="date-info" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="mb-4" test-id="nc-reported-date-field">
                            <AppInputForm
                                name="reportedDate"
                                :label="$t('nc.form.reportedDate')"
                                type="date"
                                :value="reportedDate"
                                :placeholder="$t('nc.form.reportedDatePlaceholder')"
                                :rules="(v: any) => (!v ? $t('nc.form.reportedDateRequired') : true)"
                                required
                                test-id="nc-reported-date-input"
                            />
                        </div>
                        <div class="mb-4" test-id="nc-due-date-field">
                            <AppInputForm
                                name="dueDate"
                                :label="$t('nc.form.dueDate')"
                                type="date"
                                :value="dueDate"
                                :placeholder="$t('nc.form.dueDatePlaceholder')"
                                :rules="(v: any) => (!v ? $t('nc.form.dueDateRequired') : true)"
                                required
                                test-id="nc-due-date-input"
                            />
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div test-id="nc-category-field">
                            <label class="block text-sm text-neutral-700 mb-2"
                                >{{ $t('nc.form.category') }} <span class="text-red-700">*</span></label
                            >
                            <div :class="`flex ${!filters.category && showValidationErrors ? 'ring-1 ring-red-500 rounded-md' : ''}`">
                                <Select2
                                    v-model="filters.category"
                                    :values="categories"
                                    :display="(val: any) => val?.name"
                                    :placeholder="$t('nc.form.selectCategory')"
                                    test-id="nc-category-select"
                                />
                            </div>
                            <div v-if="!filters.category && showValidationErrors" class="text-red-600 text-xs mt-1" test-id="nc-category-error">
                                <p>{{ $t('nc.form.categoryRequired') }}</p>
                            </div>
                        </div>
                        <div test-id="nc-responsible-user-field">
                            <label class="block text-sm text-neutral-700 mb-2">{{
                                $t('nc.form.responsibleUser')
                            }}</label>
                            <Select2
                                v-model="filters.responsibleUser"
                                :values="responsibleUsers"
                                :display="displayResponsibleUser"
                                :optional="true"
                                :placeholder="
                                    filters.orgUnit
                                        ? $t('nc.form.selectResponsibleUser')
                                        : $t('nc.form.responsibleUserOrgHint')
                                "
                                test-id="nc-responsible-user-select"
                            />
                        </div>
                    </div>
                    <!-- Problem Statement -->
                    <div id="problem-statement" class="mb-4" test-id="nc-problem-statement-field">
                        <AppTextareaForm
                            :value="problemStatement"
                            name="problemStatement"
                            :label="$t('nc.form.problemStatement')"
                            rows="4"
                            :placeholder="$t('nc.form.problemStatementPlaceholder')"
                            :rules="(v: any) => (!v ? $t('nc.form.problemStatementRequired') : true)"
                            :disabled="isCreatedFromPi"
                            required
                            test-id="nc-problem-statement-textarea"
                        />
                    </div>
                    <!-- Objective Evidence -->
                    <div id="objective-evidence" class="mb-4" test-id="nc-objective-evidence-field">
                        <AppTextareaForm
                            :value="objectiveEvidence"
                            name="objectiveEvidence"
                            :label="$t('nc.form.objectiveEvidence')"
                            rows="3"
                            :placeholder="$t('nc.form.objectiveEvidencePlaceholder')"
                            test-id="nc-objective-evidence-textarea"
                        />
                    </div>
                    <!-- Requirements -->
                    <div id="requirements" class="mb-4" test-id="nc-requirements-field">
                        <AppTextareaForm
                            :value="requirements"
                            name="requirements"
                            :label="$t('nc.form.requirements')"
                            rows="3"
                            :placeholder="$t('nc.form.requirementsPlaceholder')"
                            test-id="nc-requirements-textarea"
                        />
                    </div>
                    <!-- Evidence Upload -->

                    <!-- Custom Fields Section -->
                    <div
                        id="custom-fields"
                        class="border-b border-neutral-200 pb-8"
                        v-if="customFields.length > 0"
                        test-id="nc-custom-fields-section"
                    >
                        <div class="space-y-2">
                            <div
                                v-for="field in customFields"
                                :key="field.id"
                                class="grid grid-cols-1 md:grid-cols-2 gap-4 "
                                :test-id="`nc-custom-field-${field.id}`"
                            >
                                <div>
                                    <div v-if="field.fieldType === CustomFieldType.TEXT">
                                        <label class="block text-sm text-neutral-700 mb-2">
                                            {{ field.label }}
                                            <span v-if="field.isRequired" class="text-red-700"
                                                >*</span
                                            >
                                        </label>
                                        <AppInput
                                            v-model="customFieldValues[field.id]"
                                            :placeholder="$t('nc.form.customFieldEnterPlaceholder', { label: field.label })"
                                            :hide-icon="true"
                                            :required="field.isRequired"
                                            :class="showValidationErrors && field.isRequired && (!customFieldValues[field.id] || customFieldValues[field.id].toString().trim() === '') ? 'ring-1 ring-red-500' : ''"
                                        />
                                        <div v-if="showValidationErrors && field.isRequired && (!customFieldValues[field.id] || customFieldValues[field.id].toString().trim() === '')" class="text-red-600 text-xs mt-1">
                                            <p>{{ $t('nc.form.customFieldRequired', { label: field.label }) }}</p>
                                        </div>
                                    </div>
                                    <div v-else-if="field.fieldType === CustomFieldType.NUMBER">
                                        <label class="block text-sm text-neutral-700 mb-2">
                                            {{ field.label }}
                                            <span v-if="field.isRequired" class="text-red-700"
                                                >*</span
                                            >
                                        </label>
                                        <AppInput
                                            v-model="customFieldValues[field.id]"
                                            type="number"
                                            :hide-icon="true"
                                            :placeholder="$t('nc.form.customFieldEnterPlaceholder', { label: field.label })"
                                            :required="field.isRequired"
                                            :class="showValidationErrors && field.isRequired && (!customFieldValues[field.id] || customFieldValues[field.id].toString().trim() === '') ? 'ring-1 ring-red-500' : ''"
                                        />
                                        <div v-if="showValidationErrors && field.isRequired && (!customFieldValues[field.id] || customFieldValues[field.id].toString().trim() === '')" class="text-red-600 text-xs mt-1">
                                            <p>{{ $t('nc.form.customFieldRequired', { label: field.label }) }}</p>
                                        </div>
                                    </div>
                                    <div v-else-if="field.fieldType === CustomFieldType.DATE">
                                        <label class="block text-sm text-neutral-700 mb-2">
                                            {{ field.label }}
                                            <span v-if="field.isRequired" class="text-red-700"
                                                >*</span
                                            >
                                        </label>
                                        <AppInput
                                            v-model="customFieldValues[field.id]"
                                            type="date"
                                            :hide-icon="true"
                                            :placeholder="$t('nc.form.customFieldSelectPlaceholder', { label: field.label })"
                                            :required="field.isRequired"
                                            :class="showValidationErrors && field.isRequired && (!customFieldValues[field.id] || customFieldValues[field.id].toString().trim() === '') ? 'ring-1 ring-red-500' : ''"
                                        />
                                        <div v-if="showValidationErrors && field.isRequired && (!customFieldValues[field.id] || customFieldValues[field.id].toString().trim() === '')" class="text-red-600 text-xs mt-1">
                                            <p>{{ $t('nc.form.customFieldRequired', { label: field.label }) }}</p>
                                        </div>
                                    </div>
                                    <div v-else-if="field.fieldType === CustomFieldType.DROPDOWN" :test-id="`nc-custom-dropdown-${field.id}`">
                                        <label class="block text-sm text-neutral-700 mb-2">
                                            {{ field.label }}
                                            <span v-if="field.isRequired" class="text-red-700"
                                                >*</span
                                            >
                                        </label>
                                        <Select2
                                            v-model="customFieldValues[field.id]"
                                            :values="field.options"
                                            :display="(val: string) => val"
                                            :placeholder="$t('nc.form.customFieldSelectPlaceholder', { label: field.label })"
                                            :class="showValidationErrors && field.isRequired && (!customFieldValues[field.id] || customFieldValues[field.id].toString().trim() === '') ? 'ring-1 ring-red-500 rounded-md' : ''"
                                            :test-id="`nc-custom-dropdown-select-${field.id}`"
                                        />
                                        <div v-if="showValidationErrors && field.isRequired && (!customFieldValues[field.id] || customFieldValues[field.id].toString().trim() === '')" class="text-red-600 text-xs mt-1">
                                            <p>{{ $t('nc.form.customFieldRequired', { label: field.label }) }}</p>
                                        </div>
                                    </div>
                                    <div
                                        v-else-if="field.fieldType === CustomFieldType.MULTI_SELECT"
                                    >
                                        <label class="block text-sm text-neutral-700 mb-2">
                                            {{ field.label }}
                                            <span v-if="field.isRequired" class="text-red-700"
                                                >*</span
                                            >
                                        </label>
                                        <MultiSelect
                                            v-model="customFieldValues[field.id]"
                                            :results="field.options"
                                            :display="(val: string) => val"
                                            :placeholder="$t('nc.form.customFieldSelectPlaceholder', { label: field.label })"
                                            :class="showValidationErrors && field.isRequired && (!Array.isArray(customFieldValues[field.id]) || customFieldValues[field.id].length === 0) ? 'ring-1 ring-red-500 rounded-md' : ''"
                                        />
                                        <div v-if="showValidationErrors && field.isRequired && (!Array.isArray(customFieldValues[field.id]) || customFieldValues[field.id].length === 0)" class="text-red-600 text-xs mt-1">
                                            <p>{{ $t('nc.form.customFieldRequired', { label: field.label }) }}</p>
                                        </div>
                                    </div>
                                    <div
                                        v-else-if="field.fieldType === CustomFieldType.FILE_UPLOAD"
                                    >
                                        <label class="block text-sm text-neutral-700 mb-2">
                                            {{ field.label }}
                                            <span v-if="field.isRequired" class="text-red-700"
                                                >*</span
                                            >
                                        </label>
                                        <FileUploader
                                            v-model="customFieldValuesFiles[field.id]"
                                            :current-file="
                                                getFileNameFromUrl(customFieldValues[field.id]) ??
                                                undefined
                                            "
                                            :download-url="customFieldValues[field.id]"
                                            :accept="
                                                field.acceptedFiles?.join(',') ||
                                                '.pdf,.doc,.docx,.jpg,.jpeg,.png'
                                            "
                                            :input-id="`custom-field-file-${field.id}`"
                                            :class="showValidationErrors && field.isRequired && (!customFieldValuesFiles[field.id] && (!customFieldValues[field.id] || customFieldValues[field.id].toString().trim() === '')) ? 'ring-1 ring-red-500 rounded-md' : ''"
                                        />
                                        <div v-if="showValidationErrors && field.isRequired && (!customFieldValuesFiles[field.id] && (!customFieldValues[field.id] || customFieldValues[field.id].toString().trim() === ''))" class="text-red-600 text-xs mt-1">
                                            <p>{{ $t('nc.form.customFieldRequired', { label: field.label }) }}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div id="evidence-upload" class="my-4" test-id="nc-evidence-upload-section">
                        <label for="evidence-upload" class="block text-sm text-neutral-700 mb-2"
                            >{{ $t('nc.form.evidenceFiles') }}</label
                        >
                        <input
                            id="nc-evidence-file-input"
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            test-id="nc-evidence-uploader"
                            class="block w-full text-sm text-neutral-700"
                            @change="onEvidenceFiles"
                        />
                    </div>
                    <!-- Investigation Requirement -->
                    <div id="investigation-requirement" class="my-4 border-t border-neutral-200 pt-4" test-id="nc-investigation-required-field">
                        <label class="block text-sm font-medium text-neutral-700 mb-3"
                            >{{ $t('nc.form.investigationRequired') }}</label
                        >
                        <div class="flex items-center space-x-8">
                            <div class="flex items-center space-x-3">
                                <input
                                    type="radio"
                                    :id="`needs-investigation-yes-${isEdit ? id : 'new'}`"
                                    :name="`needs-investigation-${isEdit ? id : 'new'}`"
                                    v-model="needsInvestigation"
                                    :value="true"
                                    class="w-4 h-4 text-neutral-600 border-neutral-300 focus:ring-neutral-500"
                                    test-id="nc-investigation-yes-radio"
                                />
                                <label
                                    :for="`needs-investigation-yes-${isEdit ? id : 'new'}`"
                                    class="text-sm text-neutral-900 cursor-pointer"
                                >
                                    {{ $t('nc.form.yes') }}
                                </label>
                            </div>
                            <div class="flex items-center space-x-3">
                                <input
                                    type="radio"
                                    :id="`needs-investigation-no-${isEdit ? id : 'new'}`"
                                    :name="`needs-investigation-${isEdit ? id : 'new'}`"
                                    v-model="needsInvestigation"
                                    :value="false"
                                    class="w-4 h-4 text-neutral-600 border-neutral-300 focus:ring-neutral-500"
                                    test-id="nc-investigation-no-radio"
                                />
                                <label
                                    :for="`needs-investigation-no-${isEdit ? id : 'new'}`"
                                    class="text-sm text-neutral-900 cursor-pointer"
                                >
                                    {{ $t('nc.form.no') }}
                                </label>
                            </div>
                        </div>
                        <p v-if="needsInvestigation === true" class="text-xs text-neutral-500 mt-2">
                            {{ $t('nc.form.investigationNote') }}
                        </p>
                    </div>
                </div>
                <div class="p-6 flex justify-end gap-3 border-t border-neutral-200">
                    <Can :subjects="['non_conformities']" :actions="['create', 'update']">
                        <AppButton
                            type="button"
                            button-style="secondary"
                            @click="onCancel"
                            test-id="nc-cancel-button"
                        >
                            {{ $t('nc.form.cancel') }}
                        </AppButton>
                        <AppButton type="submit" button-style="primary" :loading="loading" test-id="nc-save-button">
                            {{ isEdit ? $t('nc.form.updateNC') : $t('nc.form.createNC') }}
                        </AppButton>
                    </Can>
                </div>
            </Form>

            <div v-else class="flex justify-center items-center h-full">
                <Spinner width="5" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { Form } from 'vee-validate'
import BreadCrums from '../breadCrums.vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { apiGet, apiPost, apiPut } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import type {
    OrganizationUnit,
    NonConformityResponseDTO,
    NonConformityType,
    NonConformityRiskLevel,
    User
} from '@/util/interfaces'
import { CustomFieldType } from '@/util/interfaces'
import Select2 from '../Select2.vue'
import AppInputForm from '../AppInputForm.vue'
import AppTextareaForm from '../AppTextareaForm.vue'
import AppButton from '../AppButton.vue'
import {
    formatDateToInput,
    getFileNameFromUrl,
    formatApiErrorMessage,
    formatNcProblemStatement,
    isNcCreatedFromPi,
    isNonConformityOverdue
} from '@/util/util'
import Spinner from '../Spinner.vue'
import { parse, startOfDay, isBefore } from 'date-fns'
import Can from '../Can.vue'
import FileUploader from '../FileUploader.vue'
import MultiSelect from '../MultiSelect.vue'
import AppInput from '../AppInput.vue'
import { useAuditFindingStore } from '@/stores/auditFindingStore'
import { NON_CONFORMITY_ERROR_I18N_PREFIX } from './endpoints'
import { resolveSelectedTeam } from '@/util/teams-feature'

type SiteSummary = {
    id: string
    name: string
    code?: string | null
    status?: string
}

const getSiteOptions = async (
    _authStore?: unknown,
    _filters?: { organizationUnitId?: number | null }
): Promise<SiteSummary[]> => []
const loading = ref(false)

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToast()
const { t } = useI18n()
const auditFindingStore = useAuditFindingStore()

const id = route.params.id as string
const isEdit = !!id
const loadingEntity = ref(!!id)

const filters = ref({
    ncRepresentative: null as any,
    riskLevel: null as NonConformityRiskLevel | null,
    ncType: null as NonConformityType | null,
    orgUnit: null as OrganizationUnit | null,
    category: null as any | null,
    responsibleUser: null as User | null,
    site: null as SiteSummary | null
})
const responsibleUsers = ref<User[]>([])
const reportedDate = ref<string>()
const dueDate = ref<string>()
const ncRepresentatives = ref<any[]>([])
const riskLevels = ref<NonConformityRiskLevel[]>([])
const ncTypes = ref<NonConformityType[]>([])
const orgUnits = ref<OrganizationUnit[]>([])
const sites = ref<SiteSummary[]>([])
const sitesModuleEnabled = computed(() =>
    authStore.hasPermissions({ subject: 'sites', actions: ['read'] })
)

const categories = ref<any[]>([])
const customFields = ref<any[]>([])
const customFieldValues = ref<Record<string, any>>({})
const customFieldValuesFiles = ref<Record<string, any>>({})

const evidenceFiles = ref<File[]>([])
const problemStatement = ref<string>()
/** Original keyed payload for PI-triggered NCs — submit this, never the translated display text */
const rawProblemStatement = ref<string | null>(null)
const isCreatedFromPi = ref(false)
const objectiveEvidence = ref<string>()
const requirements = ref<string>()
const removedFiles = ref<string[]>([])
const oldFiles = ref<string[]>([])
const showValidationErrors = ref(false)
const needsInvestigation = ref<boolean>(false)

const nonConformity = ref<NonConformityResponseDTO>()

const fromView = route.query.fromView === 'true'
const crumbs = computed(() => {
    const baseCrumbs = [
        {
            name: t('nc.breadcrumbs.nonConformities'),
            path: '/act/non-conformities',
            icon: 'fa-solid fa-exclamation-triangle'
        }
    ]

    if (isEdit && fromView) {
        baseCrumbs.push({
            name: t('nc.breadcrumbs.viewNonConformity'),
            path: `/act/non-conformities/${id}`,
            icon: 'fa-solid fa-eye'
        })
        baseCrumbs.push({
            name: t('nc.breadcrumbs.editNonConformity'),
            path: `/act/non-conformities/${id}/edit`,
            icon: 'fa-solid fa-edit'
        })
    } else {
        baseCrumbs.push({
            name: isEdit ? t('nc.breadcrumbs.editNonConformity') : t('nc.breadcrumbs.addNonConformity'),
            path: '/act/non-conformities/add',
            icon: 'fa-solid fa-plus'
        })
    }

    return baseCrumbs
})

const displayResponsibleUser = (u: User | null) =>
    u ? `${u.fname || ''} ${u.lname || ''}`.trim() || u.email || '' : ''

const displaySite = (site: SiteSummary | null) => {
    if (!site) return ''
    const label = site.name || site.code || site.id
    return site.code ? `${label} (${site.code})` : label
}

const loadSitesForOrgUnit = async (orgUnitId: number | null | undefined) => {
    if (!sitesModuleEnabled.value || orgUnitId == null) {
        sites.value = []
        return
    }
    try {
        sites.value = (await getSiteOptions(authStore, {
            organizationUnitId: orgUnitId,
        })) || []
    } catch (error) {
        console.error('Error fetching sites for organization unit:', error)
        sites.value = []
    }
}

const loadResponsibleUsersForOrgUnit = async (orgUnitId: number | null | undefined) => {
    if (orgUnitId == null) {
        responsibleUsers.value = []
        return
    }
    try {
        const users = await apiPost<User[]>(
            '/permissions/teams/access',
            {
                allTeamIds: false,
                teamIds: [orgUnitId],
                subject: 'non_conformities'
            },
            authStore
        )
        responsibleUsers.value = users || []
    } catch (error) {
        console.error('Error fetching users for organization unit:', error)
        responsibleUsers.value = []
    }
}

const loadNcRepresentativesForOrgUnit = async (orgUnitId: number | null | undefined) => {
    if (orgUnitId == null) {
        ncRepresentatives.value = []
        return
    }
    try {
        const list = await apiGet<any[]>(
            `/non-conformities/representatives?teamId=${encodeURIComponent(String(orgUnitId))}`,
            authStore
        )
        ncRepresentatives.value = list || []
    } catch (error) {
        console.error('Error fetching NC representatives for organization unit:', error)
        ncRepresentatives.value = []
    }
}

const fetchFilters = async () => {
    try {
        orgUnits.value = await apiPost<OrganizationUnit[]>(
            'permissions/teams/user',
            {
                subject: 'non_conformities'
            },
            authStore
        )

        ncRepresentatives.value = []

        // Fetch other filters (representatives load when an organization unit is selected)
        ;[riskLevels.value, ncTypes.value, categories.value] = await Promise.all([
            apiGet<NonConformityRiskLevel[]>('/non-conformities/risk-levels', authStore),
            apiGet<NonConformityType[]>('/non-conformities/types', authStore),
            apiGet<any[]>('/non-conformities/categories', authStore)
        ])
        if (!isEdit) {
            const preferred =
                filters.value.orgUnit &&
                orgUnits.value.some((team) => team.id === filters.value.orgUnit?.id)
                    ? filters.value.orgUnit
                    : null
            filters.value.orgUnit = resolveSelectedTeam(orgUnits.value, preferred)
        }
    } catch (error: unknown) {
        console.error('Error fetching filters:', error)
        toast.showToast(t('common.error'), t('nc.form.loadFormError'), 'error')
    }
}

const fetchNonConformity = async () => {
    if (!isEdit) return

    try {
        const response = await apiGet<NonConformityResponseDTO>(
            `/non-conformities/${route.params.id}`,
            authStore
        )
        if (response) {
            if (isNonConformityOverdue(response)) {
                toast.showToast(
                    t('common.error'),
                    t('nc.detail.overdueLocked'),
                    'error'
                )
                router.push(`/act/non-conformities/${route.params.id}`)
                return
            }
            nonConformity.value = response
            const teamId = teamIdOf(response)
            await Promise.all([
                loadResponsibleUsersForOrgUnit(teamId),
                loadNcRepresentativesForOrgUnit(teamId),
                loadSitesForOrgUnit(teamId)
            ])
            populateFormData(response)
        } else {
            throw new Error('Failed to load non-conformity')
        }
    } catch (error: any) {
        console.error('Error fetching non-conformity:', error)
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.form.loadError'),
            'error'
        )
        router.push('/act/non-conformities')
    } finally {
        loadingEntity.value = false
    }
}

const populateFormData = (data: NonConformityResponseDTO) => {
    filters.value.orgUnit =
        orgUnits.value.find(
            (orgUnit: OrganizationUnit) => orgUnit.id === teamIdOf(data)
        ) || null
    filters.value.site =
        (data.siteId &&
            sites.value.find((site) => site.id === data.siteId)) ||
        (data.site
            ? {
                  id: data.site.id,
                  name: data.site.name,
                  code: data.site.code,
                  status: data.site.status as any
              }
            : null)
    const internalId = (data as any).internalRepresentativeId as string | undefined
    const repId = data.representativeId
    filters.value.ncRepresentative =
        (internalId &&
            ncRepresentatives.value.find(
                (representative: any) => representative.id === internalId
            )) ||
        (repId &&
            ncRepresentatives.value.find(
                (representative: any) => representative.id === repId
            )) ||
        null
    filters.value.riskLevel =
        riskLevels.value.find(
            (riskLevel: NonConformityRiskLevel) => riskLevel.id === data.nonConformityRiskLevelId
        ) || null
    filters.value.ncType =
        ncTypes.value.find((ncType: NonConformityType) => ncType.id === data.nonConformityTypeId) ||
        null

    filters.value.category =
        categories.value.find((category: any) => category.id === data.categoryId) || null

    filters.value.responsibleUser =
        (data.responsibleUser &&
            responsibleUsers.value.find((u) => u.id === data.responsibleUser!.id)) ||
        null

    reportedDate.value = formatDateToInput(data.dateReported)
    dueDate.value = formatDateToInput(data.dueDate)

    isCreatedFromPi.value = isNcCreatedFromPi(data)
    if (isCreatedFromPi.value) {
        rawProblemStatement.value = data.problemStatement || null
        problemStatement.value = formatNcProblemStatement(data, t)
    } else {
        rawProblemStatement.value = null
        problemStatement.value = data.problemStatement
    }
    objectiveEvidence.value = data.objectiveEvidence
    requirements.value = data.requirements

    oldFiles.value = data.evidenceFiles ? data.evidenceFiles.map((file: string) => file) : []
    needsInvestigation.value = (data as any).needsInvestigation !== undefined 
        ? Boolean((data as any).needsInvestigation) 
        : false
}

const onInvalidSubmit = () => {
    showValidationErrors.value = true
}

const handleSubmit = async (values: any) => {
    showValidationErrors.value = true

    const requiredFilters = [
        { value: filters.value.orgUnit, name: 'Organization unit' },
        { value: filters.value.riskLevel, name: 'Risk level' },
        { value: filters.value.ncType, name: 'NCR type' },
        { value: filters.value.category, name: 'Category' }
    ]

    for (const filter of requiredFilters) {
        if (!filter.value) {
            // toast.showToast(t('common.error'), `${filter.name} is required`, 'error')
            return
        }
    }

    // Validate required custom fields
    const requiredCustomFields = customFields.value.filter((field: any) => field.isRequired)
    const missingRequiredFields: string[] = []

    for (const field of requiredCustomFields) {
        const value = customFieldValues.value[field.id]
        let isValid = false

        switch (field.fieldType) {
            case CustomFieldType.TEXT:
            case CustomFieldType.NUMBER:
            case CustomFieldType.DATE:
                isValid = value && value.toString().trim() !== ''
                break
            case CustomFieldType.DROPDOWN:
                isValid = value && value.toString().trim() !== ''
                break
            case CustomFieldType.MULTI_SELECT:
                isValid = Array.isArray(value) && value.length > 0
                break
            case CustomFieldType.FILE_UPLOAD: {
                // For file upload, check if there's either a file uploaded or an existing file URL
                const hasFile = customFieldValuesFiles.value[field.id] || (value && value.trim() !== '')
                isValid = hasFile
                break
            }
            default:
                isValid = value && value.toString().trim() !== ''
        }

        if (!isValid) {
            missingRequiredFields.push(field.label)
        }
    }

    if (missingRequiredFields.length > 0) {
        return
    }

    const reportedDateParsed = parse(values.reportedDate || '', 'yyyy-MM-dd', new Date())
    const dueDateParsed = parse(values.dueDate || '', 'yyyy-MM-dd', new Date())
    const today = startOfDay(new Date())

    // if (isBefore(reportedDateParsed, today)) {
    //     toast.showToast(t('common.validationError'), 'Reported date cannot be before today', 'error')
    //     return
    // }

    if (isBefore(dueDateParsed, today)) {
        toast.showToast(t('common.validationError'), t('nc.form.dueDatePast'), 'error')
        return
    }

    if (dueDateParsed < reportedDateParsed) {
        toast.showToast(t('common.validationError'), t('nc.form.dueDateBeforeReported'), 'error')
        return
    }

    const textFields = [
        { value: values.problemStatement, labelKey: 'nc.form.problemStatement' },
        { value: values.objectiveEvidence, labelKey: 'nc.form.objectiveEvidence' },
        { value: values.requirements, labelKey: 'nc.form.requirements' }
    ]

    for (const field of textFields) {
        if (field.value && !field.value?.trim()) {
            toast.showToast(
                t('common.validationError'),
                t('nc.form.validTextField', { field: t(field.labelKey) }),
                'error'
            )
            return
        }
    }

    const formData = buildFormData(values)

    try {
        loading.value = true
        if (isEdit) {
            await apiPut<void>(`/non-conformities/${route.params.id}`, formData, authStore)
        } else {
            const created: any = await apiPost<any>('/non-conformities', formData, authStore)
            // Try to extract ID from API response
            const createdId: string | undefined = created?.id || created?.data?.id
            const createdName: string | undefined = created?.name || created?.data?.name
            const draftKeyParam = route.query.draftKey as string | undefined
            if (createdId && draftKeyParam) {
                auditFindingStore.setLinkedNonConformityId(
                    draftKeyParam,
                    createdId,
                    createdName
                )
            }

            toast.showToast(t('common.success'), t('nc.form.saveSuccess'), 'success')
            const redirect = route.query.redirect as string | undefined
            if (redirect) {
                // Preserve draftKey + new NC on return so finding form can bind even if store race
                const redirectUrl = new URL(redirect, window.location.origin)
                if (draftKeyParam) redirectUrl.searchParams.set('draftKey', draftKeyParam)
                if (createdId) {
                    redirectUrl.searchParams.set('linkedNcId', createdId)
                    if (createdName) redirectUrl.searchParams.set('linkedNcName', createdName)
                }
                router.push(redirectUrl.pathname + redirectUrl.search)
            } else {
                router.push('/act/non-conformities')
            }
            return
        }

        toast.showToast(t('common.success'), t('nc.form.saveSuccess'), 'success')
        const redirect = route.query.redirect as string | undefined
        if (redirect) {
            router.push(redirect)
        } else {
            router.push('/act/non-conformities')
        }
    } catch (error: any) {
        console.error('Error saving non-conformity:', error)
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.form.saveError'),
            'error'
        )
    } finally {
        loading.value = false
    }
}

// Helper function to check if a custom field value is empty
const isCustomFieldValueEmpty = (value: any): boolean => {
    if (value === null || value === undefined) {
        return true
    }
    if (typeof value === 'string') {
        return value.trim() === ''
    }
    if (Array.isArray(value)) {
        return value.length === 0
    }
    if (typeof value === 'object') {
        return Object.keys(value).length === 0
    }
    return false
}

const buildFormData = (values: any): FormData => {
    const formData = new FormData()

    formData.append('teamId', filters.value.orgUnit?.id?.toString() || '')
    if (sitesModuleEnabled.value) {
        formData.append('siteId', filters.value.site?.id ?? '')
    }
    if (filters.value.ncRepresentative?.id) {
        formData.append('representativeId', filters.value.ncRepresentative.id)
        formData.append(
            'representativeType',
            filters.value.ncRepresentative.isExternal ? 'EXTERNAL' : 'INTERNAL'
        )
    } else {
        formData.append('representativeId', '')
        formData.append('representativeType', '')
    }
    if (isEdit) {
        formData.append('responsibleUserId', filters.value.responsibleUser?.id ?? '')
    } else if (filters.value.responsibleUser?.id) {
        formData.append('responsibleUserId', filters.value.responsibleUser.id)
    }
    formData.append('nonConformityRiskLevelId', filters.value.riskLevel?.id || '')
    formData.append('nonConformityTypeId', filters.value.ncType?.id || '')
    formData.append('categoryId', filters.value.category?.id || '')
    formData.append('dateReported', values.reportedDate)
    formData.append('dueDate', values.dueDate)
    formData.append(
        'problemStatement',
        isCreatedFromPi.value && rawProblemStatement.value
            ? rawProblemStatement.value
            : values.problemStatement
    )

    if (values.objectiveEvidence) {
        formData.append('objectiveEvidence', values.objectiveEvidence)
    }
    if (values.requirements) {
        formData.append('requirements', values.requirements)
    }
    
    const needsInvestigationValue = needsInvestigation.value === true ? 'true' : 'false'
    formData.append('needsInvestigation', needsInvestigationValue)

    if (!isEdit) {
        const auditInstanceId = route.query.auditInstanceId
        const findingId = route.query.findingId
        if (typeof auditInstanceId === 'string' && auditInstanceId) {
            formData.append('auditInstanceId', auditInstanceId)
        }
        if (typeof findingId === 'string' && findingId) {
            formData.append('findingId', findingId)
        }
    }

    const fieldValues = customFields.value
        .map((field) => {
            let id = undefined
            if (
                isEdit &&
                nonConformity.value &&
                Array.isArray(nonConformity.value.customFieldValues)
            ) {
                const existing = nonConformity.value.customFieldValues.find(
                    (v) => v.customField && v.customField.id === field.id
                )
                if (existing && existing.id) {
                    id = existing.id
                }
            }
            return {
                id,
                customFieldId: field.id,
                value: customFieldValues.value[field.id]
            }
        })
        .filter((item) => !isCustomFieldValueEmpty(item.value))

    formData.append('customFieldValues', JSON.stringify(fieldValues))

    evidenceFiles.value.forEach((file: File) => {
        formData.append('files', file)
    })

    const fileFieldUuids = Object.keys(customFieldValuesFiles.value)
    const fileFieldFiles = Object.values(customFieldValuesFiles.value)

    if (fileFieldFiles && fileFieldFiles.length > 0 && fileFieldFiles.some((f) => f)) {
        fileFieldUuids.forEach((uuid) => formData.append('uuids[]', uuid))
        fileFieldFiles.forEach((file) => formData.append('fieldFiles', file))
    }

    if (isEdit) {
        formData.append('id', id)
        removedFiles.value.forEach((file: any) => {
            formData.append('removedFiles[]', JSON.stringify(file))
        })
    }

    return formData
}

const handleRemovedFiles = (files: string[]) => {
    removedFiles.value = files
}

const teamIdOf = (data: {
    organizationUnitId?: number
    teamId?: number
    team?: { id?: number }
}) => data.teamId ?? data.team?.id ?? data.organizationUnitId ?? null

const onEvidenceFiles = (event: Event) => {
    const input = event.target as HTMLInputElement
    evidenceFiles.value = input.files ? Array.from(input.files) : []
}

const onCancel = () => {
    const redirect = route.query.redirect as string | undefined
    if (redirect) {
        router.push(redirect)
    } else {
        router.push('/act/non-conformities')
    }
}

onMounted(async () => {
    try {
        await fetchFilters()
        if (isEdit) {
            await fetchNonConformity()
        } else {
            // Prefill from audit finding Create & Link flow
            const fromFinding =
                (route.query.findingDescription as string | undefined) ||
                (route.query.problemStatement as string | undefined)
            if (fromFinding?.trim()) {
                problemStatement.value = fromFinding.trim()
            }
        }
    } catch (error) {
        console.error('Error during component initialization:', error)
        toast.showToast(t('common.error'), t('nc.form.initError'), 'error')
    }
})

watch(
    () => filters.value.orgUnit?.id,
    async (newId, oldId) => {
        await Promise.all([
            loadResponsibleUsersForOrgUnit(newId ?? null),
            loadNcRepresentativesForOrgUnit(newId ?? null),
            loadSitesForOrgUnit(newId ?? null)
        ])
        if (oldId !== undefined && newId !== oldId) {
            filters.value.responsibleUser = null
            filters.value.ncRepresentative = null
            filters.value.site = null
        }
    }
)

watch(
    () => filters.value.category,
    (newCategory) => {
        if (!newCategory || !newCategory.customFields) {
            customFields.value = []
            customFieldValues.value = {}
            customFieldValuesFiles.value = {}
            return
        }

        customFields.value = newCategory.customFields
        customFieldValues.value = {}
        customFieldValuesFiles.value = {}

        newCategory.customFields.forEach((field: any) => {
            const defaultValue = getDefaultValueForFieldType(field.fieldType)
            customFieldValues.value[field.id] = defaultValue

            if (field.fieldType === CustomFieldType.FILE_UPLOAD) {
                customFieldValuesFiles.value[field.id] = null
            }
        })

        if (isEdit && nonConformity.value?.customFieldValues) {
            populateExistingValues(newCategory.customFields, nonConformity.value.customFieldValues)
        }
    },
    { immediate: true }
)

// Reset validation errors when required fields change
watch(
    () => [filters.value.orgUnit, filters.value.ncRepresentative, filters.value.riskLevel, filters.value.ncType, filters.value.category, filters.value.responsibleUser, customFieldValues.value],
    () => {
        if (showValidationErrors.value) {
            showValidationErrors.value = false
        }
    },
    { deep: true }
)

const getDefaultValueForFieldType = (fieldType: string): string | string[] => {
    switch (fieldType) {
        case CustomFieldType.MULTI_SELECT:
            return []
        case CustomFieldType.FILE_UPLOAD:
            return ''
        default:
            return ''
    }
}

const populateExistingValues = (fields: any[], existingValues: any[]): void => {
    fields.forEach((field: any) => {
        const found = existingValues.find(
            (v: any) => v.customField && v.customField.id === field.id
        )

        if (found) {
            let val = found.value

            switch (field.fieldType) {
                case CustomFieldType.MULTI_SELECT:
                    val = parseMultiSelectValue(val)
                    break
                case CustomFieldType.DATE:
                    val = val.replace(/^"+|"+$/g, '')
                    break
            }

            customFieldValues.value[field.id] = val
        }
    })
}

const parseMultiSelectValue = (val: any): string[] => {
    if (typeof val === 'string') {
        if (val.trim().startsWith('[') || val.trim().startsWith('{')) {
            try {
                return JSON.parse(val)
            } catch (e) {
                return []
            }
        }
        return val.length > 0 ? [val] : []
    }
    return Array.isArray(val) ? val : []
}
</script>
