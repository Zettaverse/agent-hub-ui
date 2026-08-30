<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTasksStore, type Task, type TaskStatus } from '@/stores/tasks'
import { renderMarkdown } from '@/lib/markdown'

const store = useTasksStore()
const taskText = ref('')
const selectedId = ref<string | null>(null)

const selectedTask = computed<Task | null>(() => {
  if (!selectedId.value) return null
  return store.tasks.find((task) => task.id === selectedId.value) ?? null
})

const selectedResultHtml = computed(() => {
  const task = selectedTask.value
  return task?.result ? renderMarkdown(task.result) : ''
})

function isActive(status: TaskStatus): boolean {
  return status === 'pending' || status === 'running'
}

function statusBadgeClass(status: TaskStatus): string {
  if (status === 'completed') return 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
  if (status === 'failed') return 'bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
  return 'bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
}

async function create(): Promise<void> {
  const text = taskText.value.trim()
  if (!text) return
  const task = await store.createTask(text)
  selectedId.value = task.id
  taskText.value = ''
  void store.pollTask(task.id)
}

function select(id: string): void {
  selectedId.value = id
  const task = store.tasks.find((existing) => existing.id === id)
  if (task && isActive(task.status)) {
    void store.pollTask(id)
  }
}
</script>

<template>
  <div class="flex h-screen flex-col p-6">
    <h1 class="mb-6 text-2xl font-semibold text-slate-900 dark:text-white">Tasks</h1>

    <form class="mb-6 flex gap-2" @submit.prevent="create">
      <input
        v-model="taskText"
        class="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        placeholder="Describe a task, e.g. 'Summarize the latest incident reports'"
      />
      <button class="rounded-xl bg-royal px-4 py-2 text-sm text-white transition-colors duration-300 hover:bg-royal-hover" type="submit">
        Create Task
      </button>
    </form>

    <div class="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-2">
      <div class="min-h-0 overflow-auto">
        <h2 class="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">History</h2>
        <div v-if="store.tasks.length === 0" class="text-sm text-slate-500 dark:text-slate-400">No tasks yet.</div>
        <div v-else class="flex flex-col gap-2">
          <button
            v-for="task in store.tasks"
            :key="task.id"
            class="rounded-2xl panel p-3 text-left transition-colors duration-300"
            :class="selectedId === task.id ? 'bg-sky-50 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800'"
            @click="select(task.id)"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="truncate text-sm text-slate-900 dark:text-white">{{ task.task }}</span>
              <span class="shrink-0 rounded-full px-2 py-0.5 text-xs" :class="statusBadgeClass(task.status)">
                {{ task.status }}
              </span>
            </div>
          </button>
        </div>
      </div>

      <div class="squircle panel min-h-0 overflow-auto p-4">
        <template v-if="selectedTask">
          <div class="mb-4 flex items-center gap-2">
            <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Decomposition</h2>
            <span class="rounded-full px-2 py-0.5 text-xs" :class="statusBadgeClass(selectedTask.status)">
              {{ selectedTask.status }}
            </span>
          </div>

          <div class="mb-6">
            <h3 class="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">Subtasks</h3>
            <ul v-if="selectedTask.subtasks.length > 0" class="space-y-2">
              <li
                v-for="subtask in selectedTask.subtasks"
                :key="subtask.id"
                class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950"
              >
                <span class="text-sm text-slate-700 dark:text-slate-200">{{ subtask.title }}</span>
                <span class="text-xs text-slate-500 dark:text-slate-400">{{ subtask.status }}</span>
              </li>
            </ul>
            <p v-else class="text-sm text-slate-500 dark:text-slate-400">No subtasks yet.</p>
          </div>

          <div>
            <h3 class="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">Final Result</h3>
            <div v-if="selectedResultHtml" class="text-sm text-slate-700 dark:text-slate-200" v-html="selectedResultHtml" />
            <p v-else class="text-sm text-slate-500 dark:text-slate-400">No result yet.</p>
          </div>
        </template>

        <p v-else class="text-sm text-slate-500 dark:text-slate-400">Select a task to view its decomposition.</p>
      </div>
    </div>
  </div>
</template>
