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
import { nodeColor } from '@/lib/palette'

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

// Tactile drag state (visual only — does not affect flow_json serialization).
const draggingType = ref<string | null>(null)
const isDraggingOver = ref(false)
let dragDepth = 0

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

// Visual-only drag state. Wraps the existing onDragStart (which stays
// byte-identical) so the palette item can scale up while being dragged.
function onPaletteDragStart(event: DragEvent, type: string): void {
  draggingType.value = type
  onDragStart(event, type)
}

function onDragEnd(): void {
  draggingType.value = null
  dragDepth = 0
  isDraggingOver.value = false
}

function onDragEnter(event: DragEvent): void {
  event.preventDefault()
  dragDepth += 1
  isDraggingOver.value = true
}

function onDragLeave(): void {
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) {
    isDraggingOver.value = false
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
    <header class="flex items-center gap-3 border-b border-black/[0.05] bg-white/70 px-4 py-3 backdrop-blur-[20px] backdrop-saturate-150 dark:border-white/[0.06] dark:bg-slate-900/70">
      <button class="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white" @click="backToFlows">← Flows</button>
      <input
        v-model="flowName"
        class="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
      <div class="ml-auto flex items-center gap-3">
        <span
          v-if="statusMessage"
          class="text-sm"
          :class="validationErrors.length > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-300'"
        >
          {{ statusMessage }}
        </span>
        <button
          class="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors duration-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          :disabled="saving || running"
          @click="onSave"
        >
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
        <button
          class="rounded-xl bg-royal px-3 py-1.5 text-sm text-white transition-colors duration-300 hover:bg-royal-hover disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="saving || running"
          @click="onRun"
        >
          {{ running ? 'Running…' : 'Run' }}
        </button>
      </div>
    </header>

    <div
      v-if="validationErrors.length > 0"
      class="border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
    >
      <div v-for="error in validationErrors" :key="error">{{ error }}</div>
    </div>

    <div class="flex min-h-0 flex-1">
      <aside class="w-48 shrink-0 overflow-auto border-r border-black/[0.05] bg-white/70 p-3 backdrop-blur-[20px] dark:border-white/[0.06] dark:bg-slate-900/70">
        <h2 class="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-300">Node Palette</h2>
        <div class="flex flex-col gap-2">
          <div
            v-for="type in NODE_TYPES"
            :key="type"
            class="flex cursor-grab items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition-all duration-300 hover:border-sky-500 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            :class="{ 'scale-105 shadow-lg': draggingType === type }"
            draggable="true"
            @dragstart="onPaletteDragStart($event, type)"
            @dragend="onDragEnd"
          >
            <span class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: nodeColor(type) }" />
            {{ NODE_LABELS[type] }}
          </div>
        </div>
        <p class="mt-4 text-xs text-slate-500 dark:text-slate-400">Drag a node onto the canvas.</p>
      </aside>

      <main
        class="flow-canvas min-w-0 flex-1 bg-[#F5F5F7] dark:bg-slate-950"
        :class="{ 'is-dragging': isDraggingOver }"
        @dragenter="onDragEnter"
        @dragleave="onDragLeave"
      >
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

      <aside class="w-72 shrink-0 overflow-auto border-l border-black/[0.05] bg-white/70 backdrop-blur-[20px] dark:border-white/[0.06] dark:bg-slate-900/70">
        <NodePanel :node="selectedNode" @update-data="onUpdateData" @delete-node="onDeleteNode" />
      </aside>
    </div>
  </div>
</template>
