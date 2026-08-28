import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/lib/api'

export interface DashboardAgents {
  online: number
  total: number
}

export interface DashboardMcpServers {
  connected: number
  total: number
}

export interface DashboardSystem {
  cpu: number
  memory: number
  goroutines: number
}

export interface DashboardSnapshot {
  agents: DashboardAgents
  mcp_servers: DashboardMcpServers
  active_flows: number
  system: DashboardSystem
}

const EMPTY_SNAPSHOT: DashboardSnapshot = {
  agents: { online: 0, total: 0 },
  mcp_servers: { connected: 0, total: 0 },
  active_flows: 0,
  system: { cpu: 0, memory: 0, goroutines: 0 },
}

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export const useDashboardStore = defineStore('dashboard', () => {
  const snapshot = ref<DashboardSnapshot>({ ...EMPTY_SNAPSHOT })
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchSnapshot(): Promise<DashboardSnapshot> {
    loading.value = true
    error.value = null
    try {
      snapshot.value = await useApi().get<DashboardSnapshot>('/dashboard')
      return snapshot.value
    } catch (err) {
      error.value = toErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return { snapshot, loading, error, fetchSnapshot }
})
