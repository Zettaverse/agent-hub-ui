import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { setApiClient } from '@/lib/api'
import { createMockApi } from '@/test/mockApi'
import { createEmptyFlow, type Flow } from '@/lib/flow'
import { useFlowsStore } from '@/stores/flows'

function makeFlow(id: string, name = 'Flow'): Flow {
  const flow = createEmptyFlow(name)
  flow.id = id
  return flow
}

describe('useFlowsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('fetchFlows lists flows', async () => {
    const flow = makeFlow('f1')
    const api = createMockApi()
    api.get.mockResolvedValue([flow])
    setApiClient(api)

    const store = useFlowsStore()
    await store.fetchFlows()

    expect(api.get).toHaveBeenCalledWith('/flows')
    expect(store.flows).toEqual([flow])
  })

  it('fetchFlow loads a single flow into currentFlow', async () => {
    const flow = makeFlow('f1')
    const api = createMockApi()
    api.get.mockResolvedValue(flow)
    setApiClient(api)

    const store = useFlowsStore()
    const result = await store.fetchFlow('f1')

    expect(api.get).toHaveBeenCalledWith('/flows/f1')
    expect(result).toEqual(flow)
    expect(store.currentFlow).toEqual(flow)
  })

  it('saveFlow creates a new flow with POST', async () => {
    const flow = makeFlow('new-flow')
    const api = createMockApi()
    api.post.mockResolvedValue(flow)
    setApiClient(api)

    const store = useFlowsStore()
    const result = await store.saveFlow(flow)

    expect(api.post).toHaveBeenCalledWith('/flows', flow)
    expect(result).toEqual(flow)
    expect(store.currentFlow).toEqual(flow)
    expect(store.flows).toEqual([flow])
  })

  it('saveFlow updates an existing flow with PUT', async () => {
    const flow = makeFlow('f1')
    const api = createMockApi()
    api.get.mockResolvedValue([flow])
    api.put.mockResolvedValue(flow)
    setApiClient(api)

    const store = useFlowsStore()
    await store.fetchFlows()
    await store.saveFlow(flow)

    expect(api.put).toHaveBeenCalledWith('/flows/f1', flow)
  })

  it('runFlow POSTs the run endpoint', async () => {
    const api = createMockApi()
    api.post.mockResolvedValue({ run_id: 'r1', status: 'started' })
    setApiClient(api)

    const store = useFlowsStore()
    const result = await store.runFlow('f1')

    expect(api.post).toHaveBeenCalledWith('/flows/f1/run')
    expect(result).toEqual({ run_id: 'r1', status: 'started' })
  })
})
