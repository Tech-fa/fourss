export const usersRoutes = [
  {
    path: "/admin/users",
    component: () => import("./mainView.vue"),
    meta: {
      subject: "users",
      actions: ["read"],
    },
  },

  {
    path: "/admin/users/:userId/edit",
    component: () => import("./AddUser.vue"),
    meta: {
      subject: "users",
      actions: ["update"],
    },
  },

  {
    path: "/admin/users/:userId",
    component: () => import("./viewUser.vue"),
    meta: {
      subject: "users",
      actions: ["read"],
    },
  },
  {
    path: "/admin/users/add",
    component: () => import("./AddUser.vue"),
    meta: {
      subject: "users",
      actions: ["create"],
    },
  },
];
