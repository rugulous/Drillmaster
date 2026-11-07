import { createRouter, createWebHistory } from "vue-router";
import Rehearsal from "./views/Rehearsal.vue";
import Editor from "./views/Editor.vue";

const routes = [
  {
    path: "/",
    component: Rehearsal,
    name: "main",
  },
];

if (import.meta.env.DEV) {
  routes.push({
    path: "/edit",
    component: Editor,
    name: "edit",
  });
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
