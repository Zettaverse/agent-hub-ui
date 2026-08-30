<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { hexToRgba, nodeColor } from '@/lib/palette'

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
const accent = computed(() => nodeColor(props.type))
const nodeStyle = computed<Record<string, string>>(() => ({
  '--node-accent': accent.value,
  '--node-accent-glow': hexToRgba(accent.value, 0.18),
  '--node-accent-glow-strong': hexToRgba(accent.value, 0.5),
}))

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
  <div class="zf-node" :class="{ 'zf-node--selected': selected }" :style="nodeStyle">
    <Handle v-if="hasInput" id="in" type="target" :position="Position.Left" />
    <div class="zf-node__label">{{ label }}</div>
    <div class="zf-node__summary">{{ summary }}</div>
    <Handle v-if="hasOutput" id="out" type="source" :position="Position.Right" />
    <Handle v-if="isCondition" id="true" type="source" :position="Position.Right" style="top: 35%" />
    <Handle v-if="isCondition" id="false" type="source" :position="Position.Right" style="top: 70%" />
  </div>
</template>

<style scoped>
:global(:root) {
  --node-bg: #ffffff;
  --node-border: #e5e5ea;
  --node-text: #1d1d1f;
  --node-muted: #6e6e73;
}

:global(.dark) {
  --node-bg: #0f172a;
  --node-border: #334155;
  --node-text: #e2e8f0;
  --node-muted: #94a3b8;
}

.zf-node {
  position: relative;
  min-width: 150px;
  padding: 8px 12px 8px 14px;
  border: 1px solid var(--node-border);
  border-left: 3px solid var(--node-accent, #0a84ff);
  border-radius: 14px;
  background: var(--node-bg);
  color: var(--node-text);
  font-size: 12px;
  box-shadow:
    0 2px 10px rgba(0, 0, 0, 0.05),
    0 0 14px var(--node-accent-glow, transparent);
  animation: zf-node-pop 180ms ease-out;
}

:global(.dark) .zf-node {
  box-shadow:
    0 2px 10px rgba(0, 0, 0, 0.4),
    0 0 20px var(--node-accent-glow-strong, transparent);
}

.zf-node--selected {
  border-color: var(--node-accent, #0a84ff);
  box-shadow:
    0 0 0 2px var(--node-accent-glow, transparent),
    0 0 18px var(--node-accent-glow-strong, transparent);
}

:global(.dark) .zf-node--selected {
  box-shadow:
    0 0 0 2px var(--node-accent-glow, transparent),
    0 0 26px var(--node-accent-glow-strong, transparent);
}

.zf-node__label {
  font-weight: 600;
}

.zf-node__summary {
  margin-top: 2px;
  color: var(--node-muted);
  word-break: break-word;
}

@keyframes zf-node-pop {
  from {
    opacity: 0;
    transform: scale(0.92);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
