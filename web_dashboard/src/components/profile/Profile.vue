<template>
    <div id="root" class="min-h-screen bg-neutral-50">
        <BreadCrums
            :crumbs="[
                {
                    name: $t('profile.breadcrumb'),
                    path: '/profile',
                    icon: 'fa-solid fa-user'
                }
            ]"
        />

        <div
            class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex justify-center items-center"
            v-if="!profile?.fname"
        >
            <Spinner width="5" />
        </div>
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" v-else>
            <div class="bg-white shadow rounded-lg p-6">
                <div class="flex items-center space-x-4 mb-6">
                    <div
                        class="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center"
                    >
                        <i class="fa-solid fa-user text-3xl text-gray-500"></i>
                    </div>
                    <div>
                        <h1 class="text-2xl font-bold text-gray-900">
                            {{ profile?.fname }} {{ profile?.lname }}
                        </h1>
                    </div>
                </div>

                <Form @submit="updateProfile" class="space-y-6">
                    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <AppInputForm
                            name="fname"
                            :label="$t('profile.firstName')"
                            :placeholder="$t('profile.firstNamePlaceholder')"
                            :value="profile?.fname"
                            :required="true"
                        />
                        <AppInputForm
                            name="lname"
                            :label="$t('profile.lastName')"
                            :placeholder="$t('profile.lastNamePlaceholder')"
                            :value="profile?.lname"
                            :required="true"
                        />
                        <AppInputForm
                            name="email"
                            :label="$t('profile.email')"
                            :placeholder="$t('profile.emailPlaceholder')"
                            :value="profile?.email"
                            :disabled="true"
                            type="email"
                        />
                        <AppInputForm
                            name="phone"
                            :label="$t('profile.phone')"
                            :placeholder="$t('profile.phonePlaceholder')"
                            :value="profile?.phone"
                            :required="true"
                            type="tel"
                        />
                        
                    </div>

                    <div class="flex justify-end">
                        <AppButton buttonStyle="primary" type="submit" :loading="isSubmitting">
                            {{ $t('profile.saveChanges') }}
                        </AppButton>
                    </div>
                </Form>
            </div>
        </main>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Form } from 'vee-validate'
import { useAuthStore } from '@/stores/auth'
import BreadCrums from '@/components/breadCrums.vue'
import { apiGet, apiPut } from '@/util/api'
import AppInputForm from '@/components/AppInputForm.vue'
import AppButton from '@/components/AppButton.vue'
import { useToast } from '@/stores/notification'
import type { User } from '@/util/interfaces'
import Spinner from '../Spinner.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const authStore = useAuthStore()
const toast = useToast()
const isSubmitting = ref(false)
const isLoading = ref(false)
const profile = ref<User>()

const loadProfile = async () => {
    isLoading.value = true
    try {
        const response = await apiGet<User>(`/users/profile`, authStore)
        profile.value = response
    } catch (error: any) {
        toast.showToast(
            t('profile.loadError'),
            error?.response?.data?.message || t('profile.loadErrorMsg'),
            'error'
        )
    } finally {
        isLoading.value = false
    }
}

const updateProfile = async (values: any) => {
    isSubmitting.value = true
    try {
        await apiPut<User>(`/users`, { ...profile.value, ...values }, authStore)
        toast.showToast(t('common.success'), t('profile.updateSuccess'), 'success')
    } catch (error: any) {
        toast.showToast(
            t('profile.updateError'),
            error?.response?.data?.message || t('profile.updateErrorMsg'),
            'error'
        )
    } finally {
        isSubmitting.value = false
    }
}

onMounted(async () => {
    await loadProfile()
})
</script>
