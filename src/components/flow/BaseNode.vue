<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'

interface Props {
  id: string
  type: string
  data: Record<string, unknown>
  selected?: boolean
}

const props = defineProps<Props>()

const TYPE_LABELS: Record<string, string> = {
  trigger: 'Trigger',
  agent: 'Agent',
  mcp_tool: 'MCP Tool',
  condition: 'Condition',
  output: 'Output',
}

const label = computed(() => TYPE_LABELS[props.type] ?? props.type)

const hasInput = computed(() => props.type !== 'trigger')
const hasOutput = computed(() => ['trigger', 'agent', 'mcp_tool'].includes(props.type))
const isCondition = computed(() => props.type === 'condition')

const summary = computed(() => {
  switch (props.type) {
    case 'trigger':
      return String(props.data.trigger_type ?? 'manual')
    case 'agent':
      return String(props.data.agent_id ?? 'no agent selected')
    case 'mcp_tool':
      return String(props.data.tool ?? 'no tool selected')
    case 'condition':
      return String(props.data.expression ?? '')
    case 'output':
      return props.data.target ? `${String(props.data.kind ?? '')} → ${String(props.data.target)}` : String(props.data.kind ?? '')
    default:
      return ''
  }
})
</script>

<template>
  <div class="zf-node" :class="{ 'zf-node--selected': selected }">
    <Handle v-if="hasInput" id="in" type="target" :position="Position.Left" />
    <div class="zf-node__label">{{ label }}</div>
    <div class="zf-node__summary">{{ summary }}</div>
    <Handle v-if="hasOutput" id="out" type="source" :position="Position.Right" />
    <Handle v-if="isCondition" id="true" type="source" :position="Position.Right" style="top: 35%" />
    <Handle v-if="isCondition" id="false" type="source" :position="Position.Right" style="top: 70%" />
  </div>
</template>

<style scoped>
.zf-node {
  position: relative;
  min-width: 150px;
  padding: 8px 12px;
  border: 1px solid #334155;
  border-radius: 8px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 12px;
}

.zf-node--selected {
  border-color: #38bdf8;
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.4);
}

.zf-node__label {
  font-weight: 600;
}

.zf-node__summary {
  margin-top: 2px;
  color: #94a3b8;
  word-break: break-word;
}
</style>
