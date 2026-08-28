import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/lib/api'

export type McpTransport = 'stdio' | 'websocket'

export interface McpServer {
  id: string
  name: string
  transport: McpTransport
  command?: string
  args?: string[]
  url?: string
  status?: string
}

export interface McpServerInput {
  name: string
  transport: McpTransport
  command?: string
  args?: string[]
  url?: string
}

export interface McpTestResult {
  ok: boolean
  message?: string
}

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export const useMcpServersStore = defineStore('mcp-servers', () => {
  const servers = ref<McpServer[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const testing = ref<Record<string, boolean>>({})

  async function fetchMcpServers(): Promise<McpServer[]> {
    loading.value = true
    error.value = null
    try {
      servers.value = await useApi().get<McpServer[]>('/mcp-servers')
      return servers.value
    } catch (err) {
      error.value = toErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createMcpServer(input: McpServerInput): Promise<McpServer> {
    loading.value = true
    error.value = null
    try {
      const created = await useApi().post<McpServer>('/mcp-servers', input)
      servers.value = [...servers.value, created]
      return created
    } catch (err) {
      error.value = toErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateMcpServer(id: string, input: Partial<McpServerInput>): Promise<McpServer> {
    loading.value = true
    error.value = null
    try {
      const updated = await useApi().put<McpServer>(`/mcp-servers/${id}`, input)
      servers.value = servers.value.map((server) => (server.id === id ? updated : server))
      return updated
    } catch (err) {
      error.value = toErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteMcpServer(id: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await useApi().delete<void>(`/mcp-servers/${id}`)
      servers.value = servers.value.filter((server) => server.id !== id)
    } catch (err) {
      error.value = toErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function testMcpServer(id: string): Promise<McpTestResult> {
    testing.value = { ...testing.value, [id]: true }
    error.value = null
    try {
      return await useApi().post<McpTestResult>(`/mcp-servers/${id}/test`)
    } catch (err) {
      error.value = toErrorMessage(err)
      throw err
    } finally {
      testing.value = { ...testing.value, [id]: false }
    }
  }

  return {
    servers,
    loading,
    error,
    testing,
    fetchMcpServers,
    createMcpServer,
    updateMcpServer,
    deleteMcpServer,
    testMcpServer,
  }
})
