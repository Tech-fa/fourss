<template>
    <div id="root" class="min-h-screen bg-neutral-50">
        <BreadCrums :crumbs="[
            {
                name: t('nav.permissionGroups'),
                path: '',
                icon: 'fa-solid fa-users-gear text-neutral-700 text-2xl'
            }
        ]">

        </BreadCrums>

        <Table :cols="tableColHeaders" :rows="rows" :page="page" :total="total" :per-page="perPage"
            :total-pages="totalPages" :on-next-page="onNextPage" :on-previous-page="onPreviousPage" :set-page="setPage"
            :entities="groups" :entity-name="t('admin_permission_groups.entity_group')" :on-success="onSuccess"
            :search-placeholder="t('admin_permission_groups.search_placeholder')" :on-search="(val: string) => {
                    query = val
                    searchLoading = true
                }
                " :loading="loading" :search-loading="searchLoading" :hide-edit="(e: any) => !e.custom">
            <template #extra-search>
                <div class="flex items-center gap-4">
                    <Can :subject="'permissions'" :actions="['create']">
                        <AppButton buttonStyle="primary" href="/admin/permissions/roles/add"
                            test-id="add-group-button">
                            <i class="fa-solid fa-plus"></i>
                            <span class="ml-2">{{ t('admin_permission_groups.btn_add') }}</span>
                        </AppButton>
                    </Can>
                </div>
            </template>
        </Table>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Table from '@/components/Table.vue'
import type { PermissionGroup } from '@/util/interfaces'
import { apiGet } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import AppButton from '@/components/AppButton.vue'
import BreadCrums from '@/components/breadCrums.vue'
import Can from '@/components/Can.vue'

const { t, locale } = useI18n()
const groups = ref<PermissionGroup[]>([])
const page = ref(1)
const perPage = ref(10)
const total = ref(1)
const totalPages = ref(1)
const query = ref('')
const loading = ref(true)
const searchLoading = ref(false)
const rows = ref<{ [key: string]: any }[]>([])
const authStore = useAuthStore()

const tableColHeaders = computed(() => [
    t('admin_permission_groups.col_name'),
    t('admin_permission_groups.col_description'),
    t('admin_permission_groups.col_type'),
])

const mapRows = (groupList: PermissionGroup[]) => {
    const [cName, cDesc, cType, cMembers] = tableColHeaders.value
    return groupList.map((group) => ({
        id: group.id,
        [cName]: group.name,
        [cDesc]: group.description,
        [cType]: group.custom ? t('admin_permission_groups.type_custom') : t('admin_permission_groups.type_default'),
    }))
}

const onNextPage = () => {
    if (page.value < totalPages.value) {
        page.value = page.value + 1
    }
}

const onPreviousPage = () => {
    if (page.value > 1) {
        page.value = page.value - 1
    }
}

const setPage = (newPage: number) => {
    if (newPage != page.value) {
        page.value = newPage
    }
}

watch(query, () => {
    page.value = 1
    onSuccess()
})

watch(locale, () => {
    if (groups.value.length) {
        rows.value = mapRows(groups.value)
    }
})

const onSuccess = () => {
    loading.value = true
    apiGet<PermissionGroup[]>(`/permissions/roles?name=${query.value}`, authStore)
        .then((res) => {
            loading.value = false
            groups.value = res
            totalPages.value = Math.ceil(res.length / perPage.value)
            total.value = res.length
            rows.value = mapRows(res)
            searchLoading.value = false
        })
        .catch(() => {
            loading.value = false
            searchLoading.value = false
        })
}

onMounted(async () => {
    onSuccess()
})
</script>
