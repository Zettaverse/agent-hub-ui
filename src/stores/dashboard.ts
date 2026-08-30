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

export interface RunStatusCounts {
  success: number
  failed: number
  rolled_back: number
  pending: number
  running: number
}

export interface TaskStatusCounts {
  success: number
  failed: number
  pending: number
  running: number
}

export interface DashboardSnapshot {
  agents: DashboardAgents
  mcp_servers: DashboardMcpServers
  active_flows: number
  system: DashboardSystem
  runs_by_status: RunStatusCounts
  tasks_by_status: TaskStatusCounts
  websocket_clients: number
}

export interface DashboardHistorySample {
  time: number
  cpu: number
  memory: number
  goroutines: number
  websocket_clients: number
}

export interface DashboardHistory {
  samples: DashboardHistorySample[]
}

const EMPTY_RUNS: RunStatusCounts = { success: 0, failed: 0, rolled_back: 0, pending: 0, running: 0 }
const EMPTY_TASKS: TaskStatusCounts = { success: 0, failed: 0, pending: 0, running: 0 }

const EMPTY_SNAPSHOT: DashboardSnapshot = {
  agents: { online: 0, total: 0 },
  mcp_servers: { connected: 0, total: 0 },
  active_flows: 0,
  system: { cpu: 0, memory: 0, goroutines: 0 },
  runs_by_status: { ...EMPTY_RUNS },
  tasks_by_status: { ...EMPTY_TASKS },
  websocket_clients: 0,
}

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export const useDashboardStore = defineStore('dashboard', () => {
  const snapshot = ref<DashboardSnapshot>({ ...EMPTY_SNAPSHOT })
  const history = ref<DashboardHistorySample[]>([])
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

  async function fetchHistory(): Promise<DashboardHistorySample[]> {
    try {
      const response = await useApi().get<DashboardHistory>('/dashboard/history')
      const samples = Array.isArray(response?.samples) ? response.samples : []
      history.value = samples
    } catch {
      // A failed history poll must not crash the dashboard; keep last known
      // samples (or empty) and let the next poll retry.
      history.value = []
    }
    return history.value
  }

  return { snapshot, history, loading, error, fetchSnapshot, fetchHistory }
})
