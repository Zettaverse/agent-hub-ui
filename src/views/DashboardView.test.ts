import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  fetchSnapshot: vi.fn(),
}))

vi.mock('@/stores/dashboard', () => ({
  useDashboardStore: () => ({
    snapshot: {
      agents: { online: 3, total: 5 },
      mcp_servers: { connected: 1, total: 2 },
      active_flows: 4,
      system: { cpu: 42.5, memory: 1024, goroutines: 99 },
    },
    fetchSnapshot: mocks.fetchSnapshot,
  }),
}))

import DashboardView from '@/views/DashboardView.vue'

describe('DashboardView', () => {
  it('renders cards from the store snapshot', () => {
    const wrapper = mount(DashboardView)
    const text = wrapper.text()

    expect(text).toContain('Agents')
    expect(text).toContain('3 / 5')
    expect(text).toContain('MCP Servers')
    expect(text).toContain('1 / 2')
    expect(text).toContain('Active Flows')
    expect(text).toContain('4')
    expect(text).toContain('CPU')
    expect(text).toContain('42.5%')
    expect(text).toContain('Memory')
    expect(text).toContain('1.0 KB')
    expect(text).toContain('Goroutines')
    expect(text).toContain('99')

    expect(mocks.fetchSnapshot).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })
})
