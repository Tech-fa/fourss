import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import HomeView from "@/components/HomeView.vue";
import { orgUnitTypeRoutes } from "@/components/admin/organization/routes";
import { AuthRoutes } from "@/components/auth/routes";
import { usersRoutes } from "@/components/admin/users/routes";
import { ref } from "vue";
import { permissionsRoutes } from "@/components/admin/permissions/routes";
import { documentRoutes } from "@/components/document/routes";
import ProfileView from "@/components/profile/Profile.vue";
import NotificationsView from "@/components/UserNotification.vue";

export const isRouteChanging = ref(false);

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      component: HomeView,
      children: [
        { path: "", redirect: "/plan/documents" },
        { path: "profile", name: "Profile", component: ProfileView },
        {
          path: "notifications",
          name: "Notifications",
          component: NotificationsView,
        },
        ...orgUnitTypeRoutes,
        ...usersRoutes,
        ...permissionsRoutes,
        ...documentRoutes,
      ],
    },
    {
      path: "/:catchAll(.*)",
      name: "NotFound",
      component: () => import("../components/NotFound.vue"),
    },
    ...AuthRoutes,
  ],
});

router.beforeEach(async (to) => {
  isRouteChanging.value = true;
  const authStore = useAuthStore();
  if (
    !authStore.state.isLoggedIn &&
    !AuthRoutes.map((route) => route.name).includes(to.name as string)
  ) {
    return {
      name: "Login",
      query: { redirect: to.fullPath },
    };
  }
  if (to.meta.actions) {
    const subjects = (to.meta.subjects as string[]) || [
      to.meta.subject as string,
    ];
    if (
      !subjects.some((subject) =>
        authStore.hasPermissions({
          subject: subject as string,
          actions: to.meta.actions as string[],
        }),
      )
    ) {
      return { name: "Login" };
    }
  }
});

router.afterEach(() => {
  isRouteChanging.value = false;
});

export default router;
