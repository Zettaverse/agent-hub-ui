import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/lib/api'

export interface Agent {
  id: string
  name: string
  profile: string
  system_prompt: string
  skills: string[]
}

export interface AgentInput {
  name: string
  profile: string
  system_prompt: string
  skills: string[]
}

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export const useAgentsStore = defineStore('agents', () => {
  const agents = ref<Agent[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAgents(): Promise<Agent[]> {
    loading.value = true
    error.value = null
    try {
      agents.value = await useApi().get<Agent[]>('/agents')
      return agents.value
    } catch (err) {
      error.value = toErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createAgent(input: AgentInput): Promise<Agent> {
    loading.value = true
    error.value = null
    try {
      const created = await useApi().post<Agent>('/agents', input)
      agents.value = [...agents.value, created]
      return created
    } catch (err) {
      error.value = toErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateAgent(id: string, input: Partial<AgentInput>): Promise<Agent> {
    loading.value = true
    error.value = null
    try {
      const updated = await useApi().put<Agent>(`/agents/${id}`, input)
      agents.value = agents.value.map((agent) => (agent.id === id ? updated : agent))
      return updated
    } catch (err) {
      error.value = toErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteAgent(id: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await useApi().delete<void>(`/agents/${id}`)
      agents.value = agents.value.filter((agent) => agent.id !== id)
    } catch (err) {
      error.value = toErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return { agents, loading, error, fetchAgents, createAgent, updateAgent, deleteAgent }
})
