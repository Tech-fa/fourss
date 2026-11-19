<template>
    <div class="min-h-screen bg-neutral-50">
        <!-- Header -->
        <BreadCrums :crumbs="crumbs"> </BreadCrums>

        <!-- Main Content -->
        <main id="main-content" class="px-6 py-8">
            <Tabs
                :tabs="tabs"
                v-model="currentTab"
                :test-ids="[
                    'nc-categories-tab-button',
                    'nc-types-tab-button',
                    'nc-risk-levels-tab-button',
                    'nc-representatives-tab-button'
                ]"
            />
            <Can subject="non_conformity_categories" :actions="['read']" showIfNoPermission>
                <NonConformityCategory v-if="currentTab === 0" v-model:nonConformityCategories="nonConformityCategories" test-id="nc-categories-tab" />
            </Can>
            <Can subject="non_conformity_types" :actions="['read']" showIfNoPermission>
                <NonConformityTypes v-if="currentTab === 1" v-model:nonConformityTypes="nonConformityTypes" test-id="nc-types-tab" />
            </Can>
            <Can subject="non_conformity_risk_levels" :actions="['read']" showIfNoPermission>
                <NonConformityRiskLevel v-if="currentTab === 2" v-model:nonConformityRiskLevels="nonConformityRiskLevels" test-id="nc-risk-levels-tab" />
            </Can>
            <Can subject="non_conformity_representatives" :actions="['read']" showIfNoPermission>
                <NonConformityRepresentative v-if="currentTab === 3" v-model:nonConformityRepresentatives="nonConformityRepresentatives" />
            </Can>
        </main>
    </div>
</template>

<script setup lang="ts">
import BreadCrums from '../breadCrums.vue'
import Can from '../Can.vue'
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Tabs from '@/components/Tabs.vue'
import NonConformityCategory from './non-conformity-category.vue'
import NonConformityTypes from './non-conformity-types.vue'
import NonConformityRiskLevel from './non-conformity-risk-level.vue'
import NonConformityRepresentative from './non-conformity-representative.vue'
import { type NonConformityRiskLevelResponseDTO, type ListItem, type AuditPersonnel } from '@/util/interfaces'

const route = useRoute()
const { t } = useI18n()
const nonConformityCategories = ref<any[]>([])
const nonConformityTypes = ref<ListItem[]>([])
const nonConformityRiskLevels = ref<NonConformityRiskLevelResponseDTO[]>([])
const nonConformityRepresentatives = ref<AuditPersonnel[]>([])
const crumbs = computed(() => [
    { name: t('nc.breadcrumbs.nonConformities'), path: '/act/non-conformities', icon: 'fa-solid fa-exclamation-triangle' },
    { name: t('nc.breadcrumbs.settings'), path: '/act/non-conformities/settings', icon: 'fa-solid fa-gear' }
])

const tabs = computed(() => [
    t('nc.settings.tabCategories'),
    t('nc.settings.tabTypes'),
    t('nc.settings.tabRiskLevels'),
    t('nc.settings.tabRepresentatives')
])

const currentTab = ref(0)
onMounted(() => {
    const tabParam = route.query.tab
    if (tabParam !== undefined) {
        const tabIndex = parseInt(tabParam as string)
        if (!isNaN(tabIndex) && tabIndex >= 0 && tabIndex < 4) {
            currentTab.value = tabIndex
        }
    }
})
</script>
