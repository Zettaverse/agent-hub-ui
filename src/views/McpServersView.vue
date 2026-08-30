<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  useMcpServersStore,
  type McpServer,
  type McpServerInput,
  type McpTestResult,
  type McpTransport,
} from '@/stores/mcpServers'

const store = useMcpServersStore()

const showForm = ref(false)
const argsText = ref('')
const testResults = ref<Record<string, McpTestResult | null>>({})

const form = reactive<McpServerInput>({
  name: '',
  transport: 'stdio',
  command: '',
  args: [],
  url: '',
})

onMounted(() => {
  void store.fetchMcpServers()
})

const isWebsocket = computed(() => form.transport === 'websocket')

function resetForm(): void {
  form.name = ''
  form.transport = 'stdio'
  form.command = ''
  form.args = []
  form.url = ''
  argsText.value = ''
}

function openForm(): void {
  resetForm()
  showForm.value = true
}

function closeForm(): void {
  showForm.value = false
  resetForm()
}

function parseArgs(): string[] {
  return argsText.value
    .split(' ')
    .map((arg) => arg.trim())
    .filter((arg) => arg.length > 0)
}

async function submit(): Promise<void> {
  const input: McpServerInput = {
    name: form.name,
    transport: form.transport,
    command: form.transport === 'stdio' ? form.command : undefined,
    args: form.transport === 'stdio' ? parseArgs() : undefined,
    url: form.transport === 'websocket' ? form.url : undefined,
  }
  await store.createMcpServer(input)
  closeForm()
}

async function remove(server: McpServer): Promise<void> {
  await store.deleteMcpServer(server.id)
}

async function test(server: McpServer): Promise<void> {
  try {
    const result = await store.testMcpServer(server.id)
    testResults.value = { ...testResults.value, [server.id]: result }
  } catch {
    testResults.value = { ...testResults.value, [server.id]: null }
  }
}

function statusBadgeClass(server: McpServer): string {
  if (server.status === 'connected') return 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
  if (server.status === 'disconnected' || server.status === 'error') return 'bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
  return 'bg-slate-200 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300'
}

function transportLabel(server: McpServer): string {
  if (server.transport === 'stdio') {
    return `stdio: ${server.command ?? '?'} ${(server.args ?? []).join(' ')}`
  }
  return `websocket: ${server.url ?? '?'}`
}

function setTransport(transport: McpTransport): void {
  form.transport = transport
}
</script>

<template>
  <div class="p-6">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-slate-900 dark:text-white">MCP Servers</h1>
      <button class="rounded-xl bg-royal px-4 py-2 text-sm font-medium text-white transition-colors duration-300 hover:bg-royal-hover" @click="openForm">
        Add Server
      </button>
    </div>

    <div v-if="store.loading" class="text-slate-500 dark:text-slate-400">Loading…</div>
    <div v-else-if="store.servers.length === 0" class="text-slate-500 dark:text-slate-400">No MCP servers yet.</div>

    <div v-else class="flex flex-col gap-3">
      <div
        v-for="server in store.servers"
        :key="server.id"
        class="squircle panel flex items-center justify-between p-4"
      >
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-slate-900 dark:text-white">{{ server.name }}</span>
            <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="statusBadgeClass(server)">
              {{ server.status ?? 'unknown' }}
            </span>
          </div>
          <div class="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{{ transportLabel(server) }}</div>
          <div v-if="testResults[server.id]" class="mt-1 text-xs">
            <span v-if="testResults[server.id]?.ok" class="text-emerald-600 dark:text-emerald-300">
              test ok{{ testResults[server.id]?.message ? `: ${testResults[server.id]?.message}` : '' }}
            </span>
            <span v-else class="text-rose-600 dark:text-rose-300">
              test failed{{ testResults[server.id]?.message ? `: ${testResults[server.id]?.message}` : '' }}
            </span>
          </div>
        </div>
        <div class="flex shrink-0 gap-2">
          <button
            class="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors duration-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            :disabled="store.testing[server.id]"
            @click="test(server)"
          >
            {{ store.testing[server.id] ? 'Testing…' : 'Test' }}
          </button>
          <button class="rounded-xl px-3 py-1.5 text-sm text-rose-500 hover:bg-slate-100 dark:text-rose-400 dark:hover:bg-slate-800" @click="remove(server)">
            Delete
          </button>
        </div>
      </div>
    </div>

    <div v-if="showForm" class="fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4">
      <div class="squircle panel w-full max-w-lg p-6">
        <h2 class="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Add MCP Server</h2>

        <div class="mb-4">
          <label class="mb-1 block text-sm text-slate-500 dark:text-slate-400">Name</label>
          <input v-model="form.name" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
        </div>

        <div class="mb-4">
          <label class="mb-1 block text-sm text-slate-500 dark:text-slate-400">Transport</label>
          <div class="flex gap-2">
            <button
              class="rounded-xl border px-3 py-1.5 text-sm transition-colors duration-300"
              :class="form.transport === 'stdio' ? 'border-sky-500 bg-sky-600/20 text-sky-700 dark:text-sky-300' : 'border-slate-200 bg-white text-slate-600 hover:border-sky-500 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:bg-slate-800'"
              @click="setTransport('stdio')"
            >
              stdio
            </button>
            <button
              class="rounded-xl border px-3 py-1.5 text-sm transition-colors duration-300"
              :class="form.transport === 'websocket' ? 'border-sky-500 bg-sky-600/20 text-sky-700 dark:text-sky-300' : 'border-slate-200 bg-white text-slate-600 hover:border-sky-500 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:bg-slate-800'"
              @click="setTransport('websocket')"
            >
              websocket
            </button>
          </div>
        </div>

        <template v-if="!isWebsocket">
          <div class="mb-4">
            <label class="mb-1 block text-sm text-slate-500 dark:text-slate-400">Command</label>
            <input
              v-model="form.command"
              class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div class="mb-4">
            <label class="mb-1 block text-sm text-slate-500 dark:text-slate-400">Arguments (space separated)</label>
            <input
              v-model="argsText"
              class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </template>

        <div v-else class="mb-4">
          <label class="mb-1 block text-sm text-slate-500 dark:text-slate-400">WebSocket URL</label>
          <input v-model="form.url" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
        </div>

        <div class="flex justify-end gap-2">
          <button class="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 transition-colors duration-300 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="closeForm">
            Cancel
          </button>
          <button class="rounded-xl bg-royal px-4 py-2 text-sm text-white transition-colors duration-300 hover:bg-royal-hover" @click="submit">
            Add
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
