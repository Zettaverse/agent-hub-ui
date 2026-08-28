import type { Edge, Node } from '@vue-flow/core'

export type NodeType = 'trigger' | 'agent' | 'mcp_tool' | 'condition' | 'output'

export const NODE_TYPES: readonly NodeType[] = ['trigger', 'agent', 'mcp_tool', 'condition', 'output']

export interface FlowPosition {
  x: number
  y: number
}

// Flat node shapes matching the backend flow_json schema exactly. `position`
// is UI-only and is ignored by the backend when it decodes the flow.
interface FlowNodeBase {
  id: string
  position: FlowPosition
}

export interface TriggerNode extends FlowNodeBase {
  type: 'trigger'
  trigger_type?: string
  value?: string
}

export interface AgentNode extends FlowNodeBase {
  type: 'agent'
  agent_id: string
}

export interface McpToolNode extends FlowNodeBase {
  type: 'mcp_tool'
  server_id: string
  tool: string
  arguments?: Record<string, unknown>
}

export interface ConditionNode extends FlowNodeBase {
  type: 'condition'
  expression: string
}

export interface OutputNode extends FlowNodeBase {
  type: 'output'
  kind: string
  target: string
  value?: string
}

export type FlowNode = TriggerNode | AgentNode | McpToolNode | ConditionNode | OutputNode

export interface FlowEdge {
  id?: string
  source: string
  source_handle?: string
  target: string
  target_handle?: string
}

export interface FlowDef {
  name?: string
  nodes: FlowNode[]
  edges: FlowEdge[]
}

export interface FlowPermissions {
  resources: string[]
  files: string[]
  databases: string[]
}

// Flow is the API object exchanged with the backend (mirrors store.Flow).
export interface Flow {
  id: string
  name: string
  flow_json: FlowDef
  permissions: FlowPermissions
  enabled: boolean
}

export function isNodeType(value: string): value is NodeType {
  return (NODE_TYPES as readonly string[]).includes(value)
}

// defaultNodeData returns the flat, editable fields for a canvas node of the
// given type (stored in the Vue Flow node's `data`).
export function defaultNodeData(type: NodeType): Record<string, unknown> {
  switch (type) {
    case 'trigger':
      return { trigger_type: 'manual', value: '' }
    case 'agent':
      return { agent_id: '' }
    case 'mcp_tool':
      return { server_id: '', tool: '', arguments: {} }
    case 'condition':
      return { expression: '' }
    case 'output':
      return { kind: 'database', target: '', value: '' }
  }
}

export function createEmptyFlow(name = 'Untitled flow'): Flow {
  return {
    id: crypto.randomUUID(),
    name,
    flow_json: { name, nodes: [], edges: [] },
    permissions: { resources: [], files: [], databases: [] },
    enabled: true,
  }
}

// flowToNodesEdges maps a Flow's flow_json into Vue Flow canvas nodes/edges.
export function flowToNodesEdges(flow: Flow): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = flow.flow_json.nodes.map((node) => {
    const { id, type, position, ...data } = node as FlowNode & Record<string, unknown>
    return { id, type, position: { x: position.x, y: position.y }, data: { ...data } }
  })

  const edges: Edge[] = flow.flow_json.edges.map((edge, index) => ({
    id: edge.id ?? `${edge.source}-${edge.target}-${index}`,
    source: edge.source,
    sourceHandle: edge.source_handle && edge.source_handle !== '' ? edge.source_handle : 'out',
    target: edge.target,
    targetHandle: edge.target_handle && edge.target_handle !== '' ? edge.target_handle : 'in',
  }))

  return { nodes, edges }
}

export interface FlowMeta {
  id: string
  name: string
  permissions?: FlowPermissions
  enabled?: boolean
}

function toFlowNode(node: Node): FlowNode {
  const data = (node.data ?? {}) as Record<string, unknown>
  const base = { id: node.id, position: { x: node.position.x, y: node.position.y } }
  switch (node.type) {
    case 'trigger':
      return { ...base, type: 'trigger', trigger_type: String(data.trigger_type ?? 'manual'), value: String(data.value ?? '') }
    case 'agent':
      return { ...base, type: 'agent', agent_id: String(data.agent_id ?? '') }
    case 'mcp_tool':
      return {
        ...base,
        type: 'mcp_tool',
        server_id: String(data.server_id ?? ''),
        tool: String(data.tool ?? ''),
        arguments: (data.arguments ?? {}) as Record<string, unknown>,
      }
    case 'condition':
      return { ...base, type: 'condition', expression: String(data.expression ?? '') }
    case 'output':
      return {
        ...base,
        type: 'output',
        kind: String(data.kind ?? 'database'),
        target: String(data.target ?? ''),
        value: typeof data.value === 'string' ? data.value : undefined,
      }
    default:
      throw new Error(`Unsupported node type: ${String(node.type)}`)
  }
}

function toFlowEdge(edge: Edge): FlowEdge {
  const out: FlowEdge = { source: edge.source, target: edge.target }
  if (edge.id) out.id = edge.id
  if (edge.sourceHandle && edge.sourceHandle !== 'out') out.source_handle = edge.sourceHandle
  if (edge.targetHandle && edge.targetHandle !== 'in') out.target_handle = edge.targetHandle
  return out
}

export function nodesEdgesToFlow(nodes: Node[], edges: Edge[], meta: FlowMeta): Flow {
  return {
    id: meta.id,
    name: meta.name,
    flow_json: {
      name: meta.name,
      nodes: nodes.map(toFlowNode),
      edges: edges.map(toFlowEdge),
    },
    permissions: meta.permissions ?? { resources: [], files: [], databases: [] },
    enabled: meta.enabled ?? true,
  }
}

function hasCycle(nodeIds: Set<string>, edges: FlowEdge[]): boolean {
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  for (const id of nodeIds) {
    inDegree.set(id, 0)
    adjacency.set(id, [])
  }

  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target)
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
  }

  const queue: string[] = [...nodeIds].filter((id) => inDegree.get(id) === 0)
  let visited = 0

  while (queue.length > 0) {
    const current = queue.shift()
    if (current === undefined) break
    visited += 1
    for (const target of adjacency.get(current) ?? []) {
      const next = (inDegree.get(target) ?? 1) - 1
      inDegree.set(target, next)
      if (next === 0) queue.push(target)
    }
  }

  return visited !== nodeIds.size
}

export function validateFlow(flow: Flow): string[] {
  const errors: string[] = []
  const nodeIds = new Set<string>()
  const edgeIds = new Set<string>()

  for (const node of flow.flow_json.nodes) {
    if (!isNodeType(node.type)) {
      errors.push(`Unknown node type "${node.type}" on node "${node.id}".`)
    }
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node id "${node.id}".`)
    }
    nodeIds.add(node.id)
  }

  for (const edge of flow.flow_json.edges) {
    if (edge.id && edgeIds.has(edge.id)) {
      errors.push(`Duplicate edge id "${edge.id}".`)
    }
    if (edge.id) edgeIds.add(edge.id)
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge "${edge.id ?? ''}" references missing source node "${edge.source}".`)
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge "${edge.id ?? ''}" references missing target node "${edge.target}".`)
    }
  }

  const triggers = flow.flow_json.nodes.filter((node) => node.type === 'trigger')
  if (triggers.length === 0) {
    errors.push('Flow must have exactly one trigger node (found 0).')
  } else if (triggers.length > 1) {
    errors.push(`Flow must have exactly one trigger node (found ${triggers.length}).`)
  }

  if (hasCycle(nodeIds, flow.flow_json.edges)) {
    errors.push('Flow contains a cycle.')
  }

  return errors
}
