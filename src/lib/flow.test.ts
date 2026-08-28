import { describe, expect, it } from 'vitest'
import {
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
  return { id, type: 'trigger', position: { x, y: 0 }, trigger_type: 'manual', value: 'hello' }
}

function agent(id: string, x = 0): FlowNode {
  return { id, type: 'agent', position: { x, y: 0 }, agent_id: 'a1' }
}

function condition(id: string, x = 0): FlowNode {
  return { id, type: 'condition', position: { x, y: 0 }, expression: 'true' }
}

function output(id: string, x = 0): FlowNode {
  return { id, type: 'output', position: { x, y: 0 }, kind: 'database', target: 'hub' }
}

function edge(id: string, source: string, target: string, sourceHandle?: string): Flow['flow_json']['edges'][number] {
  return { id, source, target, ...(sourceHandle ? { source_handle: sourceHandle } : {}) }
}

const validFlow: Flow = {
  id: 'valid-flow',
  name: 'Valid flow',
  flow_json: {
    name: 'Valid flow',
    nodes: [
      trigger('n1', 0),
      agent('n2', 100),
      { id: 'n3', type: 'mcp_tool', position: { x: 200, y: 0 }, server_id: 's1', tool: 't', arguments: {} },
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
  },
  permissions: { resources: [], files: [], databases: [] },
  enabled: true,
}

describe('validateFlow', () => {
  it('accepts a valid acyclic graph with a single trigger', () => {
    expect(validateFlow(validFlow)).toEqual([])
  })

  it('rejects a flow with no trigger', () => {
    const flow: Flow = {
      ...validFlow,
      flow_json: { ...validFlow.flow_json, nodes: validFlow.flow_json.nodes.filter((n) => n.type !== 'trigger') },
    }
    const errors = validateFlow(flow)
    expect(errors.some((e) => e.includes('trigger'))).toBe(true)
  })

  it('rejects a flow with multiple triggers', () => {
    const flow: Flow = {
      ...validFlow,
      flow_json: { ...validFlow.flow_json, nodes: [...validFlow.flow_json.nodes, trigger('n7', 500)] },
    }
    const errors = validateFlow(flow)
    expect(errors.some((e) => e.includes('exactly one trigger'))).toBe(true)
  })

  it('rejects a flow with a cycle', () => {
    const flow: Flow = {
      ...validFlow,
      flow_json: {
        ...validFlow.flow_json,
        edges: [...validFlow.flow_json.edges, edge('e6', 'n5', 'n1')],
      },
    }
    const errors = validateFlow(flow)
    expect(errors).toContain('Flow contains a cycle.')
  })

  it('rejects dangling edges referencing missing nodes', () => {
    const flow: Flow = {
      ...validFlow,
      flow_json: {
        ...validFlow.flow_json,
        edges: [...validFlow.flow_json.edges, edge('eX', 'n5', 'missing')],
      },
    }
    const errors = validateFlow(flow)
    expect(errors.some((e) => e.includes('missing target node "missing"'))).toBe(true)
  })

  it('rejects edges whose source node is missing', () => {
    const flow: Flow = {
      ...validFlow,
      flow_json: {
        ...validFlow.flow_json,
        edges: [...validFlow.flow_json.edges, edge('eY', 'ghost', 'n5')],
      },
    }
    const errors = validateFlow(flow)
    expect(errors.some((e) => e.includes('missing source node "ghost"'))).toBe(true)
  })

  it('rejects unknown node types', () => {
    const flow: Flow = {
      ...validFlow,
      flow_json: {
        ...validFlow.flow_json,
        nodes: [...validFlow.flow_json.nodes, { id: 'bad', type: 'banana', position: { x: 0, y: 0 } } as unknown as FlowNode],
      },
    }
    const errors = validateFlow(flow)
    expect(errors.some((e) => e.includes('Unknown node type "banana"'))).toBe(true)
  })

  it('rejects duplicate node ids', () => {
    const flow: Flow = {
      ...validFlow,
      flow_json: { ...validFlow.flow_json, nodes: [...validFlow.flow_json.nodes, trigger('n1', 500)] },
    }
    const errors = validateFlow(flow)
    expect(errors.some((e) => e.includes('Duplicate node id "n1"'))).toBe(true)
  })

  it('rejects duplicate edge ids', () => {
    const flow: Flow = {
      ...validFlow,
      flow_json: { ...validFlow.flow_json, edges: [...validFlow.flow_json.edges, edge('e1', 'n2', 'n5')] },
    }
    const errors = validateFlow(flow)
    expect(errors.some((e) => e.includes('Duplicate edge id "e1"'))).toBe(true)
  })
})

describe('flowToNodesEdges / nodesEdgesToFlow', () => {
  it('round-trips the valid flow exactly', () => {
    const { nodes, edges } = flowToNodesEdges(validFlow)
    const result = nodesEdgesToFlow(nodes, edges, {
      id: validFlow.id,
      name: validFlow.name,
      permissions: validFlow.permissions,
      enabled: validFlow.enabled,
    })
    expect(result).toEqual(validFlow)
  })

  it('maps empty source/target handles to Vue Flow out/in handles', () => {
    const { edges } = flowToNodesEdges(validFlow)
    expect(edges[0]).toMatchObject({ sourceHandle: 'out', targetHandle: 'in' })
    expect(edges[3]).toMatchObject({ sourceHandle: 'true' })
  })

  it('drops out/in handles back to empty on serialize', () => {
    const { nodes, edges } = flowToNodesEdges(validFlow)
    const result = nodesEdgesToFlow(nodes, edges, { id: 'f', name: 'n' })
    expect(result.flow_json.edges[0]).toEqual({ id: 'e1', source: 'n1', target: 'n2' })
    expect(result.flow_json.edges[3]).toEqual({ id: 'e4', source: 'n4', source_handle: 'true', target: 'n5' })
  })

  it('applies default permissions and enabled when not provided', () => {
    const { nodes, edges } = flowToNodesEdges(validFlow)
    const flow = nodesEdgesToFlow(nodes, edges, { id: 'f', name: 'n' })
    expect(flow.permissions).toEqual({ resources: [], files: [], databases: [] })
    expect(flow.enabled).toBe(true)
  })
})

describe('helpers', () => {
  it('isNodeType validates against the known set', () => {
    expect(NODE_TYPES.every((type) => isNodeType(type))).toBe(true)
    expect(isNodeType('banana')).toBe(false)
    expect(isNodeType('')).toBe(false)
  })

  it('defaultNodeData returns flat fields for every known type', () => {
    expect(defaultNodeData('trigger')).toEqual({ trigger_type: 'manual', value: '' })
    expect(defaultNodeData('agent')).toEqual({ agent_id: '' })
    expect(defaultNodeData('mcp_tool')).toEqual({ server_id: '', tool: '', arguments: {} })
    expect(defaultNodeData('condition')).toEqual({ expression: '' })
    expect(defaultNodeData('output')).toEqual({ kind: 'database', target: '', value: '' })
  })

  it('createEmptyFlow returns a fresh flow with a uuid id', () => {
    const flow = createEmptyFlow('My new flow')
    expect(flow.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(flow.name).toBe('My new flow')
    expect(flow.flow_json.nodes).toEqual([])
    expect(flow.flow_json.edges).toEqual([])
    expect(flow.permissions).toEqual({ resources: [], files: [], databases: [] })
    expect(flow.enabled).toBe(true)
  })
})
