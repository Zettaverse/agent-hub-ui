import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { Agent } from '@/stores/agents'

const mocks = vi.hoisted(() => {
  const send = vi.fn()
  const fetchAgents = vi.fn()

  let agents: Agent[] = [
    { id: 'a1', name: 'Researcher', profile: 'p', system_prompt: 's', skills: [] },
    { id: 'a2', name: 'Writer', profile: 'p', system_prompt: 's', skills: [] },
  ]

  const state: { instance: { onMessage: ((message: string) => void) | null } | null } = {
    instance: null,
  }

  class FakeConsoleClient {
    onMessage: ((message: string) => void) | null = null
    onStatus: ((status: string) => void) | null = null

    constructor() {
      state.instance = this
    }

    connect(): void {
      // no-op in tests
    }

    send(text: string): void {
      send(text)
    }

    close(): void {
      // no-op in tests
    }
  }

  return { send, fetchAgents, state, FakeConsoleClient, getAgents: () => agents, setAgents: (next: Agent[]) => { agents = next } }
})

vi.mock('@/lib/console', () => ({
  ConsoleClient: mocks.FakeConsoleClient,
}))

vi.mock('@/stores/agents', () => ({
  useAgentsStore: () => ({
    agents: mocks.getAgents(),
    loading: false,
    error: null,
    fetchAgents: mocks.fetchAgents,
  }),
}))

import ConsoleView from '@/views/ConsoleView.vue'

describe('ConsoleView', () => {
  beforeEach(() => {
    mocks.send.mockClear()
    mocks.fetchAgents.mockClear()
    mocks.fetchAgents.mockResolvedValue(mocks.getAgents())
    mocks.setAgents([
      { id: 'a1', name: 'Researcher', profile: 'p', system_prompt: 's', skills: [] },
      { id: 'a2', name: 'Writer', profile: 'p', system_prompt: 's', skills: [] },
    ])
    mocks.state.instance = null
  })

  it('default-selects the first agent when none is enabled', async () => {
    const wrapper = mount(ConsoleView)
    await flushPromises()

    expect(mocks.fetchAgents).toHaveBeenCalledTimes(1)
    const select = wrapper.find('select')
    expect((select.element as HTMLSelectElement).value).toBe('a1')

    wrapper.unmount()
  })

  it('default-selects the first enabled agent when one is enabled', async () => {
    mocks.setAgents([
      { id: 'a1', name: 'Researcher', profile: 'p', system_prompt: 's', skills: [], enabled: false },
      { id: 'a2', name: 'Writer', profile: 'p', system_prompt: 's', skills: [], enabled: true },
    ])

    const wrapper = mount(ConsoleView)
    await flushPromises()

    const select = wrapper.find('select')
    expect((select.element as HTMLSelectElement).value).toBe('a2')

    wrapper.unmount()
  })

  it('sends a chat JSON message for the selected agent and renders the server user echo', async () => {
    const wrapper = mount(ConsoleView)
    await flushPromises()

    await wrapper.find('input').setValue('hello world')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(mocks.send).toHaveBeenCalledTimes(1)
    const sent = JSON.parse(mocks.send.mock.calls[0][0] as string) as Record<string, unknown>
    expect(sent).toEqual({ type: 'chat', agent_id: 'a1', content: 'hello world' })

    // The UI must not echo the user message locally (that would duplicate it
    // once the server broadcast arrives).
    expect(wrapper.text()).not.toContain('hello world')

    // The server echoes the user turn back; the UI renders it once.
    const instance = mocks.state.instance
    instance?.onMessage?.(
      JSON.stringify({
        type: 'agent_message',
        tenant: 't1',
        payload: { role: 'user', content: 'hello world', agent_id: 'a1' },
        time: '2026-08-28T00:00:00.000Z',
      }),
    )
    await flushPromises()

    expect(wrapper.text()).toContain('hello world')

    wrapper.unmount()
  })

  it('extracts payload.role and payload.content from a broadcast message', async () => {
    const wrapper = mount(ConsoleView)
    await flushPromises()

    const instance = mocks.state.instance
    expect(instance).not.toBeNull()

    instance?.onMessage?.(
      JSON.stringify({
        type: 'agent_message',
        tenant: 't1',
        payload: { role: 'assistant', content: 'Hello **there**', agent_id: 'a1' },
        time: '2026-08-28T00:00:00.000Z',
      }),
    )
    await flushPromises()

    expect(wrapper.text()).toContain('assistant')
    expect(wrapper.text()).toContain('Hello')
    expect(wrapper.text()).toContain('there')

    wrapper.unmount()
  })

  it('shows a typing indicator while pending and clears it when the assistant replies', async () => {
    const wrapper = mount(ConsoleView)
    await flushPromises()

    await wrapper.find('input').setValue('hello')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('typing')

    const sendButton = wrapper.find('button[type="submit"]')
    expect(sendButton.attributes('disabled')).toBeDefined()

    const instance = mocks.state.instance
    instance?.onMessage?.(
      JSON.stringify({
        type: 'agent_message',
        tenant: 't1',
        payload: { role: 'assistant', content: 'hi back', agent_id: 'a1' },
        time: '2026-08-28T00:00:01.000Z',
      }),
    )
    await flushPromises()

    expect(wrapper.text()).not.toContain('typing')
    expect(wrapper.text()).toContain('hi back')

    wrapper.unmount()
  })
})
