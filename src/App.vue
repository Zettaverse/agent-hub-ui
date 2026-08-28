<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router'

const route = useRoute()

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
    </aside>
    <main class="min-w-0 flex-1 overflow-auto">
      <RouterView />
    </main>
  </div>
</template>
