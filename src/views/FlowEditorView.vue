<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  VueFlow,
  type Connection,
  type GraphNode,
  type Node,
  type NodeTypesObject,
  type VueFlowStore,
} from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import BaseNode from '@/components/flow/BaseNode.vue'
import NodePanel from '@/components/flow/NodePanel.vue'
import {
  NODE_TYPES,
  createEmptyFlow,
  defaultNodeData,
  flowToNodesEdges,
  isNodeType,
  nodesEdgesToFlow,
  validateFlow,
  type Flow,
} from '@/lib/flow'
import { useFlowsStore } from '@/stores/flows'

const route = useRoute()
const router = useRouter()
const flowsStore = useFlowsStore()

const NODE_LABELS: Record<string, string> = {
  trigger: 'Trigger',
  agent: 'Agent',
  mcp_tool: 'MCP Tool',
  condition: 'Condition',
  output: 'Output',
}

const nodeTypes: NodeTypesObject = {
  trigger: BaseNode,
  agent: BaseNode,
  mcp_tool: BaseNode,
  condition: BaseNode,
  output: BaseNode,
}

const flowInstance = shallowRef<VueFlowStore | null>(null)
const flowId = ref('')
const flowName = ref('')
const permissions = ref<Flow['permissions']>({ resources: [], files: [], databases: [] })
const selectedNodeId = ref<string | null>(null)
const validationErrors = ref<string[]>([])
const saving = ref(false)
const running = ref(false)
const statusMessage = ref<string | null>(null)

const selectedNode = computed<GraphNode | null>(() => {
  if (!flowInstance.value || !selectedNodeId.value) return null
  return flowInstance.value.findNode(selectedNodeId.value) ?? null
})

function onInit(instance: VueFlowStore): void {
  flowInstance.value = instance
  const idParam = typeof route.params.id === 'string' ? route.params.id : undefined
  const existing = flowsStore.currentFlow
  if (idParam && existing && existing.id === idParam) {
    applyFlow(existing)
  } else if (idParam) {
    void loadFlow(idParam)
  } else {
    applyFlow(createEmptyFlow())
  }
}

async function loadFlow(id: string): Promise<void> {
  try {
    const flow = await flowsStore.fetchFlow(id)
    applyFlow(flow)
  } catch {
    statusMessage.value = 'Failed to load flow'
  }
}

function applyFlow(flow: Flow): void {
  flowId.value = flow.id
  flowName.value = flow.name
  permissions.value = flow.permissions
  selectedNodeId.value = null
  validationErrors.value = []
  const { nodes, edges } = flowToNodesEdges(flow)
  flowInstance.value?.setNodes(nodes)
  flowInstance.value?.setEdges(edges)
}

function onConnect(connection: Connection): void {
  flowInstance.value?.addEdges(connection)
}

function onNodeClick(event: { node: GraphNode }): void {
  selectedNodeId.value = event.node.id
}

function onPaneClick(): void {
  selectedNodeId.value = null
}

function onDragStart(event: DragEvent, type: string): void {
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/vueflow', type)
    event.dataTransfer.effectAllowed = 'move'
  }
}

function onDragOver(event: DragEvent): void {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function onDrop(event: DragEvent): void {
  event.preventDefault()
  const type = event.dataTransfer?.getData('application/vueflow') ?? ''
  if (!isNodeType(type) || !flowInstance.value) return
  const position = flowInstance.value.screenToFlowCoordinate({ x: event.clientX, y: event.clientY })
  const node: Node = {
    id: `${type}-${crypto.randomUUID()}`,
    type,
    position,
    data: defaultNodeData(type),
  }
  flowInstance.value.addNodes(node)
}

function onUpdateData(field: string, value: unknown): void {
  if (!selectedNodeId.value || !flowInstance.value) return
  flowInstance.value.updateNodeData(selectedNodeId.value, { [field]: value })
}

function onDeleteNode(): void {
  if (!selectedNodeId.value || !flowInstance.value) return
  flowInstance.value.removeNodes(selectedNodeId.value)
  selectedNodeId.value = null
}

function serialize(): Flow | null {
  if (!flowInstance.value) return null
  const object = flowInstance.value.toObject()
  return nodesEdgesToFlow(object.nodes, object.edges, {
    id: flowId.value,
    name: flowName.value,
    permissions: permissions.value,
  })
}

async function onSave(): Promise<void> {
  const flow = serialize()
  if (!flow) return
  validationErrors.value = validateFlow(flow)
  if (validationErrors.value.length > 0) {
    statusMessage.value = 'Flow is invalid'
    return
  }
  saving.value = true
  statusMessage.value = null
  try {
    const saved = await flowsStore.saveFlow(flow)
    flowId.value = saved.id
    statusMessage.value = 'Saved'
  } catch {
    statusMessage.value = 'Save failed'
  } finally {
    saving.value = false
  }
}

async function onRun(): Promise<void> {
  const flow = serialize()
  if (!flow) return
  validationErrors.value = validateFlow(flow)
  if (validationErrors.value.length > 0) {
    statusMessage.value = 'Flow is invalid'
    return
  }
  running.value = true
  statusMessage.value = null
  try {
    const saved = await flowsStore.saveFlow(flow)
    flowId.value = saved.id
    await flowsStore.runFlow(saved.id)
    statusMessage.value = 'Flow started'
  } catch {
    statusMessage.value = 'Run failed'
  } finally {
    running.value = false
  }
}

function backToFlows(): void {
  void router.push('/flows')
}
</script>

<template>
  <div class="flex h-screen flex-col">
    <header class="flex items-center gap-3 border-b border-slate-800 bg-slate-900 px-4 py-3">
      <button class="text-sm text-slate-400 hover:text-white" @click="backToFlows">← Flows</button>
      <input
        v-model="flowName"
        class="rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white"
      />
      <div class="ml-auto flex items-center gap-3">
        <span
          v-if="statusMessage"
          class="text-sm"
          :class="validationErrors.length > 0 ? 'text-rose-400' : 'text-emerald-300'"
        >
          {{ statusMessage }}
        </span>
        <button
          class="rounded border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          :disabled="saving || running"
          @click="onSave"
        >
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
        <button
          class="rounded bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-500"
          :disabled="saving || running"
          @click="onRun"
        >
          {{ running ? 'Running…' : 'Run' }}
        </button>
      </div>
    </header>

    <div
      v-if="validationErrors.length > 0"
      class="border-b border-rose-800 bg-rose-950/40 px-4 py-2 text-sm text-rose-300"
    >
      <div v-for="error in validationErrors" :key="error">{{ error }}</div>
    </div>

    <div class="flex min-h-0 flex-1">
      <aside class="w-48 shrink-0 overflow-auto border-r border-slate-800 bg-slate-900 p-3">
        <h2 class="mb-3 text-sm font-semibold text-slate-300">Node Palette</h2>
        <div class="flex flex-col gap-2">
          <div
            v-for="type in NODE_TYPES"
            :key="type"
            class="cursor-grab rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:border-sky-500"
            draggable="true"
            @dragstart="onDragStart($event, type)"
          >
            {{ NODE_LABELS[type] }}
          </div>
        </div>
        <p class="mt-4 text-xs text-slate-500">Drag a node onto the canvas.</p>
      </aside>

      <main class="min-w-0 flex-1">
        <VueFlow
          class="h-full w-full"
          :node-types="nodeTypes"
          @init="onInit"
          @connect="onConnect"
          @node-click="onNodeClick"
          @pane-click="onPaneClick"
          @drop="onDrop"
          @dragover="onDragOver"
        >
          <Background />
          <Controls />
        </VueFlow>
      </main>

      <aside class="w-72 shrink-0 overflow-auto border-l border-slate-800 bg-slate-900">
        <NodePanel :node="selectedNode" @update-data="onUpdateData" @delete-node="onDeleteNode" />
      </aside>
    </div>
  </div>
</template>
