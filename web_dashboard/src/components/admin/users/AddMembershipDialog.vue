<template>
    <div class="bg-white rounded-lg p-6 w-full max-w-2xl overflow-y-auto min-h-96 max-h-[80vh] pb-4">
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-medium">
                {{
                    mode === 'modify'
                        ? t('admin_users.modify_membership_title')
                        : t('admin_users.add_membership_title')
                }}
            </h2>
            <button
                class="text-neutral-500 hover:text-neutral-700"
                type="button"
                @click="onCancel"
                test-id="add-membership-close"
            >
                <i class="fa-solid fa-xmark text-xl"></i>
            </button>
        </div>

        <div class="space-y-4">
            <div>
                <label class="block text-sm font-bold text-neutral-700 mb-2">
                    {{ t('admin_users.label_permission_group') }}
                    <span class="text-red-700">*</span>
                </label>
                <Select2
                    v-model="selectedGroup"
                    :values="availableGroupsForSelect"
                    :placeholder="t('admin_users.placeholder_permission_group')"
                    :display="(group: PermissionGroup) => group?.name"
                    test-id="add-membership-group"
                />
                <p v-if="showErrors && !selectedGroup" class="text-red-600 text-xs mt-1">
                    {{ t('admin_users.rule_permission_group_required') }}
                </p>
            </div>

            <div v-if="TEAMS_FEATURE_ENABLED && selectedGroup && selectedGroup.name !== 'Admin'">
                <label class="block text-sm font-bold text-neutral-700 mb-2">
                    {{ t('admin_users.label_team') }}
                    <span class="text-red-700">*</span>
                </label>
                <Select2
                    v-model="selectedTeam"
                    :values="availableTeams"
                    :placeholder="t('admin_users.placeholder_search_teams')"
                    :display="(team: OrganizationUnit) => team?.name"
                    test-id="add-membership-team"
                />
                <p v-if="showErrors && !selectedTeam" class="text-red-600 text-xs mt-1">
                    {{ t('admin_users.rule_team_required') }}
                </p>
                <p
                    v-if="availableTeams.length === 0"
                    class="text-neutral-500 text-xs mt-1"
                    test-id="add-membership-no-teams"
                >
                    {{ t('admin_users.no_available_teams') }}
                </p>
            </div>

            
        </div>

        <div class="flex justify-end space-x-4 mt-6">
            <AppButton button-style="secondary" @click="onCancel" test-id="add-membership-cancel">
                {{ t('common.cancel') }}
            </AppButton>
            <AppButton button-style="primary" @click="onAdd" test-id="add-membership-add">
                {{
                    mode === 'modify'
                        ? t('admin_users.btn_modify_group')
                        : t('admin_users.btn_add_membership')
                }}
            </AppButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { OrganizationUnit, PermissionGroup } from '@/util/interfaces'
import AppButton from '@/components/AppButton.vue'
import Select2 from '@/components/Select2.vue'
import Notice from '@/components/Notice.vue'
import { TEAMS_FEATURE_ENABLED, resolveSelectedTeam } from '@/util/teams-feature'

const { t } = useI18n()

const props = withDefaults(
    defineProps<{
        availableGroups: PermissionGroup[]
        availableTeams: OrganizationUnit[]
        /** Team IDs the user already belongs to (one group per team). */
        assignedTeamIds: number[]
        existingAdmin: boolean
        initialGroup?: PermissionGroup | null
        mode?: 'add' | 'modify'
        onSuccess: (payload: { group: PermissionGroup; team: OrganizationUnit | null }) => void
        onCancel: () => void
    }>(),
    {
        initialGroup: null,
        mode: 'add'
    }
)

const selectedGroup = ref<PermissionGroup | null>(props.initialGroup ?? null)
const selectedTeam = ref<OrganizationUnit | null>(null)
const showErrors = ref(false)

const availableGroupsForSelect = computed(() =>
    props.availableGroups.filter((group) => !(group.name === 'Admin' && props.existingAdmin))
)

const availableTeams = computed(() => {
    const taken = new Set(props.assignedTeamIds)
    return props.availableTeams.filter((team) => !taken.has(team.id))
})

watch(
    selectedGroup,
    (group) => {
        showErrors.value = false
        if (!group || group.name === 'Admin') {
            selectedTeam.value = null
            return
        }
        selectedTeam.value = resolveSelectedTeam(
            TEAMS_FEATURE_ENABLED ? availableTeams.value : props.availableTeams
        )
    },
    { immediate: true }
)

const onAdd = () => {
    showErrors.value = true
    if (!selectedGroup.value) return
    if (selectedGroup.value.name !== 'Admin') {
        selectedTeam.value = resolveSelectedTeam(
            TEAMS_FEATURE_ENABLED ? availableTeams.value : props.availableTeams,
            selectedTeam.value
        )
        if (!selectedTeam.value) return
    }

    props.onSuccess({
        group: selectedGroup.value,
        team: selectedGroup.value.name === 'Admin' ? null : selectedTeam.value
    })
}
</script>
