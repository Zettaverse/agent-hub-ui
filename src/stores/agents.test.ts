import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { setApiClient } from '@/lib/api'
import { createMockApi } from '@/test/mockApi'
import { useAgentsStore, type Agent } from '@/stores/agents'

const agent: Agent = {
  id: 'a1',
  name: 'Researcher',
  profile: 'Does research',
  system_prompt: 'You are a researcher.',
  skills: ['search', 'summarize'],
}

describe('useAgentsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('fetchAgents lists agents', async () => {
    const api = createMockApi()
    api.get.mockResolvedValue([agent])
    setApiClient(api)

    const store = useAgentsStore()
    const result = await store.fetchAgents()

    expect(api.get).toHaveBeenCalledWith('/agents')
    expect(result).toEqual([agent])
    expect(store.agents).toEqual([agent])
  })

  it('createAgent posts the input and appends the created agent', async () => {
    const api = createMockApi()
    api.post.mockResolvedValue(agent)
    setApiClient(api)

    const store = useAgentsStore()
    const input = { name: 'Researcher', profile: 'p', system_prompt: 's', skills: ['search'] }
    const created = await store.createAgent(input)

    expect(api.post).toHaveBeenCalledWith('/agents', input)
    expect(created).toEqual(agent)
    expect(store.agents).toEqual([agent])
  })

  it('updateAgent PUTs to the agent endpoint and replaces the entry', async () => {
    const api = createMockApi()
    const updated = { ...agent, name: 'Researcher v2' }
    api.put.mockResolvedValue(updated)
    setApiClient(api)

    const store = useAgentsStore()
    store.agents = [agent]
    await store.updateAgent('a1', { name: 'Researcher v2' })

    expect(api.put).toHaveBeenCalledWith('/agents/a1', { name: 'Researcher v2' })
    expect(store.agents).toEqual([updated])
  })

  it('deleteAgent deletes and removes the agent from the list', async () => {
    const api = createMockApi()
    api.delete.mockResolvedValue(undefined)
    setApiClient(api)

    const store = useAgentsStore()
    store.agents = [agent]
    await store.deleteAgent('a1')

    expect(api.delete).toHaveBeenCalledWith('/agents/a1')
    expect(store.agents).toEqual([])
  })

  it('fetchAgents records errors and rethrows', async () => {
    const api = createMockApi()
    api.get.mockRejectedValue(new Error('boom'))
    setApiClient(api)

    const store = useAgentsStore()
    await expect(store.fetchAgents()).rejects.toThrow('boom')
    expect(store.error).toBe('boom')
  })
})
