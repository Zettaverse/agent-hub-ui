import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { setApiClient } from '@/lib/api'
import { createMockApi } from '@/test/mockApi'
import { useDashboardStore, type DashboardSnapshot } from '@/stores/dashboard'

const snapshot: DashboardSnapshot = {
  agents: { online: 3, total: 5 },
  mcp_servers: { connected: 1, total: 2 },
  active_flows: 4,
  system: { cpu: 42.5, memory: 1024, goroutines: 99 },
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
    })
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
})
