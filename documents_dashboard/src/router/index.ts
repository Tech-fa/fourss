import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { orgUnitTypeRoutes } from "@/components/admin/organization/routes";
import { AuthRoutes } from "@/components/auth/routes";
import { usersRoutes } from "@/components/admin/users/routes";
import { ref } from "vue";
import { permissionsRoutes } from "@/components/admin/permissions/routes";
import { documentRoutes } from "@/components/document/routes";

export const isRouteChanging = ref(false);

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      component: () => import("@/components/HomeView.vue"),
      children: [
        { path: "", redirect: "/plan/documents" },
        { path: "profile", name: "Profile", component: () => import("@/components/profile/Profile.vue") },
        {
          path: "notifications",
          name: "Notifications",
          component: () => import("@/components/UserNotification.vue"),
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
