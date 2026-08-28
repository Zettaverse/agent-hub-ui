import type { Edge, Node } from '@vue-flow/core'

export const FLOW_VERSION = 1

export type NodeType = 'trigger' | 'agent' | 'mcp_tool' | 'condition' | 'output'

export const NODE_TYPES: readonly NodeType[] = ['trigger', 'agent', 'mcp_tool', 'condition', 'output']

export interface FlowPosition {
  x: number
  y: number
}

export interface TriggerNodeData {
  kind: string
}

export interface AgentNodeData {
  agent_id: string
}

export interface McpToolNodeData {
  server_id: string
  tool: string
  arguments: Record<string, unknown>
}

export interface ConditionNodeData {
  expression: string
}

export interface OutputNodeData {
  kind: string
  config: Record<string, unknown>
}

interface FlowNodeBase {
  id: string
  position: FlowPosition
}

export interface TriggerNode extends FlowNodeBase {
  type: 'trigger'
  data: TriggerNodeData
}

export interface AgentNode extends FlowNodeBase {
  type: 'agent'
  data: AgentNodeData
}

export interface McpToolNode extends FlowNodeBase {
  type: 'mcp_tool'
  data: McpToolNodeData
}

export interface ConditionNode extends FlowNodeBase {
  type: 'condition'
  data: ConditionNodeData
}

export interface OutputNode extends FlowNodeBase {
  type: 'output'
  data: OutputNodeData
}

export type FlowNode = TriggerNode | AgentNode | McpToolNode | ConditionNode | OutputNode

export interface FlowEdge {
  id: string
  source: string
  source_handle: string
  target: string
  target_handle: string
}

export interface FlowPermissions {
  resources: string[]
  files: string[]
  databases: string[]
}

export interface Flow {
  version: number
  id: string
  name: string
  nodes: FlowNode[]
  edges: FlowEdge[]
  permissions: FlowPermissions
}

export function isNodeType(value: string): value is NodeType {
  return (NODE_TYPES as readonly string[]).includes(value)
}

export function defaultNodeData(type: NodeType): Record<string, unknown> {
  switch (type) {
    case 'trigger':
      return { kind: 'manual' }
    case 'agent':
      return { agent_id: '' }
    case 'mcp_tool':
      return { server_id: '', tool: '', arguments: {} }
    case 'condition':
      return { expression: '' }
    case 'output':
      return { kind: 'database', config: {} }
  }
}

export function createEmptyFlow(name = 'Untitled flow'): Flow {
  return {
    version: FLOW_VERSION,
    id: crypto.randomUUID(),
    name,
    nodes: [],
    edges: [],
    permissions: { resources: [], files: [], databases: [] },
  }
}

export function flowToNodesEdges(flow: Flow): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = flow.nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: { x: node.position.x, y: node.position.y },
    data: { ...node.data },
  }))

  const edges: Edge[] = flow.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    sourceHandle: edge.source_handle,
    target: edge.target,
    targetHandle: edge.target_handle,
  }))

  return { nodes, edges }
}

export interface FlowMeta {
  id: string
  name: string
  permissions?: FlowPermissions
}

function toFlowNode(node: Node): FlowNode {
  const base = {
    id: node.id,
    position: { x: node.position.x, y: node.position.y },
  }
  const data = (node.data ?? {}) as Record<string, unknown>
  switch (node.type) {
    case 'trigger':
      return { ...base, type: 'trigger', data: { kind: String(data.kind ?? 'manual') } }
    case 'agent':
      return { ...base, type: 'agent', data: { agent_id: String(data.agent_id ?? '') } }
    case 'mcp_tool':
      return {
        ...base,
        type: 'mcp_tool',
        data: {
          server_id: String(data.server_id ?? ''),
          tool: String(data.tool ?? ''),
          arguments: (data.arguments ?? {}) as Record<string, unknown>,
        },
      }
    case 'condition':
      return { ...base, type: 'condition', data: { expression: String(data.expression ?? '') } }
    case 'output':
      return {
        ...base,
        type: 'output',
        data: { kind: String(data.kind ?? ''), config: (data.config ?? {}) as Record<string, unknown> },
      }
    default:
      throw new Error(`Unsupported node type: ${String(node.type)}`)
  }
}

export function nodesEdgesToFlow(nodes: Node[], edges: Edge[], meta: FlowMeta): Flow {
  return {
    version: FLOW_VERSION,
    id: meta.id,
    name: meta.name,
    nodes: nodes.map(toFlowNode),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      source_handle: edge.sourceHandle ?? 'out',
      target: edge.target,
      target_handle: edge.targetHandle ?? 'in',
    })),
    permissions: meta.permissions ?? { resources: [], files: [], databases: [] },
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

  for (const node of flow.nodes) {
    if (!isNodeType(node.type)) {
      errors.push(`Unknown node type "${node.type}" on node "${node.id}".`)
    }
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node id "${node.id}".`)
    }
    nodeIds.add(node.id)
  }

  for (const edge of flow.edges) {
    if (edgeIds.has(edge.id)) {
      errors.push(`Duplicate edge id "${edge.id}".`)
    }
    edgeIds.add(edge.id)
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge "${edge.id}" references missing source node "${edge.source}".`)
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge "${edge.id}" references missing target node "${edge.target}".`)
    }
  }

  const triggers = flow.nodes.filter((node) => node.type === 'trigger')
  if (triggers.length === 0) {
    errors.push('Flow must have exactly one trigger node (found 0).')
  } else if (triggers.length > 1) {
    errors.push(`Flow must have exactly one trigger node (found ${triggers.length}).`)
  }

  if (hasCycle(nodeIds, flow.edges)) {
    errors.push('Flow contains a cycle.')
  }

  return errors
}
