import AddUser from "./AddUser.vue";
import MainView from "./mainView.vue";
import ViewUser from "./viewUser.vue";

export const usersRoutes = [
  {
    path: "/admin/users",
    component: MainView,
    meta: {
      subject: "users",
      actions: ["read"],
    },
  },

  {
    path: "/admin/users/:userId/edit",
    component: AddUser,
    meta: {
      subject: "users",
      actions: ["update"],
    },
  },

  {
    path: "/admin/users/:userId",
    component: ViewUser,
    meta: {
      subject: "users",
      actions: ["read"],
    },
  },
  {
    path: "/admin/users/add",
    component: AddUser,
    meta: {
      subject: "users",
      actions: ["create"],
    },
  },
];
