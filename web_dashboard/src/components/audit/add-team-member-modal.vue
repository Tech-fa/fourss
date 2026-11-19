<template>
    <div
        id="team-member-modal"
        class="bg-white rounded-lg shadow-lg w-full max-w-lg min-w-[400px] p-8 min-h-[500px]"
    >
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-lg font-semibold text-neutral-900">
                {{ isEditMode ? t('audit.team_member_modal.title_edit') : t('audit.team_member_modal.title_add') }}
            </h3>
            <AppButton buttonStyle="neutral" type="button" @click="props.onCancel">
                <i class="fa-solid fa-xmark text-neutral-900"></i>
            </AppButton>
        </div>

        <div class="mb-4" test-id="select-personnel-field">
            <label class=" text-sm font-medium text-neutral-700 mb-2 flex justify-between">
              <span>  
                {{ t('audit.team_member_modal.select_personnel') }} <span class="text-red-700">*</span>
                <span v-if="availablePersonnel.length > 0 && !isEditMode" class="text-xs text-neutral-500 ml-2">
                    {{ t('audit.team_member_modal.available_count', { n: availablePersonnel.length }) }}
                </span>
            </span>
            <button class="text-xs text-neutral-500" @click="openAddPersonnelModal">
                <i class="fa-solid fa-plus"></i> {{ t('audit.team_member_modal.add_personnel') }}
            </button>
            </label>
            <div :class="errors.personnel ? 'ring-1 ring-red-500 rounded-md' : ''">
                <Select2
                    v-model="selectedPersonnel"
                    :values="availablePersonnel"
                    :placeholder="t('audit.team_member_modal.personnel_placeholder')"
                    :display="
                        (personnel: AuditPersonnel) =>
                            `${personnel?.email} - ${personnel?.firstName} ${personnel?.lastName}${personnel?.isExternal ? ` (${t('audit.personnel.modal.external')})` : ''}`
                    "
                    :disabled="isEditMode"
                    test-id="team-member-personnel-select"
                />
            </div>
            <p v-if="errors.personnel" class="text-red-600 text-xs mt-1">
                {{ errors.personnel }}
            </p>
            <div v-if="availablePersonnel.length === 0 && !loading && !isEditMode && !errors.personnel" class="text-sm text-neutral-500 mt-2">
                {{ t('audit.team_member_modal.all_assigned') }}
            </div>
        </div>

        <div class="mb-6" test-id="select-role-field">
            <label class="block text-sm font-medium text-neutral-700 mb-2">{{ t('audit.team_member_modal.select_role') }} <span class="text-red-700">*</span></label>
            <div :class="errors.role ? 'ring-1 ring-red-500 rounded-md' : ''">
                <Select2
                    v-model="selectedRole"
                    :values="availableRoles"
                    :placeholder="t('audit.team_member_modal.role_placeholder')"
                    :display="(role: AuditRole) => role?.name"
                    test-id="team-member-role-select"
                />
            </div>
            <p v-if="errors.role" class="text-red-600 text-xs mt-1">
                {{ errors.role }}
            </p>
        </div>

        <div class="flex justify-end gap-3">
            <AppButton buttonStyle="secondary" @click="props.onCancel" type="button" test-id="team-member-cancel-button">
                {{ t('common.cancel') }}
            </AppButton>
            <AppButton
                type="button"
                buttonStyle="primary"
                :loading="submitting"
                @click="handleSaveMember"
                test-id="team-member-save-button"
            >
                {{ isEditMode ? t('audit.team_member_modal.submit_update') : t('audit.team_member_modal.submit_add') }}
            </AppButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '../AppButton.vue'
import Select2 from '../Select2.vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { useDialog } from '@/stores/dialog'
import { apiGet, apiPost } from '@/util/api'
import type { AuditPersonnel, AuditRole, AuditTeamMember } from '@/util/interfaces'
import AddPersonnelModal from './audit-personnel-modal.vue'

interface Props {
    onSave: (teamMember: AuditTeamMember) => void
    onCancel: () => void
    existingMembers?: AuditTeamMember[]
    editingMember?: AuditTeamMember // The member being edited
    dialogCommand: Function
    id?: string
}

const props = defineProps<Props>()
const authStore = useAuthStore()
const toast = useToast()
const dialog = useDialog()
const { t } = useI18n()

const isEditMode = computed(() => !!props.editingMember)

const selectedPersonnel = ref<AuditPersonnel>()
const selectedRole = ref<AuditRole>()
const availablePersonnel = ref<AuditPersonnel[]>([])
const availableRoles = ref<AuditRole[]>([])
const submitting = ref(false)
const loading = ref(false)

// Validation errors
const errors = ref({
    personnel: '',
    role: ''
})

// Watch selectedPersonnel to clear error when personnel is selected
watch(selectedPersonnel, (newVal) => {
    if (newVal && errors.value.personnel) {
        errors.value.personnel = ''
    }
})

// Watch selectedRole to clear error when role is selected
watch(selectedRole, (newVal) => {
    if (newVal && errors.value.role) {
        errors.value.role = ''
    }
})

onMounted(async () => {
    console.log(props.id)
    await Promise.all([fetchPersonnel(props.id), fetchRoles()])
    
    // Pre-populate fields if editing
    if (isEditMode.value && props.editingMember) {
        selectedPersonnel.value = props.editingMember.auditPersonnel
        // Find and set the selected role after roles are loaded
        const role = availableRoles.value.find(r => r.id === props.editingMember!.auditRole.id)
        if (role) {
            selectedRole.value = role
        }
    }
})

const openAddPersonnelModal = () => {
    dialog.openDialog(AddPersonnelModal, {
        isEditMode: false,
        initialValues: undefined,
        formName: t('audit.team_member_modal.form_name_personnel'),
        onSave: async (formData: any) => {
            try {
                // Create personnel then refresh list and preselect
                const { id: createdId } = await apiPost<{ id: string }>(
                    '/audits/personnels',
                    {
                        ...(formData.isExternal
                            ? {
                                  firstName: formData.firstName,
                                  lastName: formData.lastName,
                                  email: formData.email
                              }
                            : { userId: formData.userId }),
                        isExternal: !!formData.isExternal,
                        isActive: formData.isActive !== false
                    },
                    authStore
                )
                await fetchPersonnel(createdId)
                // Close the Add Personnel modal and reopen the Team Member modal
                dialog.closeDialog()
                props.dialogCommand(createdId)
            } catch (e) {
                console.error('Error creating personnel', e)
                toast.showToast(t('common.error'), t('audit.team_member_modal.toast_personnel_failed'), 'error')
            }
        },
        onCancel: () => {
            dialog.closeDialog()
            // Reopen the Team Member modal preserving state
            props.dialogCommand(selectedPersonnel.value?.id || '')
        }
    })
}

const fetchPersonnel = async (id?: string) => {
    try {
        loading.value = true
        // Fetch only active personnel
        const response = await apiGet<{ data: AuditPersonnel[] }>(
            '/audits/personnels?perPage=100&page=1&isActive=Active',
            authStore
        )
        
        if (isEditMode.value) {
            // In edit mode, include all active personnel (including the current one being edited if they're active)
            availablePersonnel.value = response.data
        } else {
            // In add mode, filter out personnel who are already assigned to the team
            const existingPersonnelIds = props.existingMembers?.map((m) => m.auditPersonnel.id) || []
            availablePersonnel.value = response.data.filter((p) => !existingPersonnelIds.includes(p.id))
        }
        if (id) {
            const personnel = availablePersonnel.value.find((p) => p.id === id)
            if (personnel) {
                selectedPersonnel.value = personnel
            }
        }
    } catch (error) {
        console.error('Error fetching personnel:', error)
        toast.showToast(t('common.error'), t('audit.team_member_modal.toast_load_personnel_failed'), 'error')
    } finally {
        loading.value = false
    }
}

const fetchRoles = async () => {
    try {
        const response = await apiGet<AuditRole[]>('/audits/roles', authStore)
        availableRoles.value = response || []
        
        // Pre-populate role if editing and roles are now loaded
        if (isEditMode.value && props.editingMember) {
            const role = availableRoles.value.find(r => r.id === props.editingMember!.auditRole.id)
            if (role) {
                selectedRole.value = role
            }
        }
    } catch (error) {
        console.error('Error fetching roles:', error)
        toast.showToast(t('common.error'), t('audit.team_member_modal.toast_load_roles_failed'), 'error')
    }
}

const handleSaveMember = async () => {
    // Reset errors
    errors.value = {
        personnel: '',
        role: ''
    }

    // Validate required fields
    let hasErrors = false

    if (!selectedPersonnel.value) {
        errors.value.personnel = 'Personnel is required'
        hasErrors = true
    }

    if (!selectedRole.value) {
        errors.value.role = t('audit.team_member_modal.error_role_required')
        hasErrors = true
    }

    if (hasErrors) {
        return
    }

    // Check if this person is already in the team (only for add mode)
    const existingMember = props.existingMembers?.find(
        member => member.auditPersonnel.id === selectedPersonnel.value!.id && member.auditPersonnel.id !== props.editingMember?.auditPersonnel.id
    )
    
    if (existingMember) {
        toast.showToast(t('common.error'), t('audit.team_member_modal.error_duplicate'), 'error')
        return
    }

    try {
        submitting.value = true

        // Create a team member object (we know these are not undefined due to validation above)
        const teamMember: AuditTeamMember = {
            id: isEditMode.value ? props.editingMember!.id : `temp_${Date.now()}`,
            auditPersonnel: selectedPersonnel.value!,
            auditRole: selectedRole.value!,
            assignedAt: isEditMode.value ? props.editingMember!.assignedAt : Date.now()
        }

        props.onSave(teamMember)
    } catch (error) {
        console.error('Error saving team member:', error)
    } finally {
        submitting.value = false
    }
}
</script>
