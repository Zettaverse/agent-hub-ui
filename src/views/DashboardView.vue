<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useDashboardStore } from '@/stores/dashboard'

const POLL_INTERVAL_MS = 5000

const store = useDashboardStore()

interface Card {
  title: string
  value: string
  detail: string
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(1)} ${units[unit]}`
}

const cards = computed<Card[]>(() => [
  {
    title: 'Agents',
    value: `${store.snapshot.agents.online} / ${store.snapshot.agents.total}`,
    detail: 'online / total',
  },
  {
    title: 'MCP Servers',
    value: `${store.snapshot.mcp_servers.connected} / ${store.snapshot.mcp_servers.total}`,
    detail: 'connected / total',
  },
  {
    title: 'Active Flows',
    value: String(store.snapshot.active_flows),
    detail: 'running',
  },
  {
    title: 'CPU',
    value: `${store.snapshot.system.cpu.toFixed(1)}%`,
    detail: 'load',
  },
  {
    title: 'Memory',
    value: formatBytes(store.snapshot.system.memory),
    detail: 'in use',
  },
  {
    title: 'Goroutines',
    value: String(store.snapshot.system.goroutines),
    detail: 'active',
  },
])

let timer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  void store.fetchSnapshot()
  timer = setInterval(() => void store.fetchSnapshot(), POLL_INTERVAL_MS)
})

onUnmounted(() => {
  if (timer !== undefined) {
    clearInterval(timer)
  }
})
</script>

<template>
  <div class="p-6">
    <h1 class="mb-6 text-2xl font-semibold text-white">Dashboard</h1>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="card in cards" :key="card.title" class="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <div class="text-sm text-slate-400">{{ card.title }}</div>
        <div class="mt-2 text-3xl font-semibold text-white">{{ card.value }}</div>
        <div class="mt-1 text-xs text-slate-500">{{ card.detail }}</div>
      </div>
    </div>
  </div>
</template>
