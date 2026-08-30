import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { setApiClient } from '@/lib/api'
import { createMockApi } from '@/test/mockApi'
import { useDashboardStore, type DashboardHistorySample, type DashboardSnapshot } from '@/stores/dashboard'

const snapshot: DashboardSnapshot = {
  agents: { online: 3, total: 5 },
  mcp_servers: { connected: 1, total: 2 },
  active_flows: 4,
  system: { cpu: 42.5, memory: 10485760, goroutines: 99 },
  runs_by_status: { success: 3, failed: 1, rolled_back: 0, pending: 0, running: 1 },
  tasks_by_status: { success: 1, failed: 0, pending: 0, running: 2 },
  websocket_clients: 7,
}

const historySample: DashboardHistorySample = {
  time: 1700000000123,
  cpu: 12.34,
  memory: 10485760,
  goroutines: 42,
  websocket_clients: 0,
}

describe('useDashboardStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with an empty snapshot', () => {
    const store = useDashboardStore()
    expect(store.snapshot).toEqual({
      agents: { online: 0, total: 0 },
      mcp_servers: { connected: 0, total: 0 },
      active_flows: 0,
      system: { cpu: 0, memory: 0, goroutines: 0 },
      runs_by_status: { success: 0, failed: 0, rolled_back: 0, pending: 0, running: 0 },
      tasks_by_status: { success: 0, failed: 0, pending: 0, running: 0 },
      websocket_clients: 0,
    })
  })

  it('starts with empty history', () => {
    const store = useDashboardStore()
    expect(store.history).toEqual([])
  })

  it('fetchSnapshot loads the dashboard snapshot', async () => {
    const api = createMockApi()
    api.get.mockResolvedValue(snapshot)
    setApiClient(api)

    const store = useDashboardStore()
    const result = await store.fetchSnapshot()

    expect(api.get).toHaveBeenCalledWith('/dashboard')
    expect(result).toEqual(snapshot)
    expect(store.snapshot).toEqual(snapshot)
  })

  it('fetchSnapshot records errors and rethrows', async () => {
    const api = createMockApi()
    api.get.mockRejectedValue(new Error('down'))
    setApiClient(api)

    const store = useDashboardStore()
    await expect(store.fetchSnapshot()).rejects.toThrow('down')
    expect(store.error).toBe('down')
  })

  it('fetchHistory loads history samples', async () => {
    const api = createMockApi()
    api.get.mockResolvedValue({ samples: [historySample] })
    setApiClient(api)

    const store = useDashboardStore()
    const result = await store.fetchHistory()

    expect(api.get).toHaveBeenCalledWith('/dashboard/history')
    expect(result).toEqual([historySample])
    expect(store.history).toEqual([historySample])
  })

  it('fetchHistory tolerates a missing samples array', async () => {
    const api = createMockApi()
    api.get.mockResolvedValue({})
    setApiClient(api)

    const store = useDashboardStore()
    const result = await store.fetchHistory()

    expect(result).toEqual([])
    expect(store.history).toEqual([])
  })

  it('fetchHistory swallows a failed request and keeps history empty', async () => {
    const api = createMockApi()
    api.get.mockRejectedValue(new Error('down'))
    setApiClient(api)

    const store = useDashboardStore()
    const result = await store.fetchHistory()

    expect(result).toEqual([])
    expect(store.history).toEqual([])
  })
})
