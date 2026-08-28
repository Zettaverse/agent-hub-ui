<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ConsoleClient, type ConsoleStatus } from '@/lib/console'
import { renderMarkdown } from '@/lib/markdown'

interface ConsoleEntry {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  time: string
}

const DEFAULT_WS_URL = 'ws://localhost:8080'

const status = ref<ConsoleStatus>('disconnected')
const messages = ref<ConsoleEntry[]>([])
const draft = ref('')
const scrollContainer = ref<HTMLElement | null>(null)

let client: ConsoleClient | null = null

function buildWsUrl(): string {
  const base = import.meta.env.VITE_WS_URL ?? DEFAULT_WS_URL
  const token = localStorage.getItem('zettaverse_token')
  const suffix = token ? `?token=${encodeURIComponent(token)}` : ''
  return `${base}/api/v1/ws${suffix}`
}

function handleMessage(raw: string): void {
  let role: ConsoleEntry['role'] = 'assistant'
  let content = raw
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>
      if (typeof record.content === 'string') {
        content = record.content
      }
      if (record.role === 'user' || record.role === 'system' || record.role === 'assistant') {
        role = record.role
      }
    }
  } catch {
    content = raw
  }
  messages.value = [...messages.value, { id: crypto.randomUUID(), role, content, time: new Date().toISOString() }]
  void scrollToBottom()
}

function send(): void {
  const text = draft.value.trim()
  if (!text) return
  messages.value = [...messages.value, { id: crypto.randomUUID(), role: 'user', content: text, time: new Date().toISOString() }]
  client?.send(text)
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

onMounted(() => {
  client = new ConsoleClient(buildWsUrl())
  client.onMessage = handleMessage
  client.onStatus = (next: ConsoleStatus) => {
    status.value = next
  }
  client.connect()
})

onBeforeUnmount(() => {
  client?.close()
  client = null
})
</script>

<template>
  <div class="flex h-screen flex-col p-6">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-white">Live Console</h1>
      <div class="flex items-center gap-2 text-sm">
        <span
          class="inline-block h-2 w-2 rounded-full"
          :class="status === 'connected' ? 'bg-emerald-400' : status === 'connecting' ? 'bg-amber-400' : 'bg-rose-400'"
        />
        <span class="text-slate-400">{{ statusLabel() }}</span>
      </div>
    </div>

    <div ref="scrollContainer" class="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-800 bg-slate-900 p-4">
      <div v-if="messages.length === 0" class="text-sm text-slate-500">
        Waiting for messages… Start a flow run to see its output here.
      </div>
      <div v-for="message in messages" :key="message.id" class="mb-4">
        <div class="mb-1 text-xs text-slate-500">
          {{ message.role }} · {{ new Date(message.time).toLocaleTimeString() }}
        </div>
        <div
          class="rounded border p-3 text-sm"
          :class="message.role === 'user' ? 'border-sky-800 bg-sky-950/40' : 'border-slate-800 bg-slate-950'"
        >
          <div class="text-slate-200" v-html="rendered(message.content)" />
        </div>
      </div>
    </div>

    <form class="mt-4 flex gap-2" @submit.prevent="send">
      <input
        v-model="draft"
        class="flex-1 rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
        placeholder="Send a message to the console…"
      />
      <button class="rounded bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-500" type="submit">Send</button>
    </form>
  </div>
</template>
