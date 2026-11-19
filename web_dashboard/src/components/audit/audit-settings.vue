<template>
  <div id="main-container" class="min-h-screen bg-neutral-50">
    <!-- Header -->
    <BreadCrums :crumbs="crums" />
    <main class="mx-auto lg:p-12 p-6">
      <Tabs :tabs="tabs" v-model="currentTab" :testIds="tabTestIds"/>
      <Can subject="audit_activity_types" :actions="['read']" showIfNoPermission>
        <AuditActivityTypePage v-if="currentTab === 0" v-model:activityTypes="activityTypes" />
      </Can>
      
      <Can subject="audit_roles" :actions="['read']" showIfNoPermission>
        <AuditRole v-if="currentTab === 1" v-model:auditRoles="auditRoles" />
      </Can>
      
      <Can subject="audit_personnels" :actions="['read']" showIfNoPermission>
        <AuditPersonnel v-if="currentTab === 2"/>
      </Can>
      
      <Can subject="audit_checklist_definitions" :actions="['read']" showIfNoPermission>
        <AuditChecklistDefinitions v-if="currentTab === 3" />
      </Can>

      <Can subject="audit_programs" :actions="['read']" showIfNoPermission>
        <AuditPrograms v-if="currentTab === 4" />
      </Can>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import Tabs from '@/components/Tabs.vue'
import BreadCrums from '@/components/breadCrums.vue'
import AuditPersonnel from './view-audit-personnel.vue'
import AuditRole from './audit-role.vue'
import type { AuditActivityType, ListItem } from '@/util/interfaces'
import Can from '../Can.vue'
import AuditActivityTypePage from './audit-activity-type.vue'
import AuditChecklistDefinitions from './audit-checklist-definitions.vue'
import AuditPrograms from './audit-programs.vue'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()

const crums = computed(() => {
    void locale.value
    return [
        {
            name: t('reports.modules.audits'),
            path: '/check/audits',
            icon: 'fa-solid fa-chart-line'
        },
        {
            name: t('common.settings'),
            path: '/check/audits/settings',
            icon: 'fa-solid fa-gear text-neutral-700 text-2xl'
        }
    ]
})

const tabs = computed(() => {
    void locale.value
    return [
        t('audit.settings.tab_audit_types'),
        t('audit.settings.tab_audit_roles'),
        t('audit.settings.tab_audit_personnel'),
        t('audit.settings.tab_checklist_definitions'),
        t('audit.settings.tab_audit_programs')
    ]
})

const tabTestIds = [
    'activity-types-tab-button',
    'audit-roles-tab-button',
    'audit-personnel-tab-button',
    'audit-checklist-definitions-tab-button',
    'audit-programs-tab-button'
]

const currentTab = ref(0)

// Handle URL query parameter for tab
const tabParam = route.query.tab
if (tabParam && !isNaN(Number(tabParam))) {
    const tabIndex = Number(tabParam)
    if (tabIndex >= 0 && tabIndex < 5) {
        currentTab.value = tabIndex
    }
}

const auditRoles = ref<ListItem[]>([])
const activityTypes = ref<AuditActivityType[]>([])
// Update URL when tab changes
watch(currentTab, (newTab) => {
    router.replace({
        query: {
            ...route.query,
            tab: newTab
        }
    })
})
</script>
