<template>
    <div class="bg-white rounded-lg shadow-lg w-full max-w-lg" test-id="add-contributors-modal">
        <div class="p-6 border-b border-neutral-200" test-id="add-contributors-header">
            <h2 class="text-lg">{{ t('document.view.add_contributors_title') }}</h2>
            <p class="mt-1 text-sm text-neutral-500">
                {{ t('document.view.add_contributors_description') }}
            </p>
        </div>

        <div class="p-6 space-y-4">
            <p v-if="loadingPeople" class="text-sm text-neutral-500">{{ t('common.loading') }}</p>
            <p
                v-else-if="!people.length"
                class="text-sm text-neutral-500"
                test-id="add-contributors-empty"
            >
                {{ t('document.view.add_contributors_empty') }}
            </p>
            <SearcheableMultiSelect
                v-else
                v-model="selected"
                :results="people"
                :placeholder="t('document.view.add_contributors_search')"
                :display="displayPerson"
            />
        </div>

        <div class="border-t border-neutral-200 px-6 py-4 flex justify-end gap-3">
            <AppButton buttonStyle="secondary" type="button" @click="onCancel" :disabled="saving">
                {{ t('common.cancel') }}
            </AppButton>
            <AppButton
                buttonStyle="primary"
                type="button"
                test-id="add-contributors-save"
                :loading="saving"
                :disabled="saving || !selected.length"
                @click="save"
            >
                {{ t('document.view.add_contributors_save') }}
            </AppButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '../AppButton.vue'
import SearcheableMultiSelect from '../SearcheableMultiSelect.vue'
import { apiPost } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { formatApiErrorMessage } from '@/util/util'
import type { User } from '@/util/interfaces'

const props = defineProps<{
    teamId: number
    excludeUserIds: string[]
    onConfirm: (userIds: string[]) => Promise<void>
    onCancel: () => void
}>()

const { t } = useI18n()
const authStore = useAuthStore()
const toast = useToast()
const loadingPeople = ref(true)
const saving = ref(false)
const people = ref<User[]>([])
const selected = ref<User[]>([])

const displayPerson = (person: User) => `${person.fname} ${person.lname}`

onMounted(async () => {
    try {
        const response = await apiPost<User[]>(
            '/permissions/teams/access',
            {
                teamIds: [props.teamId],
                subject: 'documents',
                combination: [{ subject: 'documents', action: 'update' }]
            },
            authStore
        )
        const excluded = new Set(props.excludeUserIds)
        people.value = (response ?? []).filter((person) => person?.id && !excluded.has(person.id))
    } catch (error: unknown) {
        const raw = formatApiErrorMessage(
            (error as { response?: { data?: unknown } })?.response?.data,
            t,
            'errors.document'
        )
        toast.showToast(
            t('common.error'),
            raw || t('document.view.add_contributors_load_failed'),
            'error'
        )
    } finally {
        loadingPeople.value = false
    }
})

async function save() {
    if (!selected.value.length || saving.value) return
    saving.value = true
    try {
        await props.onConfirm(selected.value.map((person) => person.id))
    } catch (error: unknown) {
        const raw = formatApiErrorMessage(
            (error as { response?: { data?: unknown } })?.response?.data,
            t,
            'errors.document'
        )
        toast.showToast(
            t('common.error'),
            raw || t('document.view.toast_contributors_failed'),
            'error'
        )
    } finally {
        saving.value = false
    }
}
</script>
