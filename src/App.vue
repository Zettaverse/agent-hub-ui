<script setup lang="ts">
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import ThemeToggle from '@/components/ThemeToggle.vue'
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
  <div class="flex h-screen bg-[#F5F5F7] text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
    <aside class="w-56 shrink-0 border-r border-black/[0.05] bg-white/70 p-4 backdrop-blur-[20px] backdrop-saturate-150 dark:border-white/[0.06] dark:bg-slate-900/70">
      <div class="mb-6 text-lg font-semibold text-slate-900 dark:text-white">Agent Hub</div>
      <nav class="flex flex-col gap-1">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          :class="{ 'bg-slate-200/70 text-slate-900 dark:bg-slate-800 dark:text-white': isActive(item.to) }"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
      <div class="mt-4 flex justify-start px-1">
        <ThemeToggle />
      </div>
      <button
        class="mt-4 w-full rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
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
