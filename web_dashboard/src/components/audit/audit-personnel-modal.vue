<template>
    <div id="personnel-modal" class="bg-white rounded-lg shadow-lg w-full max-w-lg min-w-[350px] p-8 overflow-y-auto">
        <div class="flex justify-between items-center mb-2" test-id="personnel-modal-header">
            <h3 class="text-lg text-neutral-900" test-id="personnel-modal-title">{{ modalTitle }}</h3>
            <AppButton buttonStyle="neutral" type="button" @click="props.onCancel" test-id="personnel-modal-close-button">
                <i class="fa-solid fa-xmark text-neutral-900"></i>
            </AppButton>
        </div>
        <Form @submit="handleSubmit" test-id="audit-personnel-form">
            <div v-if="!props.hideActive" class="flex gap-6 mb-4">
                <label class="inline-flex items-center" test-id="external-checkbox">
                    <input
                        type="checkbox"
                        label="External"
                        v-model="isExternal"
                        class="rounded border-neutral-300"
                    />
                    <span class="ml-2 text-neutral-700 text-sm">{{ t('audit.personnel.modal.external') }}</span>
                </label>
                <label class="inline-flex items-center" test-id="active-checkbox">
                    <input
                        type="checkbox"
                        label="Active"
                        v-model="isActive"
                        class="rounded border-neutral-300"
                    />
                    <span class="ml-2 text-neutral-700 text-sm">{{ t('audit.personnel.modal.active') }}</span>
                </label>
            </div>

            <div v-if="showUserSelect" class="mb-4">
                <label class="block text-sm mb-1">
                    {{ t('audit.personnel.modal.user_label') }}
                    <span class="text-red-700">*</span>
                </label>
                <Select2
                    v-model="selectedUser"
                    :values="users"
                    :display="displayUser"
                    :placeholder="
                        loadingUsers
                            ? t('common.loading')
                            : t('audit.personnel.modal.user_placeholder')
                    "
                    test-id="personnel-user-select"
                />
                <p v-if="userError" class="text-red-600 text-xs mt-1" test-id="personnel-user-error">
                    {{ userError }}
                </p>
                <div
                    v-if="selectedUser"
                    class="mt-3 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700"
                    test-id="personnel-user-info"
                >
                    <p>
                        <span class="text-neutral-500">{{ t('profile.firstName') }}:</span>
                        {{ selectedUser.fname }}
                    </p>
                    <p>
                        <span class="text-neutral-500">{{ t('profile.lastName') }}:</span>
                        {{ selectedUser.lname }}
                    </p>
                    <p>
                        <span class="text-neutral-500">{{ t('audit.personnel.modal.email_label') }}:</span>
                        {{ selectedUser.email }}
                    </p>
                </div>
            </div>

            <template v-if="showManualIdentityFields">
                <div class="mb-4">
                    <AppInputForm
                        :label="t('profile.firstName')"
                        name="firstName"
                        type="text"
                        :value="props.initialValues?.firstName"
                        :placeholder="t('profile.firstNamePlaceholder')"
                        :rules="(v: any) => (!v ? t('audit.personnel.modal.first_name_required') : true)"
                        :required="true"
                        test-id="personnel-first-name-input"
                    />
                </div>
                <div class="mb-4">
                    <AppInputForm
                        :label="t('profile.lastName')"
                        name="lastName"
                        type="text"
                        :value="props.initialValues?.lastName"
                        :placeholder="t('profile.lastNamePlaceholder')"
                        :rules="(v: any) => (!v ? t('audit.personnel.modal.last_name_required') : true)"
                        :required="true"
                        test-id="personnel-last-name-input"
                    />
                </div>
                <div class="mb-4">
                    <AppInputForm
                        :label="t('audit.personnel.modal.email_label')"
                        name="email"
                        type="email"
                        :value="props.initialValues?.email"
                        :placeholder="t('profile.emailPlaceholder')"
                        :rules="(v: any) => {
                            if (!v) return t('audit.personnel.modal.email_required');
                            if (!isEmail(v)) return t('audit.personnel.modal.email_invalid');
                            return true;
                        }"
                        :required="true"
                        test-id="personnel-email-input"
                    />
                </div>
            </template>

            <div class="flex justify-end gap-3 mt-6">
                <AppButton buttonStyle="secondary" type="button" @click="props.onCancel" test-id="personnel-modal-cancel-button">
                    {{ t('common.cancel') }}
                </AppButton>
                <AppButton buttonStyle="primary" type="submit" test-id="personnel-modal-save-button">
                    {{ t('common.save') }}
                </AppButton>
            </div>
        </Form>
    </div>
</template>
<script setup lang="ts">
import { Form } from 'vee-validate'
import AppInputForm from '../AppInputForm.vue'
import AppButton from '../AppButton.vue'
import Select2 from '../Select2.vue'
import { ref, onMounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { isEmail } from '@/util/util'
import { apiGet } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import type { User } from '@/util/interfaces'

const { t } = useI18n()
const authStore = useAuthStore()

const props = defineProps<{
    isEditMode: boolean
    initialValues: any
    hideActive?: boolean
    /** When set (e.g. team member or NC flows), used in the title instead of default audit personnel copy */
    formName?: string
    onCancel: () => void
    onSave: (data: any) => void
}>()

const modalTitle = computed(() => {
    if (props.formName) {
        return props.isEditMode
            ? t('training.modal_form.title_edit', { type: props.formName })
            : t('training.modal_form.title_add', { type: props.formName })
    }
    return props.isEditMode ? t('audit.personnel.modal.title_edit') : t('audit.personnel.modal.title_add')
})

const isExternal = ref(false)
const isActive = ref(true)
const users = ref<User[]>([])
const selectedUser = ref<User | null>(null)
const loadingUsers = ref(false)
const userError = ref('')

const showUserSelect = computed(() => !props.hideActive && !isExternal.value)
const showManualIdentityFields = computed(() => props.hideActive || isExternal.value)

const displayUser = (val?: User | null) => {
    if (!val) return ''
    const name = `${val.fname || ''} ${val.lname || ''}`.trim()
    return name ? `${name} (${val.email || ''})` : val.email || ''
}

const fetchUsers = async () => {
    loadingUsers.value = true
    try {
        const response = await apiGet<User[]>('/users', authStore)
        users.value = (response || []).filter((user) => user.isActive !== false)
        const initialUserId =
            props.initialValues?.userId ||
            props.initialValues?.user?.id ||
            null
        if (initialUserId) {
            selectedUser.value =
                users.value.find((user) => String(user.id) === String(initialUserId)) || null
        }
    } catch (error) {
        console.error('Error fetching users for audit personnel:', error)
        users.value = []
    } finally {
        loadingUsers.value = false
    }
}

watch(selectedUser, () => {
    if (selectedUser.value) {
        userError.value = ''
    }
})

watch(isExternal, async (external) => {
    if (props.hideActive) {
        return
    }
    if (external) {
        selectedUser.value = null
        userError.value = ''
        return
    }
    if (users.value.length === 0) {
        await fetchUsers()
    }
})

onMounted(async () => {
    if (props.hideActive) {
        return
    }
    if (props.initialValues) {
        isExternal.value = !!props.initialValues.isExternal
        isActive.value =
            props.initialValues.isActive !== undefined
                ? !!props.initialValues.isActive
                : true
    }
    if (!isExternal.value) {
        await fetchUsers()
    }
})

const handleSubmit = async (values: any) => {
    if (props.hideActive) {
        props.onSave({
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email
        })
        return
    }

    if (!isExternal.value) {
        if (!selectedUser.value?.id) {
            userError.value = t('audit.personnel.modal.user_required')
            return
        }
        props.onSave({
            userId: selectedUser.value.id,
            isExternal: false,
            isActive: isActive.value
        })
        return
    }

    props.onSave({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        isExternal: true,
        isActive: isActive.value
    })
}
</script>
