<template>
    <div class="space-y-6">
        <!-- Basic Information -->
        <div id="basic-info" class="bg-white border border-neutral-200 rounded-lg p-6">
            <h3 class="text-lg text-neutral-900 mb-4">{{ $t('nc.details.basicInfo') }}</h3>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm text-neutral-600 mb-1">{{ $t('nc.details.title') }}</label>
                    <p class="text-neutral-900">{{ nonConformity?.name }}</p>
                </div>
                
                <div v-if="nonConformity.site || nonConformity.siteId">
                    <label class="block text-sm text-neutral-600 mb-1">{{ $t('nc.details.site') }}</label>
                    <p class="text-neutral-900">
                        <span v-if="nonConformity.site">
                            {{ nonConformity.site.name || nonConformity.site.code || nonConformity.site.id }}
                            <span v-if="nonConformity.site.code" class="text-neutral-500">
                                ({{ nonConformity.site.code }})
                            </span>
                        </span>
                        <span v-else>{{ $t('nc.details.notProvided') }}</span>
                    </p>
                </div>
                <div test-id="nc-audit-id">
                    <label class="block text-sm text-neutral-600 mb-1">{{ $t('nc.details.auditId') }}</label>
                    <p class="text-neutral-900">
                        <router-link
                            v-if="auditLink && nonConformity.auditId"
                            :to="auditLink"
                            class="text-primary-700 hover:underline"
                        >
                            {{ nonConformity.auditId }}
                        </router-link>
                        <span v-else>{{ nonConformity.auditId || $t('nc.details.notProvided') }}</span>
                    </p>
                </div>
                <div test-id="nc-finding">
                    <label class="block text-sm text-neutral-600 mb-1">{{ $t('nc.details.finding') }}</label>
                    <p class="text-neutral-900">
                        <router-link
                            v-if="findingLink"
                            :to="findingLink"
                            class="text-primary-700 hover:underline"
                        >
                            {{ findingLabel }}
                        </router-link>
                        <span v-else>{{ $t('nc.details.notProvided') }}</span>
                    </p>
                </div>
                <div>
                    <label class="block text-sm text-neutral-600 mb-1">{{ $t('nc.details.createdBy') }}</label>
                    <p class="text-neutral-900">
                        <span v-if="nonConformity?.createdBy">
                            {{
                                nonConformity?.createdBy?.fname +
                                ' ' +
                                nonConformity?.createdBy?.lname
                            }}
                        </span>
                        <span v-else> {{ $t('nc.details.notProvided') }} </span>
                    </p>
                </div>
                <div>
                    <label class="block text-sm text-neutral-600 mb-1">{{ $t('nc.details.representative') }}</label>
                    <p class="text-neutral-900">
                        <span v-if="nonConformity?.representative">
                            {{
                                nonConformity.representative.firstName +
                                ' ' +
                                nonConformity.representative.lastName
                            }}
                        </span>
                        <span v-else-if="nonConformity?.internalRepresentative">
                            {{
                                (nonConformity.internalRepresentative.fname || '') +
                                ' ' +
                                (nonConformity.internalRepresentative.lname || '')
                            }}
                        </span>
                        <span v-else>{{ $t('nc.details.notProvided') }}</span>
                    </p>
                </div>
                <div>
                    <label class="block text-sm text-neutral-600 mb-1">{{ $t('nc.details.responsibleUser') }}</label>
                    <p class="text-neutral-900">
                        <span v-if="nonConformity?.responsibleUser">
                            {{
                                nonConformity.responsibleUser.fname +
                                ' ' +
                                nonConformity.responsibleUser.lname
                            }}
                        </span>
                        <span v-else>{{ $t('nc.details.notProvided') }}</span>
                    </p>
                </div>
                <div>
                    <label class="block text-sm text-neutral-600 mb-1">{{ $t('nc.details.type') }}</label>
                    <p class="text-neutral-900">{{ nonConformity.nonConformityType.name }}</p>
                </div>
                <div>
                    <label class="block text-sm text-neutral-600 mb-1">{{ $t('nc.details.riskLevel') }}</label>
                    <p class="text-neutral-900">{{ nonConformity.nonConformityRiskLevel.name }}</p>
                </div>
                <div>
                    <label class="block text-sm text-neutral-600 mb-1">{{ $t('nc.details.status') }}</label>
                    <p
                        :class="displayStatus === 'OVERDUE' ? 'text-red-700' : 'text-neutral-900'"
                    >
                        {{ statusLabel }}
                    </p>
                </div>
                <div>
                    <label class="block text-sm text-neutral-600 mb-1">{{ $t('nc.details.dateReported') }}</label>
                    <p class="text-neutral-900">
                        {{ formatDateToDay(nonConformity.dateReported) }}
                    </p>
                </div>
                <div>
                    <label class="block text-sm text-neutral-600 mb-1">{{ $t('nc.details.dueDate') }}</label>
                    <p class="text-neutral-900">{{ formatDateToDay(nonConformity.dueDate) }}</p>
                </div>
            </div>
        </div>

        <!-- Problem Statement -->
        <div id="problem-statement" class="bg-white border border-neutral-200 rounded-lg p-6">
            <h3 class="text-lg text-neutral-900 mb-4">{{ $t('nc.details.problemStatement') }}</h3>
            <p class="text-neutral-700">
                {{ formatNcProblemStatement(nonConformity, $t) }}
            </p>
        </div>

        <!-- Objective Evidence -->
        <div id="objective-evidence" class="bg-white border border-neutral-200 rounded-lg p-6">
            <h3 class="text-lg text-neutral-900 mb-4">{{ $t('nc.details.objectiveEvidence') }}</h3>
            <p class="text-neutral-700 mb-4" v-if="nonConformity.objectiveEvidence">
                {{ nonConformity.objectiveEvidence }}
            </p>
            <p class="text-neutral-500 italic" v-else>{{ $t('nc.details.noObjectiveEvidence') }}</p>
            <div
                class="space-y-3"
                v-if="nonConformity.evidenceFiles && nonConformity.evidenceFiles.length > 0"
            >
                <FileUploader :files="nonConformity.evidenceFiles" :readonly="true" />
            </div>
            <p class="text-neutral-500 italic" v-else>{{ $t('nc.details.noEvidenceFiles') }}</p>
        </div>

        <!-- Requirements -->
        <div id="requirements" class="bg-white border border-neutral-200 rounded-lg p-6">
            <h3 class="text-lg text-neutral-900 mb-4">{{ $t('nc.details.requirements') }}</h3>
            <p class="text-neutral-700" v-if="nonConformity.requirements">
                {{ nonConformity.requirements }}
            </p>
            <p class="text-neutral-500 italic" v-else>{{ $t('nc.details.noRequirements') }}</p>
        </div>

        <!-- Due date amendment log -->
        <div
            id="due-date-amendments"
            class="bg-white border border-neutral-200 rounded-lg p-6"
            v-if="amendments.length"
            test-id="nc-due-date-amendment-log"
        >
            <h3 class="text-lg text-neutral-900 mb-4">{{ $t('nc.details.dueDateAmendments') }}</h3>
            <div class="overflow-x-auto">
                <table class="min-w-full text-sm">
                    <thead>
                        <tr class="text-left text-neutral-600 border-b border-neutral-200">
                            <th class="py-2 pr-4 font-medium">{{ $t('nc.details.amendmentAmendedAt') }}</th>
                            <th class="py-2 pr-4 font-medium">{{ $t('nc.details.amendmentPreviousDueDate') }}</th>
                            <th class="py-2 pr-4 font-medium">{{ $t('nc.details.amendmentNewDueDate') }}</th>
                            <th class="py-2 font-medium">{{ $t('nc.details.amendmentAmendedBy') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="amendment in amendments"
                            :key="amendment.id"
                            class="border-b border-neutral-100 last:border-0"
                        >
                            <td class="py-2 pr-4 text-neutral-900">{{ formatDateToDay(amendment.amendedAt) }}</td>
                            <td class="py-2 pr-4 text-neutral-900">{{ formatDateToDay(amendment.previousDueDate) }}</td>
                            <td class="py-2 pr-4 text-neutral-900">{{ formatDateToDay(amendment.newDueDate) }}</td>
                            <td class="py-2 text-neutral-900">
                                {{
                                    amendment.amendedBy
                                        ? `${amendment.amendedBy.fname || ''} ${amendment.amendedBy.lname || ''}`.trim()
                                        : $t('nc.details.notProvided')
                                }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Closing Comment -->
        <div id="closing-comment" class="bg-white border border-neutral-200 rounded-lg p-6" v-if="nonConformity.status === 'CLOSED' && nonConformity.closingComment">
            <h3 class="text-lg text-neutral-900 mb-4">{{ $t('nc.details.closingComment') }}</h3>
            <p class="text-neutral-700" v-if="nonConformity.closingComment">
                {{ nonConformity.closingComment }}
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { type NonConformityResponseDTO } from '@/util/interfaces'
import { formatDateToDay, formatNcProblemStatement, ncDisplayStatus } from '@/util/util'
import FileUploader from '../FileUploader.vue'

interface Props {
    nonConformity: NonConformityResponseDTO
}

const props = defineProps<Props>()
const { t } = useI18n()

const displayStatus = computed(() => ncDisplayStatus(props.nonConformity))
const statusLabel = computed(() => {
    const key = `nc.enum.ncStatus.${displayStatus.value.toLowerCase()}`
    return t(key)
})
const amendments = computed(() => props.nonConformity?.dueDateAmendments || [])

const auditProgramId = computed(
    () => props.nonConformity?.finding?.auditInstance?.auditProgramId || ''
)
const auditInstanceId = computed(() => props.nonConformity?.finding?.auditInstance?.id || '')

const auditLink = computed(() =>
    auditProgramId.value && auditInstanceId.value
        ? `/check/audits/${auditProgramId.value}/instances/${auditInstanceId.value}?tab=2`
        : ''
)

const findingLink = computed(() =>
    auditProgramId.value && auditInstanceId.value && props.nonConformity?.findingId
        ? `/check/audits/${auditProgramId.value}/${auditInstanceId.value}/general/${props.nonConformity.findingId}/edit`
        : ''
)

const findingLabel = computed(
    () => props.nonConformity?.finding?.title || props.nonConformity?.findingId || ''
)
</script>
