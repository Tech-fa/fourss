<template>

    <div id="main-container" class="min-h-screen bg-neutral-50">

        <!-- Header -->

        <BreadCrums :crumbs="crums" />
        <main class="max-w-7xl mx-auto px-6 py-8">

            <Tabs :tabs="tabs" v-model="currentTab" test-id="settings-tabs" />
            <Can subject="approval_strategies" :actions="['read']" showIfNoPermission>
                <div v-if="currentTab === 0">
                    <ApprovalStrategyComp v-model:strategies="strategies" />
                </div>
            </Can>
            <Can subject="document_acknowledgements" :actions="['read']" showIfNoPermission>
                <div v-if="currentTab === 1">
                    <DocumentAcknowledgementComp v-model:acknowledgements="acknowledgements" />
                </div>
            </Can>
            <Can subject="document_types" :actions="['read']" showIfNoPermission>
                <div v-if="currentTab === 2">
                    <DocumentCategory v-model:types="types" />
                </div>
            </Can>
            <Can subject="document_templates" :actions="['read']" showIfNoPermission>
                <div v-if="currentTab === 3">
                    <DocumentTemplates />
                </div>
            </Can>
        </main>
    </div>
</template>



<script setup lang="ts">

import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import Tabs from '@/components/Tabs.vue'
import BreadCrums from '@/components/breadCrums.vue'
import ApprovalStrategyComp from '@/components/document/ApprovalStrategy.vue'
import DocumentAcknowledgementComp from '@/components/document/DocumentAcknowledgement.vue'
import DocumentCategory from '@/components/document/view-category.vue'
import type { ApprovalStrategy, DocumentAcknowledgement, DocumentType } from '@/util/interfaces'
import DocumentTemplates from './view-templates.vue'
import Can from '../Can.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const crums = computed(() => [
    {

        name: t('nav.documents'),
        path: '/plan/documents',
        icon: 'fa-solid fa-file-lines text-neutral-700 text-2xl'
    },

    {
        name: t('common.settings'),
        path: '',
        icon: 'fa-solid fa-gear text-neutral-700 text-2xl'
    }
])

const tabs = computed(() => [
    t('document.settings.tabs.approval_strategies'),
    t('document.settings.tabs.document_acknowledgements'),
    t('document.settings.tabs.document_categories'),
    t('document.settings.tabs.document_templates')
])

const currentTab = ref(0)
const strategies = ref<ApprovalStrategy[]>([])
const acknowledgements = ref<DocumentAcknowledgement[]>([])
const types = ref<DocumentType[]>([])

// Initialize currentTab from URL parameter
const tabParam = route.query.tab
if (tabParam && !isNaN(Number(tabParam))) {

    const tabIndex = Number(tabParam)

    if (tabIndex >= 0 && tabIndex < 4) {

        currentTab.value = tabIndex

    }
}
// Watch for tab changes and update URL

watch(currentTab, (newTab) => {
    router.replace({
        query: {

            ...route.query,

            tab: newTab

        }
    })
})

</script>
