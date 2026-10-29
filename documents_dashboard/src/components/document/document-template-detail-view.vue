<template>
    <div class="min-h-screen bg-neutral-50 flex flex-col">
        <BreadCrums :crumbs="crumbs" />

        <main class="flex-1 flex flex-col mx-auto px-6 py-8 w-full max-w-5xl">
            <div v-if="pageLoading" class="flex-1 flex items-center justify-center py-32">
                <Spinner width="5" />
            </div>

            <template v-else-if="template">
                <h1 class="text-xl font-semibold text-neutral-900 mb-4">
                    {{ template.title }}
                </h1>
                <div
                    v-if="template.content"
                    class="rounded border border-neutral-200 bg-white overflow-hidden"
                    style="height: min(80vh, 900px)"
                >
                    <SuperDocEditor
                        :document="template.content"
                        document-mode="viewing"
                        role="viewer"
                        :hide-toolbar="true"
                    />
                </div>
                <div
                    v-else
                    class="flex flex-col items-center justify-center py-32 text-neutral-400 gap-3 text-center px-4 bg-white border border-neutral-200 rounded-lg"
                >
                    <i class="fa-solid fa-file-circle-xmark text-4xl"></i>
                    <p>{{ t('document.content_page.empty') }}</p>
                </div>
            </template>
        </main>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import BreadCrums from '@/components/breadCrums.vue'
import SuperDocEditor from '@/components/SuperDocEditor.vue'
import { apiGet } from '@/util/api'
import { formatApiErrorMessage } from '@/util/util'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import type { DocumentTemplate } from '@/util/interfaces'
import Spinner from '../Spinner.vue'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const pageLoading = ref(true)
const template = ref<DocumentTemplate | null>(null)

const crumbs = computed(() => {
    void locale.value
    return [
        {
            name: t('nav.documents'),
            path: '/plan/documents',
            icon: 'fa-solid fa-file-lines text-neutral-700 text-2xl'
        },
        {
            name: t('document.main.settings'),
            path: '/plan/documents/settings?tab=2',
            icon: 'fa-solid fa-gear text-neutral-700 text-2xl'
        },
        {
            name: t('document.template_detail.breadcrumb_view'),
            path: '',
            icon: 'fa-solid fa-file-contract text-neutral-700 text-2xl'
        }
    ]
})

const loadTemplate = async () => {
    pageLoading.value = true
    template.value = null
    try {
        const data = await apiGet<DocumentTemplate>(
            `/documents/templates/${route.params.id}`,
            authStore
        )
        template.value = data
    } catch (error: any) {
        console.error('Error loading template:', error)
        const raw = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(t('common.error'), raw || t('document.template_detail.toast_load_failed'), 'error')
        router.push('/plan/documents/settings?tab=2')
    } finally {
        pageLoading.value = false
    }
}

onMounted(() => {
    loadTemplate()
})
</script>
