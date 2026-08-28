import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { setApiClient } from '@/lib/api'
import { createMockApi } from '@/test/mockApi'
import { useMcpServersStore, type McpServer } from '@/stores/mcpServers'

const server: McpServer = {
  id: 's1',
  name: 'postgres',
  transport: 'stdio',
  command: 'mcp-postgres',
  args: ['--db', 'hub'],
  status: 'connected',
}

describe('useMcpServersStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('fetchMcpServers lists servers', async () => {
    const api = createMockApi()
    api.get.mockResolvedValue([server])
    setApiClient(api)

    const store = useMcpServersStore()
    await store.fetchMcpServers()

    expect(api.get).toHaveBeenCalledWith('/mcp-servers')
    expect(store.servers).toEqual([server])
  })

  it('createMcpServer posts a stdio server', async () => {
    const api = createMockApi()
    api.post.mockResolvedValue(server)
    setApiClient(api)

    const store = useMcpServersStore()
    const input = { name: 'postgres', transport: 'stdio' as const, command: 'mcp-postgres', args: ['--db', 'hub'] }
    await store.createMcpServer(input)

    expect(api.post).toHaveBeenCalledWith('/mcp-servers', input)
    expect(store.servers).toEqual([server])
  })

  it('updateMcpServer PUTs the update', async () => {
    const api = createMockApi()
    const updated = { ...server, url: 'ws://localhost:9000', transport: 'websocket' as const }
    api.put.mockResolvedValue(updated)
    setApiClient(api)

    const store = useMcpServersStore()
    store.servers = [server]
    await store.updateMcpServer('s1', { url: 'ws://localhost:9000', transport: 'websocket' })

    expect(api.put).toHaveBeenCalledWith('/mcp-servers/s1', { url: 'ws://localhost:9000', transport: 'websocket' })
    expect(store.servers).toEqual([updated])
  })

  it('deleteMcpServer deletes the server', async () => {
    const api = createMockApi()
    api.delete.mockResolvedValue(undefined)
    setApiClient(api)

    const store = useMcpServersStore()
    store.servers = [server]
    await store.deleteMcpServer('s1')

    expect(api.delete).toHaveBeenCalledWith('/mcp-servers/s1')
    expect(store.servers).toEqual([])
  })

  it('testMcpServer POSTs the test endpoint and returns the result', async () => {
    const api = createMockApi()
    api.post.mockResolvedValue({ ok: true, message: 'ok' })
    setApiClient(api)

    const store = useMcpServersStore()
    const result = await store.testMcpServer('s1')

    expect(api.post).toHaveBeenCalledWith('/mcp-servers/s1/test')
    expect(result).toEqual({ ok: true, message: 'ok' })
    expect(store.testing['s1']).toBe(false)
  })
})
