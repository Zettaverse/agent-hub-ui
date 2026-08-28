import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/lib/api'
import type { Flow } from '@/lib/flow'

export interface FlowRunResult {
  run_id: string
  status: string
}

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export const useFlowsStore = defineStore('flows', () => {
  const flows = ref<Flow[]>([])
  const currentFlow = ref<Flow | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const knownIds = ref<Set<string>>(new Set())

  async function fetchFlows(): Promise<Flow[]> {
    loading.value = true
    error.value = null
    try {
      flows.value = await useApi().get<Flow[]>('/flows')
      knownIds.value = new Set(flows.value.map((flow) => flow.id))
      return flows.value
    } catch (err) {
      error.value = toErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchFlow(id: string): Promise<Flow> {
    loading.value = true
    error.value = null
    try {
      const flow = await useApi().get<Flow>(`/flows/${id}`)
      currentFlow.value = flow
      knownIds.value = new Set(knownIds.value).add(id)
      return flow
    } catch (err) {
      error.value = toErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  function setCurrentFlow(flow: Flow | null): void {
    currentFlow.value = flow
  }

  async function saveFlow(flow: Flow): Promise<Flow> {
    loading.value = true
    error.value = null
    try {
      if (knownIds.value.has(flow.id)) {
        const updated = await useApi().put<Flow>(`/flows/${flow.id}`, flow)
        flows.value = flows.value.map((existing) => (existing.id === flow.id ? updated : existing))
        currentFlow.value = updated
        return updated
      }

      const created = await useApi().post<Flow>('/flows', flow)
      flows.value = [...flows.value, created]
      currentFlow.value = created
      knownIds.value = new Set(knownIds.value).add(created.id)
      return created
    } catch (err) {
      error.value = toErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function runFlow(id: string): Promise<FlowRunResult> {
    loading.value = true
    error.value = null
    try {
      return await useApi().post<FlowRunResult>(`/flows/${id}/run`)
    } catch (err) {
      error.value = toErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return { flows, currentFlow, loading, error, fetchFlows, fetchFlow, setCurrentFlow, saveFlow, runFlow }
})
