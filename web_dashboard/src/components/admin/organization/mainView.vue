<template>
    <Breadcrumb :crumbs="breadcrumbCrumbs" />



    <div v-if="currentTab === 0" class="p-4">
        <Table :skip-padding="true" :cols="columns" :column-labels="columnLabels" :rows="tableRows"
            :entities="filteredTeams" :page="1" :total="filteredTeams.length" :perPage="filteredTeams.length || 10"
            :totalPages="1" :loading="loading" :search-loading="false"
            :search-placeholder="t('admin_org_unit_tree.search_org_unit_placeholder')" :on-search="onSearch"
            :onNextPage="() => { }" :onPreviousPage="() => { }" :setPage="() => { }" :onSuccess="fetchTeams"
            :entityName="t('admin_org_unit_tree.title_single')" :subject="'teams'"
            :handleDelete="handleDelete" :onEdit="handleEdit" :hideView="() => true">
            <template #extra-search>
                <Can :subject="'teams'" :actions="['create']">
                    <AppButton button-style="primary" @click="addTeam" test-id="add-team-button">
                        <i class="fa-solid fa-plus mr-2"></i>
                        {{ t('admin_org_unit_tree.add_unit') }}
                    </AppButton>
                </Can>
            </template>

        </Table>
    </div>

</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiGet } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import { type OrganizationUnit } from '@/util/interfaces'
import AppButton from '@/components/AppButton.vue'
import AddUnit from './add-unit.vue'
import { useDialog } from '@/stores/dialog'
import Breadcrumb from '@/components/breadCrums.vue'
import Can from '@/components/Can.vue'
import Table from '@/components/Table.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useToast } from '@/stores/notification'
import { apiDelete } from '@/util/api'
import { formatApiErrorMessage } from '@/util/util'

const { openDialog, closeDialog } = useDialog()
const { t } = useI18n()
const toast = useToast()
const authStore = useAuthStore()

const breadcrumbCrumbs = computed(() => [
    {
        name: t('nav.organizationTree'),
        path: '/admin/org-tree',
        icon: 'fa-solid fa-users'
    }
])

const tabLabels = computed(() => [
    t('admin_org_unit_tree.title_plural'),
    t('admin_org_unit_tree.tab_unit_types')
])
const currentTab = ref(0)

const searchQuery = ref('')
const unitTypes = ref<any[]>([])
const unitTypesFlat = ref<any[]>([])
const teams = ref<OrganizationUnit[]>([])
const loading = ref(true)

const columns = ['name', 'members']
const columnLabels = computed(() => {
    return {
        name: t('admin_org_unit_tree.label_unit_name'),
        members: t('admin_org_unit_tree.label_members')
    }

})

const filteredTeams = computed(() => {
    const q = searchQuery.value.trim().toLowerCase()
    if (!q) return teams.value
    return teams.value.filter((team) => {
        const name = team.name || ''
        return name.toLowerCase().includes(q)
    })
})

const tableRows = computed(() =>
    filteredTeams.value.map((team) => ({
        id: team.id,
        name: team.name,
        members: team.members.length
    }))
)

onMounted(() => {
    fetchTeams()
})




const fetchTeams = async () => {
    try {
        loading.value = true
        teams.value = await apiGet<OrganizationUnit[]>('teams', authStore)
    } catch (error) {
        console.error('Error fetching teams:', error)
    } finally {
        loading.value = false
    }
}

const onSearch = (query: string) => {
    searchQuery.value = query
}

const setModal = (content2: any, properties2: any) => {
    openDialog(content2, properties2)
}

const addTeam = () => {
    setModal(AddUnit, {
        onSubmit: () => {
            fetchTeams()
            closeDialog()
        },
        onCancel: () => {
            closeDialog()
        }
    })
}

const handleEdit = (entity: OrganizationUnit) => {
    setModal(AddUnit, {
        onSubmit: () => {
            fetchTeams()
            closeDialog()
        },
        onCancel: () => {
            closeDialog()
        },
        org: entity
    })
}

const handleDelete = (entity: OrganizationUnit) => {
    openDialog(ConfirmDialog, {
        message: t('admin_org_unit_tree.delete_org_unit_body'),
        onConfirm: async () => {
            try {
                await apiDelete(`teams/${entity.id}`, authStore)
                toast.showToast(
                    t('common.success'),
                    t('admin_org_unit_tree.toast_org_unit_deleted'),
                    'success'
                )
                await fetchTeams()
            } catch (err) {
                const msg =
                    formatApiErrorMessage((err as any).response?.data, t, 'errors.org_unit') ||
                    t('admin_org_unit_tree.toast_generic_error')
                toast.showToast(t('common.error'), msg, 'error')
            } finally {
                closeDialog()
            }
        },
        onCancel: closeDialog
    })
}


</script>
