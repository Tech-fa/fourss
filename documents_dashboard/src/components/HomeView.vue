<template>
  <div :class="['min-h-full  bg-gray-100']">
    <TransitionRoot
      as="template"
      :show="sidebarOpen"
      v-if="authStore.state.isLoggedIn && !route.meta.fullPage"
    >
      <Dialog
        :class="[
          `relative z-alot xl:hidden `,
          route.path == '/' ? 'open-bar' : '',
        ]"
        @close="sidebarOpen = false"
      >
        <TransitionChild
          as="template"
          enter="transition-opacity ease-linear duration-300"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="transition-opacity ease-linear duration-300"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-gray-900/80" />
        </TransitionChild>

        <div class="fixed inset-0 flex">
          <TransitionChild
            as="template"
            enter="transition ease-in-out duration-300 transform"
            :enter-from="isRTL ? 'translate-x-full' : '-translate-x-full'"
            enter-to="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leave-from="translate-x-0"
            :leave-to="isRTL ? 'translate-x-full' : '-translate-x-full'"
          >
            <DialogPanel class="relative me-16 flex w-full min-w-0 max-w-xs flex-1 overflow-x-clip ring-1 ring-white/10">
              <TransitionChild
                as="template"
                enter="ease-in-out duration-300"
                enter-from="opacity-0"
                enter-to="opacity-100"
                leave="ease-in-out duration-300"
                leave-from="opacity-100"
                leave-to="opacity-0"
              >
                <div
                  class="absolute ltr:left-full rtl:right-full top-0 flex w-16 justify-center pt-5"
                >
                  <button
                    type="button"
                    class="-m-2.5 p-2.5"
                    @click="sidebarOpen = false"
                  >
                    <span class="sr-only">Close sidebar</span>
                    <XMarkIcon class="h-4 w-4 text-white" aria-hidden="true" />
                  </button>
                </div>
              </TransitionChild>
              <!-- Sidebar component, swap this element with another sidebar if you like -->
              <div
                class="flex min-h-0 min-w-0 w-full grow flex-col gap-y-5 overflow-x-clip overflow-y-auto bg-white dark:bg-gray-900"
              >
                <div
                  class="flex h-16 shrink-0 items-center gap-2.5 border-b border-neutral-200 px-6"
                >
                  <img
                    src="@/assets/img/4ss-logo.svg?url"
                    alt=""
                    class="h-9 w-9 shrink-0"
                  />
                  <span class="text-base font-bold tracking-wide text-neutral-900 dark:text-white">4SS</span>
                </div>
                <nav class="mt-2 flex min-h-0 min-w-0 flex-1 flex-col px-6">
                  <ul role="list" class="flex min-h-0 min-w-0 flex-1 flex-col gap-y-7">
                    <li>
                      <ul role="list" class="-mx-2 min-w-0 space-y-1">
                        <li v-for="item in visibleNavigations" :key="item.path">
                          <span
                            v-if="!item.menuItems?.length"
                            @click="router.push(item.path)"
                            :class="[
                              item.path == route.path ||
                              route.path.includes(`${item.path}/`)
                                ? 'bg-gray-200 dark:bg-gray-800 dark:text-white text-black'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-400 text-black  hover:text-gray-600',
                              'group flex items-center gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 cursor-pointer',
                            ]"
                          >
                            <component
                              :is="item.icon"
                              class="h-4 w-4 shrink-0"
                              aria-hidden="true"
                            />
                            {{ item.name }}
                          </span>
                          <Disclosure
                            as="div"
                            v-else
                            v-slot="{ open }"
                            :default-open="route.path.includes(`${item.path}/`)"
                          >
                            <DisclosureButton
                              :class="[
                                route.path.includes(`${item.path}/`)
                                  ? 'bg-gray-200 dark:bg-gray-800 dark:text-white text-black'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-400 text-black dark:hover:text-white hover:text-gray-800',
                                'flex w-full items-center  gap-x-3 rounded-md p-2 text-start text-sm font-semibold leading-6 ',
                              ]"
                            >
                              <component
                                :is="item.icon"
                                class="h-4 w-4 shrink-0"
                                aria-hidden="true"
                              />
                              {{ item.name }}
                              <ChevronRightIcon
                                :class="[
                                  open
                                    ? 'rotate-90 text-gray-500'
                                    : 'text-gray-400',
                                  'ms-auto h-5 w-5 shrink-0',
                                ]"
                                aria-hidden="true"
                              />
                            </DisclosureButton>
                            <DisclosurePanel as="ul" class="mt-1 px-2">
                              <li
                                v-for="subItem in visibleMenuItems(item)"
                                :key="subItem.path"
                              >
                                <!-- 44px -->
                                <span
                                  @click="router.push(subItem.path)"
                                  :class="[
                                    subItem.path == route.path ||
                                    route.path.includes(`${subItem.path}/`)
                                      ? 'bg-gray-200  text-black'
                                      : 'hover:bg-gray-50   text-black dark:hover:text-white hover:text-gray-800',
                                    'flex flex-row items-center gap-x-3 rounded-md py-2 ps-9 pe-2 text-sm leading-6 text-black cursor-pointer',
                                  ]"
                                >
                                  <component
                                    :is="subItem.icon"
                                    class="h-4 w-4 shrink-0"
                                    aria-hidden="true"
                                  />
                                  {{ subItem.name }}
                                </span>
                              </li>
                            </DisclosurePanel>
                          </Disclosure>
                        </li>
                      </ul>
                    </li>

                    <li class="mt-auto min-w-0">
                      <div class="flex flex-col gap-y-2">
                        <!-- Language -->
                        <div
                          class="flex w-full min-w-0 items-center gap-x-3 px-6 py-3 text-sm font-semibold text-black dark:text-gray-400"
                        >
                          <Select2
                            :placeholder="t('common.language')"
                            v-model="selectedLocale"
                            :values="localeOptions"
                            :display="(lang: any) => lang.label"
                          />
                        </div>

                        <!-- Notifications -->
                        <div
                          @click="router.push('/notifications')"
                          :class="[
                            'flex items-center gap-x-4 px-6 py-3 text-sm font-semibold leading-6 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-400 text-black dark:hover:text-white hover:text-gray-800 cursor-pointer',
                            route.path == '/notifications'
                              ? 'bg-gray-200 dark:bg-gray-800 dark:text-white text-black'
                              : '',
                          ]"
                        >
                          <i class="fa-solid fa-bell text-lg"></i>
                          <span>{{ $t("nav.notifications") }}</span>
                          <span
                            v-if="notificationCountStore.count > 0"
                            class="flex items-center justify-center bg-red-500 text-white text-xs rounded-full h-5 w-5 ml-auto"
                          >
                            {{ notificationCountStore.count }}
                          </span>
                        </div>

                        <!-- Profile -->
                        <div
                          @click="router.push('/profile')"
                          :class="[
                            'flex items-center gap-x-4 px-6 py-3 text-sm font-semibold leading-6 hover:bg-gray-50 dark:hover:bg-gray-800  text-black  hover:text-gray-800 cursor-pointer',
                            route.path == '/profile'
                              ? 'bg-gray-200  text-black'
                              : '',
                          ]"
                        >
                          <i class="fa-solid fa-user text-lg"></i>
                          <span>{{ $t("nav.profile") }}</span>
                        </div>

                        <!-- Logout -->
                        <div
                          @click="authStore.logout()"
                          class="flex items-center gap-x-4 px-6 py-3 text-sm font-semibold leading-6 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-400 text-black dark:hover:text-white hover:text-gray-800 cursor-pointer"
                          test-id="home-view-logout-button"
                        >
                          <i class="fa-solid fa-right-from-bracket text-lg"></i>
                          <span>{{ $t("nav.logout") }}</span>
                        </div>
                      </div>
                    </li>
                  </ul>
                </nav>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>
    <!-- Static sidebar for desktop -->
    <TransitionRoot
      :show="open"
      v-if="authStore.state.isLoggedIn && !route.meta.fullPage"
    >
      <TransitionChild
        as="template"
        enter="transition ease-in-out duration-300 transform"
        :enter-from="isRTL ? 'translate-x-full' : '-translate-x-full'"
        enter-to="translate-x-0"
        leave="transition ease-in-out duration-300 transform"
        leave-from="translate-x-0"
        :leave-to="isRTL ? 'translate-x-full' : '-translate-x-full'"
      >
        <div
          :class="[
            'hidden xl:fixed xl:inset-y-0 xl:left-0 rtl:xl:left-auto rtl:xl:right-0 xl:z-50 xl:flex xl:w-56 xl:min-w-0 xl:flex-col overflow-x-clip bg-white ring-1 ring-white/5',
          ]"
        >
          <!-- Sidebar component, swap this element with another sidebar if you like -->
          <div
            class="flex min-h-0 min-w-0 w-full grow flex-col gap-y-5 overflow-x-clip overflow-y-auto border-r bg-white dark:bg-gray-900"
          >
            <div
              class="flex h-16 flex-row items-center justify-between gap-2 border-b bg-gray-50 px-4 py-2.5"
            >
              <div class="flex min-w-0 items-center gap-2">
                <img
                  src="@/assets/img/4ss-logo.svg?url"
                  alt=""
                  class="h-8 w-8 shrink-0"
                />
                <span class="truncate text-sm font-bold tracking-wide text-neutral-900">4SS</span>
              </div>
              <button type="button" class="shrink-0" @click="open = false">
                <span class="sr-only">Close sidebar</span>
                <Bars3Icon
                  :class="[
                    'h-5 w-5 ',
                    route.path == `/`
                      ? 'text-gray-900'
                      : 'dark:text-white text-gray-900 ',
                  ]"
                  aria-hidden="true"
                />
              </button>
            </div>

            <nav class="flex min-h-0 min-w-0 flex-1 flex-col px-6">
              <ul role="list" class="flex min-h-0 min-w-0 flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" class="-mx-2 min-w-0 space-y-1">
                    <li v-for="item in visibleNavigations" :key="item.path">
                      <span
                        v-if="!item.menuItems?.length"
                        @click="router.push(item.path)"
                        :class="[
                          item.path == route.path ||
                          route.path.includes(`${item.path}/`)
                            ? 'bg-gray-200 dark:bg-gray-800 dark:text-white text-primary'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-400 text-primary dark:hover:text-white hover:text-gray-800',
                          'group flex items-center gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 cursor-pointer',
                        ]"
                      >
                        <component
                          :is="item.icon"
                          class="h-4 w-4 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                        {{ item.name }}
                      </span>
                      <Disclosure
                        as="div"
                        v-else
                        v-slot="{ open }"
                        :default-open="route.path.includes(`${item.path}/`)"
                      >
                        <DisclosureButton
                          :class="[
                            route.path.includes(`${item.path}/`)
                              ? 'bg-gray-200 dark:bg-gray-800 dark:text-white text-primary'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-400 text-primary dark:hover:text-white hover:text-primary',
                            'flex w-full items-center gap-x-3 rounded-md p-2 text-start text-sm font-semibold leading-6 cursor-pointer',
                          ]"
                        >
                          <component
                            :is="item.icon"
                            class="h-4 w-4 shrink-0 text-primary"
                            aria-hidden="true"
                          />
                          {{ item.name }}
                          <ChevronRightIcon
                            :class="[
                              open ? 'rotate-90 text-primary' : 'text-primary',
                              'ms-auto h-5 w-5 shrink-0',
                            ]"
                            aria-hidden="true"
                          />
                        </DisclosureButton>
                        <DisclosurePanel as="ul" class="mt-1 px-2">
                          <li
                            v-for="subItem in visibleMenuItems(item)"
                            :key="subItem.path"
                          >
                            <!-- 44px -->
                            <span
                              @click="router.push(subItem.path)"
                              :test-id="
                                subItem.path.replace(/\//g, '-') + '-sidebar'
                              "
                              :class="[
                                subItem.path == route.path ||
                                route.path.includes(`${subItem.path}/`)
                                  ? 'bg-gray-200 dark:bg-gray-800 dark:text-white text-primary'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-400 text-primary dark:hover:text-white hover:text-primary',
                                'flex flex-row items-center gap-x-3 rounded-md py-2 pl-2 pr-2 text-sm leading-6 text-black cursor-pointer',
                              ]"
                            >
                              <component
                                :is="subItem.icon"
                                class="h-4 w-4 shrink-0 text-primary"
                                aria-hidden="true"
                              />
                              {{ subItem.name }}
                            </span>
                          </li>
                        </DisclosurePanel>
                      </Disclosure>
                    </li>
                  </ul>
                </li>

                <li class="mt-auto min-w-0">
                  <div class="flex flex-col gap-y-2">
                    <!-- Language -->
                    <div
                      class="flex w-full min-w-0 items-center gap-x-3 px-6 py-3 text-sm font-semibold text-black dark:text-gray-400"
                    >
                      <Select2
                        :placeholder="t('common.language')"
                        v-model="selectedLocale"
                        :values="localeOptions"
                        :display="(lang: any) => lang.label"
                      />
                    </div>

                    <!-- Notifications -->
                    <div
                      @click="router.push('/notifications')"
                      :class="[
                        'flex items-center text-primary gap-x-4 px-6 py-3 text-sm font-semibold leading-6 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-400  dark:hover:text-white hover:text-gray-800 cursor-pointer',
                        route.path == '/notifications'
                          ? 'bg-gray-200  text-black'
                          : '',
                      ]"
                    >
                      <i class="fa-solid fa-bell text-lg text-primary"></i>
                      <span>{{ $t("nav.notifications") }}</span>
                      <span
                        v-if="notificationCountStore.count > 0"
                        class="flex items-center justify-center bg-red-500 text-white text-xs rounded-full h-5 w-5 ml-auto"
                      >
                        {{ notificationCountStore.count }}
                      </span>
                    </div>

                    <!-- Profile -->
                    <div
                      @click="router.push('/profile')"
                      :class="[
                        'flex items-center text-primary gap-x-4 px-6 py-3 text-sm font-semibold leading-6 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-400  dark:hover:text-white hover:text-gray-800 cursor-pointer',
                        route.path == '/profile'
                          ? 'bg-gray-200  text-black'
                          : '',
                      ]"
                    >
                      <i class="fa-solid fa-user text-lg text-primary"></i>
                      <span>{{ $t("nav.profile") }}</span>
                    </div>

                    <!-- Logout -->
                    <div
                      @click="authStore.logout()"
                      class="flex items-center text-primary gap-x-4 px-6 py-3 text-sm font-semibold leading-6 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-400 dark:hover:text-white hover:text-gray-800 cursor-pointer"
                      test-id="home-view-logout-button"
                    >
                      <i class="fa-solid fa-right-from-bracket text-lg"></i>
                      <span>{{ $t("nav.logout") }}</span>
                    </div>
                  </div>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </TransitionChild>
    </TransitionRoot>

    <div
      :class="[
        'transition-all duration-300 ease-in-out bg-white',
        mainOffsetClass,
        route.meta.fullPage ? '' : 'min-h-screen ',
      ]"
      :style="mainOffsetStyle"
    >
      <div
        v-if="authStore.state.isLoggedIn && !route.meta.fullPage"
        :class="['fixed z-50 flex items-center gap-2', open ? 'xl:hidden' : '']"
        :style="hamburgerSafeAreaStyle"
      >
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-opposite hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          @click="
            () => {
              sidebarOpen = true;
              open = true;
            }
          "
        >
          <span class="sr-only">Open sidebar</span>
          <Bars3Icon :class="['h-5 w-5 text-opposite']" aria-hidden="true" />
        </button>
      </div>
      <RouterView />
    </div>
  </div>
</template>
<script setup lang="ts">
import {
    Dialog,
    DialogPanel,
    Disclosure,
    DisclosureButton,
    DisclosurePanel,
    TransitionChild,
    TransitionRoot
} from '@headlessui/vue'
import { Bars3Icon, XMarkIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import { h, onMounted, ref, watch, type Component, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore, type PermissionTree } from '@/stores/auth'
import { apiGet, apiGetPublic } from '@/util/api'
import { useToast } from '@/stores/notification'
import { useNotificationCountStore } from '@/stores/notification-count'
import { useDialog } from '@/stores/dialog'
import { useI18n } from 'vue-i18n'
import { LOCALE_OPTIONS, type AppLocale } from '@/i18n'
import Select2 from './Select2.vue'
import { getIdleTimeoutMs, IDLE_ACTIVITY_EVENTS } from '@/util/pwa'
import { TEAMS_FEATURE_ENABLED } from '@/util/teams-feature'

const { locale, t } = useI18n()

const localeOptions = LOCALE_OPTIONS

// Load saved language on startup, default to 'en'
const savedLocale = localStorage.getItem('locale') as AppLocale | null

if (savedLocale) {
    locale.value = savedLocale
}

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const selectedLocale = ref<{ value: AppLocale; label: string }>(LOCALE_OPTIONS.find(lang => lang.value === authStore.locale) || LOCALE_OPTIONS[0])

const isRTL = computed(() => authStore.locale === 'ar')
const sidebarOpen = ref(true)
const open = ref(true)

const mainOffsetClass = computed(() => {
    if (!authStore.state.isLoggedIn || route.meta.fullPage) {
        return ''
    }
    return open.value ? ' xl:ps-56' : ''
})

const mainOffsetStyle = computed(() => undefined)
const hamburgerSafeAreaStyle = {
    top: 'calc(0.625rem + env(safe-area-inset-top, 0px))',
    insetInlineStart: 'calc(1.25rem + env(safe-area-inset-left, 0px))'
}
const notificationTimer = ref()
const notificationCountStore = useNotificationCountStore()
const toast = useToast()
const query = ref({})
const dialog = useDialog()

watch(selectedLocale, () => {
    authStore.setLocale(selectedLocale.value.value)
})

// Add idle detection state and timer
const idleTimeout = ref<number | null>(null)
const lastActivity = ref(Date.now())

const markActivity = () => {
    lastActivity.value = Date.now()
}

const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
        markActivity()
    }
}

const checkIdle = () => {
    if (document.visibilityState === 'hidden') {
        return
    }
    if (Date.now() - lastActivity.value >= getIdleTimeoutMs()) {
        query.value = {
            redirect: route.fullPath
        }
        dialog.closeDialog()
        authStore.logout()
        toast.showToast(
            t('common.session_timeout_title'),
            t('common.session_timeout_message'),
            'info'
        )
    }
}

watch(authStore, () => {
    if (!authStore.state.isLoggedIn) {
        router.push({
            path: '/login',
            query: query.value
        })
    }
    if (!localStorage.getItem('permissions') && authStore.state.isLoggedIn) {
        apiGetPublic<{ [key: string]: PermissionTree }>('/permissions').then((res) => {
            authStore.setPermissionTree(res)
        })
    }
})

onMounted(() => {
    // Fetch notification count immediately
    fetchNotificationCount()

    // Set up a timer to fetch notification count every 60 seconds
    notificationTimer.value = window.setInterval(() => {
        fetchNotificationCount()
    }, 60000)

    if (!localStorage.getItem('permissions')) {
        apiGetPublic<{ [key: string]: PermissionTree }>('/permissions').then((res) => {
            authStore.setPermissionTree(res)
        })
    }

    IDLE_ACTIVITY_EVENTS.forEach((eventName) => {
        window.addEventListener(eventName, markActivity, { passive: true })
    })
    document.addEventListener('visibilitychange', handleVisibilityChange)

    idleTimeout.value = window.setInterval(checkIdle, 10000)
})

onUnmounted(() => {
    // Clean up the timer when component is unmounted to prevent memory leaks
    if (notificationTimer.value !== null) {
        window.clearInterval(notificationTimer.value)
        notificationTimer.value = null
    }

    // Clean up idle detection
    if (idleTimeout.value !== null) {
        window.clearInterval(idleTimeout.value)
        idleTimeout.value = null
    }

    IDLE_ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, markActivity)
    })
    document.removeEventListener('visibilitychange', handleVisibilityChange)
})

const fetchNotificationCount = async () => {
    try {
        const response = await apiGet<number>('/user-notifications/unviewed-count', authStore)
        if (notificationCountStore.count !== response) {
            notificationCountStore.setCount(response)
            if (response > 0) {
                toast.showToast(
                    t('nav.newNotification'),
                    t('nav.newNotificationMsg', { count: response }),
                    'success'
                )
            }
        }
    } catch (error) {
        console.error('Error fetching notification count:', error)
    }
}
type NavItem = {
    name: string
    path: string
    icon: Component
    subject?: string
    menuItems?: NavItem[]
}

const navigations = computed<NavItem[]>(() => [

    {
        name: t('nav.admin'),
        path: '/admin',
        icon: h('i', { class: 'fa-solid fa-gear text-neutral-700 ' }),
        menuItems: [
            {
                name: t('nav.manageUsers'),
                path: '/admin/users',
                subject: 'users',
                icon: h('i', { class: 'fa-solid fa-users text-neutral-700 ' })
            },
            {
                name: t('nav.permissionGroups'),
                path: '/admin/permissions/roles',
                subject: 'permissions',
                icon: h('i', { class: 'fa-solid fa-shield-halved text-neutral-700 ' })
            },
            {
                        name: t('nav.organizationTree'),
                        path: '/admin/org-tree',
                        subject: 'teams',
                        icon: h('i', { class: 'fa-solid fa-sitemap text-neutral-700 ' })
            }
        ]
    },
    {
        name: t('nav.documents'),
        path: '/plan/documents',
        subject: 'documents',
        icon: h('i', { class: 'fa-solid fa-file-lines text-neutral-700 ' })
    },
    {
        name: t('nav.standards'),
        path: '/plan/standards',
        subject: 'standards',
        icon: h('i', { class: 'fa-solid fa-certificate text-neutral-700 ' })
    },
])

const canSeeNavItem = (item: NavItem) => {
    if (!item.subject) return true
    return authStore.hasPermissions({
        subject: item.subject,
        actions: ['read', 'read_own']
    })
}

const visibleNavigations = computed(() =>
    navigations.value.filter((item) => {
        if (!canSeeNavItem(item)) return false
        if (!item.menuItems?.length) return true
        return item.menuItems.some(
            (child) => canSeeNavItem(child) && child.subject !== 'dashboards'
        )
    })
)

const visibleMenuItems = (item: NavItem) =>
    (item.menuItems || []).filter((child) => canSeeNavItem(child))
</script>
