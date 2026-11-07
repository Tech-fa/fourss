export const usersRoutes = [
  {
    path: "/admin/users",
    component: () => import("./mainView.vue"),
    meta: {
      subject: "users",
      actions: ["read"],
      purpose: "List people in the organization.",
    },
  },

  {
    path: "/admin/users/:userId/edit",
    component: () => import("./AddUser.vue"),
    meta: {
      subject: "users",
      actions: ["update"],
      purpose: "Change a person's account.",
    },
  },

  {
    path: "/admin/users/:userId",
    component: () => import("./viewUser.vue"),
    meta: {
      subject: "users",
      actions: ["read"],
      purpose: "Read a person's account.",
    },
  },
  {
    path: "/admin/users/add",
    component: () => import("./AddUser.vue"),
    meta: {
      subject: "users",
      actions: ["create"],
      purpose: "Invite or create a person.",
    },
  },
];
