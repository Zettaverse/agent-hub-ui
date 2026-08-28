import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'dashboard', component: () => import('@/views/DashboardView.vue') },
  { path: '/agents', name: 'agents', component: () => import('@/views/AgentsView.vue') },
  { path: '/mcp-servers', name: 'mcp-servers', component: () => import('@/views/McpServersView.vue') },
  { path: '/flows', name: 'flows', component: () => import('@/views/FlowsView.vue') },
  { path: '/flows/:id', name: 'flow-editor', component: () => import('@/views/FlowEditorView.vue') },
  { path: '/tasks', name: 'tasks', component: () => import('@/views/TasksView.vue') },
  { path: '/console', name: 'console', component: () => import('@/views/ConsoleView.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
