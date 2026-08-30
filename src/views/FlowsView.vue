<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { createEmptyFlow } from '@/lib/flow'
import { useFlowsStore } from '@/stores/flows'

const store = useFlowsStore()
const router = useRouter()

onMounted(() => {
  void store.fetchFlows()
})

function createFlow(): void {
  const flow = createEmptyFlow()
  store.setCurrentFlow(flow)
  void router.push(`/flows/${flow.id}`)
}

function openFlow(id: string): void {
  void router.push(`/flows/${id}`)
}

function nodeCount(id: string): number {
  const flow = store.flows.find((existing) => existing.id === id)
  return flow?.flow_json.nodes.length ?? 0
}
</script>

<template>
  <div class="p-6">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-slate-900 dark:text-white">Flows</h1>
      <button class="rounded-xl bg-royal px-4 py-2 text-sm font-medium text-white transition-colors duration-300 hover:bg-royal-hover" @click="createFlow">
        New Flow
      </button>
    </div>

    <div v-if="store.loading" class="text-slate-500 dark:text-slate-400">Loading…</div>
    <div v-else-if="store.flows.length === 0" class="text-slate-500 dark:text-slate-400">No flows yet.</div>

    <div v-else class="flex flex-col gap-3">
      <button
        v-for="flow in store.flows"
        :key="flow.id"
        class="squircle panel flex items-center justify-between p-4 text-left transition-shadow duration-300 hover:shadow-md"
        @click="openFlow(flow.id)"
      >
        <div>
          <div class="font-semibold text-slate-900 dark:text-white">{{ flow.name }}</div>
          <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ flow.id }}</div>
        </div>
        <div class="text-sm text-slate-500 dark:text-slate-400">{{ nodeCount(flow.id) }} nodes</div>
      </button>
    </div>
  </div>
</template>
