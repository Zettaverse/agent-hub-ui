<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ConsoleClient, type ConsoleStatus } from '@/lib/console'
import { renderMarkdown } from '@/lib/markdown'
import { useAgentsStore, type Agent } from '@/stores/agents'

interface ConsoleEntry {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  time: string
}

interface ParsedMessage {
  role: ConsoleEntry['role']
  content: string
}

const DEFAULT_WS_URL = 'ws://localhost:8080'
const GREETING_CONTENT = 'connected'

const agentsStore = useAgentsStore()
const agents = computed<Agent[]>(() => agentsStore.agents)

const status = ref<ConsoleStatus>('disconnected')
const messages = ref<ConsoleEntry[]>([])
const draft = ref('')
const selectedAgentId = ref('')
const pending = ref(false)
const scrollContainer = ref<HTMLElement | null>(null)

let client: ConsoleClient | null = null

const canSend = computed(() => selectedAgentId.value !== '' && !pending.value)

const inputPlaceholder = computed(() =>
  selectedAgentId.value === '' ? 'Select an agent to start chatting…' : 'Send a message to the agent…',
)

function buildWsUrl(): string {
  const base = import.meta.env.VITE_WS_URL ?? DEFAULT_WS_URL
  const token = localStorage.getItem('zettaverse_token')
  const suffix = token ? `?token=${encodeURIComponent(token)}` : ''
  return `${base}/api/v1/ws${suffix}`
}

function parseIncoming(raw: string): ParsedMessage | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null

  const envelope = parsed as Record<string, unknown>
  const payload = envelope.payload
  if (!payload || typeof payload !== 'object') return null

  const record = payload as Record<string, unknown>
  const role: ConsoleEntry['role'] =
    record.role === 'user' || record.role === 'system' || record.role === 'assistant'
      ? record.role
      : 'assistant'
  const content = typeof record.content === 'string' ? record.content : ''

  return { role, content }
}

function isTerminalSystem(role: ConsoleEntry['role'], content: string): boolean {
  return role === 'system' && content !== GREETING_CONTENT
}

function handleMessage(raw: string): void {
  const parsed = parseIncoming(raw)
  const role = parsed?.role ?? 'assistant'
  const content = parsed?.content ?? raw

  messages.value = [...messages.value, { id: crypto.randomUUID(), role, content, time: new Date().toISOString() }]

  if (role === 'assistant' || isTerminalSystem(role, content)) {
    pending.value = false
  }
  void scrollToBottom()
}

function send(): void {
  const text = draft.value.trim()
  if (!text || selectedAgentId.value === '' || pending.value) return

  // Do NOT append the user message locally: the server echoes the turn back
  // via broadcast, and rendering it here as well would duplicate it.
  client?.send(
    JSON.stringify({
      type: 'chat',
      agent_id: selectedAgentId.value,
      content: text,
    }),
  )

  pending.value = true
  draft.value = ''
  void scrollToBottom()
}

async function scrollToBottom(): Promise<void> {
  await nextTick()
  const element = scrollContainer.value
  if (element) {
    element.scrollTop = element.scrollHeight
  }
}

function rendered(content: string): string {
  return renderMarkdown(content)
}

function statusLabel(): string {
  if (status.value === 'connected') return 'Connected'
  if (status.value === 'connecting') return 'Connecting…'
  return 'Disconnected'
}

function selectDefaultAgent(): void {
  if (selectedAgentId.value !== '') return
  const preferred = agents.value.find((agent) => agent.enabled) ?? agents.value[0]
  if (preferred) {
    selectedAgentId.value = preferred.id
  }
}

onMounted(() => {
  client = new ConsoleClient(buildWsUrl())
  client.onMessage = handleMessage
  client.onStatus = (next: ConsoleStatus) => {
    status.value = next
  }
  client.connect()

  void (async () => {
    try {
      await agentsStore.fetchAgents()
      selectDefaultAgent()
    } catch {
      // error is recorded on the store; leave the agent selection empty
    }
  })()
})

onBeforeUnmount(() => {
  client?.close()
  client = null
})
</script>

<template>
  <div class="flex h-screen flex-col p-6">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-slate-900 dark:text-white">Live Console</h1>
      <div class="flex items-center gap-2 text-sm">
        <span
          class="inline-block h-2 w-2 rounded-full"
          :class="status === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(48,209,88,0.6)] dark:bg-emerald-400' : status === 'connecting' ? 'bg-amber-500 dark:bg-amber-400' : 'bg-rose-500 dark:bg-rose-400'"
        />
        <span class="text-slate-500 dark:text-slate-400">{{ statusLabel() }}</span>
      </div>
    </div>

    <div class="mb-4 flex items-center gap-3">
      <label class="text-sm text-slate-500 dark:text-slate-400" for="console-agent">Agent</label>
      <select
        id="console-agent"
        v-model="selectedAgentId"
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      >
        <option value="" disabled>
          {{ agents.length === 0 ? 'No agents — create one first' : 'Select an agent' }}
        </option>
        <option v-for="agent in agents" :key="agent.id" :value="agent.id">
          {{ agent.name }}
        </option>
      </select>
      <span v-if="agentsStore.loading" class="text-sm text-slate-500 dark:text-slate-400">Loading agents…</span>
    </div>

    <div ref="scrollContainer" class="min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div v-if="messages.length === 0 && !pending" class="text-sm text-slate-500 dark:text-slate-400">
        <span v-if="agents.length === 0 && !agentsStore.loading">No agents — create one first.</span>
        <span v-else>Waiting for messages… Select an agent and say hello.</span>
      </div>
      <div v-for="message in messages" :key="message.id" class="mb-4">
        <div class="mb-1 text-xs text-slate-500 dark:text-slate-400">
          {{ message.role }} · {{ new Date(message.time).toLocaleTimeString() }}
        </div>
        <div
          class="rounded-xl border p-3 text-sm"
          :class="message.role === 'user' ? 'border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/40' : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950'"
        >
          <div class="text-slate-800 dark:text-slate-200" v-html="rendered(message.content)" />
        </div>
      </div>
      <div v-if="pending" class="mb-4">
        <div class="mb-1 text-xs text-slate-500 dark:text-slate-400">assistant · typing</div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
          <div class="italic text-slate-500 dark:text-slate-400">… typing …</div>
        </div>
      </div>
    </div>

    <form class="mt-4" @submit.prevent="send">
      <div class="squircle panel flex gap-2 p-2">
        <input
          v-model="draft"
          :disabled="!canSend"
          :placeholder="inputPlaceholder"
          class="flex-1 rounded-2xl bg-transparent px-3 py-2 text-sm text-slate-900 outline-none disabled:opacity-50 dark:text-white"
        />
        <button
          type="submit"
          :disabled="!canSend"
          class="rounded-2xl bg-royal px-4 py-2 text-sm text-white transition-colors duration-300 hover:bg-royal-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </form>
  </div>
</template>
