import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  fetchSnapshot: vi.fn(),
  fetchHistory: vi.fn(),
}))

vi.mock('@/stores/dashboard', () => ({
  useDashboardStore: () => ({
    snapshot: {
      agents: { online: 1, total: 3 },
      mcp_servers: { connected: 2, total: 4 },
      active_flows: 12,
      system: { cpu: 42.5, memory: 10485760, goroutines: 99 },
      runs_by_status: { success: 3, failed: 1, rolled_back: 0, pending: 0, running: 1 },
      tasks_by_status: { success: 1, failed: 0, pending: 0, running: 2 },
      websocket_clients: 7,
    },
    history: [],
    loading: false,
    error: null,
    fetchSnapshot: mocks.fetchSnapshot,
    fetchHistory: mocks.fetchHistory,
  }),
}))

vi.mock('@/stores/theme', () => ({
  useThemeStore: () => ({ isDark: false }),
}))

vi.mock('@/components/charts/AppChart.vue', () => ({
  default: { name: 'AppChart', render: () => null },
}))

import DashboardView from '@/views/DashboardView.vue'

describe('DashboardView', () => {
  it('renders hero KPIs, chart cards and status donuts from the store snapshot', () => {
    const wrapper = mount(DashboardView)
    const text = wrapper.text()

    // Hero KPI row.
    expect(text).toContain('Agents')
    expect(text).toContain('1 / 3')
    expect(text).toContain('MCP Servers')
    expect(text).toContain('2 / 4')
    expect(text).toContain('Active Flows')
    expect(text).toContain('12')
    expect(text).toContain('WS Clients')
    expect(text).toContain('7')

    // Time-series chart cards (history is empty → empty-state message).
    expect(text).toContain('CPU')
    expect(text).toContain('42.5%')
    expect(text).toContain('Memory')
    expect(text).toContain('10.0 MB')
    expect(text).toContain('Goroutines')
    expect(text).toContain('99')
    expect(text).toContain('Waiting for telemetry…')

    // Status donut panels.
    expect(text).toContain('Run Status')
    expect(text).toContain('Task Status')

    expect(mocks.fetchSnapshot).toHaveBeenCalledTimes(1)
    expect(mocks.fetchHistory).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })
})
