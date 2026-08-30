<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { nodeColor } from '@/lib/palette'

interface PanelNode {
  id: string
  type: string
  data: Record<string, unknown>
}

const props = defineProps<{ node: PanelNode | null }>()

const emit = defineEmits<{
  (event: 'update-data', field: string, value: unknown): void
  (event: 'delete-node'): void
}>()

const data = computed<Record<string, unknown>>(() => props.node?.data ?? {})

const argumentsText = ref('')
const jsonError = ref<string | null>(null)

watch(
  () => props.node?.id,
  () => {
    argumentsText.value = JSON.stringify(data.value.arguments ?? {}, null, 2)
    jsonError.value = null
  },
  { immediate: true },
)

function emitScalar(field: string, event: Event): void {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  emit('update-data', field, target.value)
}

function emitJson(field: string, text: string): void {
  argumentsText.value = text
  try {
    const parsed: unknown = JSON.parse(text)
    jsonError.value = null
    emit('update-data', field, parsed)
  } catch {
    jsonError.value = 'Invalid JSON'
  }
}
</script>

<template>
  <div class="p-4">
    <div v-if="!node" class="text-sm text-slate-500 dark:text-slate-400">Select a node to edit its configuration.</div>

    <div v-else>
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span
            class="h-2.5 w-2.5 shrink-0 rounded-full"
            :style="{ backgroundColor: nodeColor(node.type), boxShadow: `0 0 8px ${nodeColor(node.type)}` }"
          />
          <h3 class="font-semibold text-slate-900 dark:text-white">{{ node.type }}</h3>
        </div>
        <span class="truncate text-xs text-slate-500 dark:text-slate-400">{{ node.id }}</span>
      </div>

      <div v-if="node.type === 'trigger'" class="mb-4 space-y-4">
        <div>
          <label class="mb-1 block text-xs text-slate-500 dark:text-slate-400">Kind</label>
          <input
            :value="String(data.trigger_type ?? 'manual')"
            class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            @input="emitScalar('trigger_type', $event)"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs text-slate-500 dark:text-slate-400">Value (input passed to the next node)</label>
          <textarea
            :value="String(data.value ?? '')"
            class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            rows="4"
            @input="emitScalar('value', $event)"
          />
        </div>
      </div>

      <div v-else-if="node.type === 'agent'" class="mb-4">
        <label class="mb-1 block text-xs text-slate-500 dark:text-slate-400">Agent ID</label>
        <input
          :value="String(data.agent_id ?? '')"
          class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          @input="emitScalar('agent_id', $event)"
        />
      </div>

      <div v-else-if="node.type === 'mcp_tool'" class="mb-4 space-y-4">
        <div>
          <label class="mb-1 block text-xs text-slate-500 dark:text-slate-400">Server ID</label>
          <input
            :value="String(data.server_id ?? '')"
            class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            @input="emitScalar('server_id', $event)"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs text-slate-500 dark:text-slate-400">Tool</label>
          <input
            :value="String(data.tool ?? '')"
            class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            @input="emitScalar('tool', $event)"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs text-slate-500 dark:text-slate-400">Arguments (JSON)</label>
          <textarea
            :value="argumentsText"
            class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            rows="6"
            @input="emitJson('arguments', ($event.target as HTMLTextAreaElement).value)"
          />
        </div>
      </div>

      <div v-else-if="node.type === 'condition'" class="mb-4">
        <label class="mb-1 block text-xs text-slate-500 dark:text-slate-400">Expression</label>
        <input
          :value="String(data.expression ?? '')"
          class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          @input="emitScalar('expression', $event)"
        />
      </div>

      <div v-else-if="node.type === 'output'" class="mb-4 space-y-4">
        <div>
          <label class="mb-1 block text-xs text-slate-500 dark:text-slate-400">Kind</label>
          <input
            :value="String(data.kind ?? '')"
            class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            @input="emitScalar('kind', $event)"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs text-slate-500 dark:text-slate-400">Target</label>
          <input
            :value="String(data.target ?? '')"
            class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            @input="emitScalar('target', $event)"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs text-slate-500 dark:text-slate-400">Value</label>
          <input
            :value="String(data.value ?? '')"
            class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            @input="emitScalar('value', $event)"
          />
        </div>
      </div>

      <div v-if="jsonError" class="mb-4 text-xs text-rose-500 dark:text-rose-400">{{ jsonError }}</div>

      <button
        class="mt-4 w-full rounded-xl border border-rose-200 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
        @click="emit('delete-node')"
      >
        Delete Node
      </button>
    </div>
  </div>
</template>
