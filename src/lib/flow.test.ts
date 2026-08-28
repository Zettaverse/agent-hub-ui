import { describe, expect, it } from 'vitest'
import {
  FLOW_VERSION,
  NODE_TYPES,
  createEmptyFlow,
  defaultNodeData,
  flowToNodesEdges,
  isNodeType,
  nodesEdgesToFlow,
  validateFlow,
  type Flow,
  type FlowNode,
} from '@/lib/flow'

function trigger(id: string, x = 0): FlowNode {
  return { id, type: 'trigger', position: { x, y: 0 }, data: { kind: 'manual' } }
}

function agent(id: string, x = 0): FlowNode {
  return { id, type: 'agent', position: { x, y: 0 }, data: { agent_id: 'a1' } }
}

function condition(id: string, x = 0): FlowNode {
  return { id, type: 'condition', position: { x, y: 0 }, data: { expression: 'true' } }
}

function output(id: string, x = 0): FlowNode {
  return { id, type: 'output', position: { x, y: 0 }, data: { kind: 'database', config: {} } }
}

function edge(id: string, source: string, target: string, sourceHandle = 'out'): Flow['edges'][number] {
  return { id, source, source_handle: sourceHandle, target, target_handle: 'in' }
}

const schemaFlow: Flow = {
  version: 1,
  id: 'flow-uuid',
  name: 'My flow',
  nodes: [
    { id: 'n1', type: 'trigger', position: { x: 0, y: 0 }, data: { kind: 'manual' } },
    { id: 'n2', type: 'agent', position: { x: 100, y: 0 }, data: { agent_id: 'a1' } },
    {
      id: 'n3',
      type: 'mcp_tool',
      position: { x: 200, y: 0 },
      data: { server_id: 's1', tool: 'query_db', arguments: { q: '...' } },
    },
    { id: 'n4', type: 'condition', position: { x: 300, y: 0 }, data: { expression: 'result.rows.length > 0' } },
    { id: 'n5', type: 'output', position: { x: 400, y: 0 }, data: { kind: 'database', config: { table: 'logs' } } },
  ],
  edges: [
    { id: 'e1', source: 'n1', source_handle: 'out', target: 'n2', target_handle: 'in' },
    { id: 'e2', source: 'n2', source_handle: 'out', target: 'n3', target_handle: 'in' },
    { id: 'e3', source: 'n3', source_handle: 'out', target: 'n4', target_handle: 'in' },
    { id: 'e4', source: 'n4', source_handle: 'true', target: 'n5', target_handle: 'in' },
    { id: 'e5', source: 'n4', source_handle: 'false', target: 'n2', target_handle: 'in' },
  ],
  permissions: { resources: ['modbus://*'], files: ['/data/*'], databases: ['hub'] },
}

const validFlow: Flow = {
  version: 1,
  id: 'valid-flow',
  name: 'Valid flow',
  nodes: [
    trigger('n1', 0),
    agent('n2', 100),
    { id: 'n3', type: 'mcp_tool', position: { x: 200, y: 0 }, data: { server_id: 's1', tool: 't', arguments: {} } },
    condition('n4', 300),
    output('n5', 400),
    output('n6', 400),
  ],
  edges: [
    edge('e1', 'n1', 'n2'),
    edge('e2', 'n2', 'n3'),
    edge('e3', 'n3', 'n4'),
    edge('e4', 'n4', 'n5', 'true'),
    edge('e5', 'n4', 'n6', 'false'),
  ],
  permissions: { resources: [], files: [], databases: [] },
}

describe('validateFlow', () => {
  it('accepts a valid acyclic graph with a single trigger', () => {
    expect(validateFlow(validFlow)).toEqual([])
  })

  it('rejects a flow with no trigger', () => {
    const flow: Flow = { ...validFlow, nodes: validFlow.nodes.filter((n) => n.type !== 'trigger') }
    const errors = validateFlow(flow)
    expect(errors.some((e) => e.includes('trigger'))).toBe(true)
  })

  it('rejects a flow with multiple triggers', () => {
    const flow: Flow = { ...validFlow, nodes: [...validFlow.nodes, trigger('n7', 500)] }
    const errors = validateFlow(flow)
    expect(errors.some((e) => e.includes('exactly one trigger'))).toBe(true)
  })

  it('rejects a flow with a cycle (schema example has an n4 -> n2 back edge)', () => {
    const errors = validateFlow(schemaFlow)
    expect(errors).toContain('Flow contains a cycle.')
  })

  it('rejects dangling edges referencing missing nodes', () => {
    const flow: Flow = {
      ...validFlow,
      edges: [...validFlow.edges, edge('eX', 'n5', 'missing')],
    }
    const errors = validateFlow(flow)
    expect(errors.some((e) => e.includes('missing target node "missing"'))).toBe(true)
  })

  it('rejects edges whose source node is missing', () => {
    const flow: Flow = {
      ...validFlow,
      edges: [...validFlow.edges, edge('eY', 'ghost', 'n5')],
    }
    const errors = validateFlow(flow)
    expect(errors.some((e) => e.includes('missing source node "ghost"'))).toBe(true)
  })

  it('rejects unknown node types', () => {
    const flow: Flow = {
      ...validFlow,
      nodes: [...validFlow.nodes, { id: 'bad', type: 'banana', position: { x: 0, y: 0 }, data: {} } as unknown as FlowNode],
    }
    const errors = validateFlow(flow)
    expect(errors.some((e) => e.includes('Unknown node type "banana"'))).toBe(true)
  })

  it('rejects duplicate node ids', () => {
    const flow: Flow = { ...validFlow, nodes: [...validFlow.nodes, trigger('n1', 500)] }
    const errors = validateFlow(flow)
    expect(errors.some((e) => e.includes('Duplicate node id "n1"'))).toBe(true)
  })

  it('rejects duplicate edge ids', () => {
    const flow: Flow = { ...validFlow, edges: [...validFlow.edges, edge('e1', 'n2', 'n5')] }
    const errors = validateFlow(flow)
    expect(errors.some((e) => e.includes('Duplicate edge id "e1"'))).toBe(true)
  })
})

describe('flowToNodesEdges / nodesEdgesToFlow', () => {
  it('round-trips the schema flow exactly', () => {
    const { nodes, edges } = flowToNodesEdges(schemaFlow)
    const result = nodesEdgesToFlow(nodes, edges, {
      id: schemaFlow.id,
      name: schemaFlow.name,
      permissions: schemaFlow.permissions,
    })
    expect(result).toEqual(schemaFlow)
  })

  it('round-trips the valid flow exactly', () => {
    const { nodes, edges } = flowToNodesEdges(validFlow)
    const result = nodesEdgesToFlow(nodes, edges, {
      id: validFlow.id,
      name: validFlow.name,
      permissions: validFlow.permissions,
    })
    expect(result).toEqual(validFlow)
  })

  it('converts snake_case handles to Vue Flow camelCase handles', () => {
    const { edges } = flowToNodesEdges(schemaFlow)
    expect(edges[0]).toMatchObject({ sourceHandle: 'out', targetHandle: 'in' })
    expect(edges[3]).toMatchObject({ sourceHandle: 'true' })
  })

  it('defaults missing source/target handles', () => {
    const flow = nodesEdgesToFlow(
      [{ id: 'a', type: 'trigger', position: { x: 0, y: 0 }, data: { kind: 'manual' } }],
      [{ id: 'e1', source: 'a', target: 'a' }],
      { id: 'f', name: 'n' },
    )
    expect(flow.edges[0]).toEqual({
      id: 'e1',
      source: 'a',
      source_handle: 'out',
      target: 'a',
      target_handle: 'in',
    })
  })

  it('applies default permissions when none are provided', () => {
    const { nodes, edges } = flowToNodesEdges(validFlow)
    const flow = nodesEdgesToFlow(nodes, edges, { id: 'f', name: 'n' })
    expect(flow.permissions).toEqual({ resources: [], files: [], databases: [] })
    expect(flow.version).toBe(FLOW_VERSION)
  })
})

describe('helpers', () => {
  it('isNodeType validates against the known set', () => {
    expect(NODE_TYPES.every((type) => isNodeType(type))).toBe(true)
    expect(isNodeType('banana')).toBe(false)
    expect(isNodeType('')).toBe(false)
  })

  it('defaultNodeData returns a shape for every known type', () => {
    expect(defaultNodeData('trigger')).toEqual({ kind: 'manual' })
    expect(defaultNodeData('agent')).toEqual({ agent_id: '' })
    expect(defaultNodeData('mcp_tool')).toEqual({ server_id: '', tool: '', arguments: {} })
    expect(defaultNodeData('condition')).toEqual({ expression: '' })
    expect(defaultNodeData('output')).toEqual({ kind: 'database', config: {} })
  })

  it('createEmptyFlow returns a fresh flow with a uuid id', () => {
    const flow = createEmptyFlow('My new flow')
    expect(flow.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(flow.name).toBe('My new flow')
    expect(flow.version).toBe(FLOW_VERSION)
    expect(flow.nodes).toEqual([])
    expect(flow.edges).toEqual([])
    expect(flow.permissions).toEqual({ resources: [], files: [], databases: [] })
  })
})
