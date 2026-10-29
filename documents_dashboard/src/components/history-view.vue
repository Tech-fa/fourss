<template>
  <div class="history-view w-full" test-id="history-view-wrapper">
    <div v-if="loading && !historyItems.length" class="loading">
      <span>{{ t('history_view.loading') }}</span>
    </div>
    <div v-else-if="error && !historyItems.length" class="error">
      <span>{{ error }}</span>
    </div>
    <div v-else-if="!historyItems.length" class="no-history" test-id="no-history-message">
      <span>{{ t('history_view.no_records') }}</span>
    </div>
    <div v-else test-id="history-content">
      <div class="history-controls" test-id="history-controls">
        <button @click="expandAllItems" class="control-button" :disabled="allExpanded" test-id="history-expand-all-button">
          <i class="fa-solid fa-expand"></i> {{ t('history_view.expand_all') }}
        </button>
        <button @click="collapseAllItems" class="control-button" :disabled="allCollapsed" test-id="history-collapse-all-button">
          <i class="fa-solid fa-compress"></i> {{ t('history_view.collapse_all') }}
        </button>
      </div>
      
      <div class="history-timeline" test-id="history-timeline">
        <div v-for="item in historyItems" :key="item.id" class="history-item" test-id="history-item">
          <div class="history-header" @click="toggleItem(item.id)" test-id="history-item-header">
            <div class="header-left">
              <div class="expand-icon" test-id="history-item-expand-icon">
                <i :class="expandedItems.has(item.id) ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right'"></i>
              </div>
              <div class="history-action" :class="actionClass(item.action)" test-id="history-item-action">{{ formatActionLabel(item.action) }}</div>
            </div>
            <div class="history-meta" test-id="history-item-meta">
              <span class="history-date" test-id="history-item-date">{{ formatDate(item.createdAt) }}</span>
              <span class="history-user" test-id="history-item-user">{{ t('history_view.meta_by', { name: displayUserName(item.user) }) }}</span>
            </div>
          </div>
          
          <div class="history-changes" v-if="expandedItems.has(item.id)" test-id="history-item-changes">
            <div class="changes-summary" test-id="history-changes-summary">
              <span class="field-count" test-id="history-field-count">{{ fieldsChangedLabel(Object.keys(item.changes).length) }}</span>
            </div>
            <div v-for="(change, field) in item.changes" :key="field" class="field-change" test-id="history-field-change">
              <div class="field-name" test-id="history-field-name">{{ formatFieldName(field) }}</div>
              <div class="change-details" test-id="history-change-details">
                <div v-if="item.action === 'CREATE'" class="new-value" test-id="history-new-value">
                  <span class="value-label" test-id="history-value-label">{{ t('history_view.label_initial') }}</span>
                  <span class="value" test-id="history-value">{{ formatValue(change.newValue) }}</span>
                </div>
                <div v-else-if="item.action === 'DELETE'" class="old-value" test-id="history-old-value">
                  <span class="value-label" test-id="history-value-label">{{ t('history_view.label_final') }}</span>
                  <span class="value" test-id="history-value">{{ formatValue(change.oldValue) }}</span>
                </div>
                <template v-else>
                  <div class="old-value" test-id="history-old-value">
                    <span class="value-label" test-id="history-value-label">{{ t('history_view.label_from') }}</span>
                    <span class="value" test-id="history-value">{{ formatValue(change.oldValue) }}</span>
                  </div>
                  <div class="new-value" test-id="history-new-value">
                    <span class="value-label" test-id="history-value-label">{{ t('history_view.label_to') }}</span>
                    <span class="value" test-id="history-value">{{ formatValue(change.newValue) }}</span>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Pagination controls -->
        <div class="pagination-controls" test-id="history-pagination">
          <div class="pagination-info" test-id="history-pagination-info">
            {{ t('history_view.pagination_showing', { shown: historyItems.length, total: historyData.totalCount }) }}
          </div>
          
          <div class="pagination-buttons" test-id="history-pagination-buttons">
            <button 
              class="pagination-btn"
              :disabled="currentPage <= 1"
              @click="handlePreviousPage"
              test-id="history-pagination-previous"
            >
              <i class="fa-solid fa-chevron-left"></i> {{ t('history_view.previous') }}
            </button>
            
            <div class="pagination-pages" test-id="history-pagination-pages">
              <button 
                v-for="page in displayedPages" 
                :key="page" 
                class="page-number" 
                :class="{ active: page === currentPage }"
                @click="setPage(page)"
                test-id="history-pagination-page"
              >
                {{ page }}
              </button>
            </div>
            
            <button 
              class="pagination-btn"
              :disabled="currentPage >= totalPages"
              @click="handleNextPage"
              test-id="history-pagination-next"
            >
              {{ t('history_view.next') }} <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { apiGet } from '@/util/api';
import { useAuthStore } from '@/stores/auth';
import { formatLocalDate, snakeToCamelCase, isEpochTimestamp } from '@/util/util';

const { t } = useI18n();

interface HistoryChange {
  oldValue: any;
  newValue: any;
}

interface HistoryItem {
  id: number;
  entityType: string;
  entityId: string;
  changes: Record<string, HistoryChange>;
  action: string;
  createdAt: number;
  user: {
    id: string;
    name?: string;
    fname?: string;
    lname?: string;
  };
}

interface PaginatedResponse {
  data: HistoryItem[];
  currentPage: number;
  totalCount: number;
  perPage: number;
}

const displayUserName = (user: HistoryItem['user'] | undefined) => {
  if (!user) return t('history_view.unknown_user');
  if (user.name?.trim()) return user.name.trim();
  const parts = [user.fname, user.lname].filter(Boolean).join(' ').trim();
  return parts || t('history_view.unknown_user');
};

const fieldsChangedLabel = (count: number) =>
  count === 1 ? t('history_view.one_field_changed') : t('history_view.n_fields_changed', { count });

const formatActionLabel = (action: string) => {
  const map: Record<string, string> = {
    CREATE: 'history_view.action_CREATE',
    UPDATE: 'history_view.action_UPDATE',
    DELETE: 'history_view.action_DELETE',
  };
  const key = map[action];
  return key ? t(key) : action;
};

const props = defineProps({
  entityType: {
    type: String,
    required: true
  },
  entityId: {
    type: String,
    required: true
  },
  perPageOptions: {
    type: Array as () => number[],
    default: () => [10, 25, 50, 100]
  },
  defaultExpanded: {
    type: Boolean,
    default: true
  },
  refreshTrigger: {
    type: [String, Number, Boolean],
    default: null
  }
});

// Get auth store for API calls
const authStore = useAuthStore();

// State
const historyData = ref<PaginatedResponse>({
  data: [],
  currentPage: 1,
  totalCount: 0,
  perPage: 5
});
const historyItems = computed(() => historyData.value.data);
const loading = ref(true);
const error = ref<string | null>(null);
const currentPage = ref(1);
const perPage = ref(5);
const expandedItems = ref<Set<number>>(new Set());

// Computed
const totalPages = computed(() => Math.ceil(historyData.value.totalCount / perPage.value));
const allExpanded = computed(() => {
  return historyItems.value.length > 0 && 
         historyItems.value.every(item => expandedItems.value.has(item.id));
});
const allCollapsed = computed(() => expandedItems.value.size === 0);

const displayedPages = computed(() => {
  const pages = [];
  const maxPagesToShow = 5;
  
  if (totalPages.value <= maxPagesToShow) {
    // Show all pages if there are fewer than maxPagesToShow
    for (let i = 1; i <= totalPages.value; i++) {
      pages.push(i);
    }
  } else {
    // Always show page 1
    pages.push(1);
    
    // Calculate the range of pages to show around current page
    let startPage = Math.max(2, currentPage.value - 1);
    let endPage = Math.min(totalPages.value - 1, currentPage.value + 1);
    
    // If we're at the beginning, show more pages after
    if (currentPage.value <= 2) {
      endPage = Math.min(totalPages.value - 1, 4);
    }
    
    // If we're at the end, show more pages before
    if (currentPage.value >= totalPages.value - 1) {
      startPage = Math.max(2, totalPages.value - 3);
    }
    
    // Add ellipsis if needed
    if (startPage > 2) {
      pages.push('...');
    }
    
    // Add the range of pages
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    // Add ellipsis if needed
    if (endPage < totalPages.value - 1) {
      pages.push('...');
    }
    
    // Always show the last page
    if (totalPages.value > 1) {
      pages.push(totalPages.value);
    }
  }
  
  return pages;
});

// Methods
const toggleItem = (itemId: number) => {
  if (expandedItems.value.has(itemId)) {
    expandedItems.value.delete(itemId);
  } else {
    expandedItems.value.add(itemId);
  }
};

const expandAllItems = () => {
  expandedItems.value = new Set(historyItems.value.map(item => item.id));
};

const collapseAllItems = () => {
  expandedItems.value.clear();
};

const fetchHistory = async () => {
  if (!props.entityId || !props.entityType) return;
  
  loading.value = true;
  error.value = null;
  
  try {
    const response = await apiGet<PaginatedResponse>(
      `/histories/${props.entityType}/${props.entityId}?page=${currentPage.value}&perPage=${perPage.value}`,
      authStore
    );
    
    historyData.value = response;
    
    // Set initial expanded state for new items
    if (props.defaultExpanded) {
      response.data.forEach(item => {
        expandedItems.value.add(item.id);
      });
    }
  } catch (err) {
    console.error('Error fetching history:', err);
    error.value = t('history_view.load_failed');
    historyData.value = {
      data: [],
      currentPage: 1,
      totalCount: 0,
      perPage: perPage.value
    };
  } finally {
    loading.value = false;
  }
};

const handleNextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

const handlePreviousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

const setPage = (page: number | string) => {
  if (typeof page === 'number') {
    currentPage.value = page;
  }
};

const formatDate = (timestamp: number) => {
  if (!timestamp) return t('history_view.unknown_date');
  return formatLocalDate(Number(timestamp));
};

const formatFieldName = (field: string) => {
  // Convert camelCase to Title Case with spaces
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase());
};

const formatValue = (value: any) => {
  if (value === null || value === undefined) return t('history_view.empty_value');
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch (e) {
      return String(value);
    }
  }
  // Check if value is an epoch timestamp before attempting to format as date
  if (isEpochTimestamp(value)) {
    return formatLocalDate(Number(value))
  }
  return snakeToCamelCase(String(value));
};

const actionClass = (action: string) => {
  return {
    'CREATE': 'action-create',
    'UPDATE': 'action-update',
    'DELETE': 'action-delete'
  }[action] || '';
};

// Watch for changes
watch(() => props.entityId, () => {
  currentPage.value = 1;
  fetchHistory();
});

watch(() => props.entityType, () => {
  currentPage.value = 1;
  fetchHistory();
});

watch(() => currentPage.value, () => {
  fetchHistory();
});

watch(() => perPage.value, () => {
  currentPage.value = 1;
  fetchHistory();
});

watch(() => props.refreshTrigger, () => {
  if (props.refreshTrigger !== null) {
    fetchHistory();
  }
});

// Initialize
onMounted(fetchHistory);
</script>

<style scoped>
.history-view {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  color: #333;
  margin: 0 auto;
}

.loading, .error, .no-history {
  padding: 20px;
  text-align: center;
  background: #f9f9f9;
  border-radius: 4px;
  margin: 10px 0;
}

.error {
  color: #d32f2f;
  background-color: #ffebee;
}

.history-controls {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
  gap: 8px;
}

.control-button {
  padding: 6px 12px;
  background-color: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.control-button:hover:not(:disabled) {
  background-color: #eeeeee;
}

.control-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.history-timeline {
  border-left: 2px solid #e0e0e0;
  padding-left: 20px;
  margin-left: 10px;
}

.history-item {
  position: relative;
  margin-bottom: 25px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
}

.history-item:before {
  content: '';
  position: absolute;
  left: -26px;
  top: 25px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #e0e0e0;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  cursor: pointer;
  border-bottom: 1px solid transparent;
  transition: background-color 0.2s;
  border-radius: 6px;
}

.history-header:hover {
  background-color: #f9f9f9;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.expand-icon {
  width: 16px;
  display: flex;
  justify-content: center;
  color: #757575;
  transition: transform 0.2s;
}

.history-action {
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  text-transform: uppercase;
}

.action-create {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.action-update {
  background-color: #e3f2fd;
  color: #1565c0;
}

.action-delete {
  background-color: #ffebee;
  color: #c62828;
}

.history-meta {
  font-size: 12px;
  color: #757575;
  display: flex;
  align-items: center;
  gap: 12px;
}

.history-date {
  white-space: nowrap;
}

.history-changes {
  padding: 0 15px 15px;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.changes-summary {
  margin: 8px 0 16px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #eee;
  color: #757575;
  font-size: 14px;
}

.field-change {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px dashed #eee;
}

.field-change:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.field-name {
  font-weight: 600;
  margin-bottom: 6px;
  color: #546e7a;
}

.change-details {
  padding-left: 10px;
  font-size: 14px;
}

.old-value, .new-value {
  display: flex;
  margin: 4px 0;
}

.value-label {
  flex: 0 0 7.5rem;
  max-width: 40%;
  color: #757575;
  font-weight: 500;
}

.value {
  flex: 1;
  word-break: break-all;
}

/* Pagination styles */
.pagination-controls {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.pagination-info {
  font-size: 14px;
  color: #616161;
}

.pagination-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination-btn {
  background-color: #f5f5f5;
  border: 1px solid #e0e0e0;
  color: #616161;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.pagination-btn:hover:not(:disabled) {
  background-color: #eeeeee;
  border-color: #bdbdbd;
}

.pagination-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pagination-pages {
  display: flex;
  gap: 4px;
}

.page-number {
  min-width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 14px;
  background-color: #f5f5f5;
  border: 1px solid #e0e0e0;
  cursor: pointer;
}

.page-number.active {
  background-color: #1976d2;
  color: white;
  border-color: #1976d2;
}

.page-number:hover:not(.active) {
  background-color: #eeeeee;
}
</style>