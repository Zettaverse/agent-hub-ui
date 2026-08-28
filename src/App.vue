<script setup lang="ts">
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/agents', label: 'Agents' },
  { to: '/mcp-servers', label: 'MCP Servers' },
  { to: '/flows', label: 'Flows' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/console', label: 'Console' },
]

function isActive(to: string): boolean {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(`${to}/`)
}

function logout(): void {
  auth.logout()
  void router.push('/login')
}
</script>

<template>
  <div class="flex h-screen bg-slate-950 text-slate-100">
    <aside class="w-56 shrink-0 border-r border-slate-800 bg-slate-900 p-4">
      <div class="mb-6 text-lg font-semibold text-white">Agent Hub</div>
      <nav class="flex flex-col gap-1">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="rounded px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          :class="{ 'bg-slate-800 text-white': isActive(item.to) }"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
      <button
        class="mt-6 w-full rounded border border-slate-700 px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
        @click="logout"
      >
        Sign out
      </button>
    </aside>
    <main class="min-w-0 flex-1 overflow-auto">
      <RouterView />
    </main>
  </div>
</template>
