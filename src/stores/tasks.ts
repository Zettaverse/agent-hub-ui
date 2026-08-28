import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/lib/api'

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface Subtask {
  id: string
  title: string
  status: TaskStatus
}

export interface Task {
  id: string
  task: string
  status: TaskStatus
  subtasks: Subtask[]
  result?: string
}

export interface PollOptions {
  intervalMs?: number
  timeoutMs?: number
}

const TERMINAL_STATUSES: TaskStatus[] = ['completed', 'failed']

function isTerminal(status: TaskStatus): boolean {
  return TERMINAL_STATUSES.includes(status)
}

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([])
  const currentTask = ref<Task | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  function upsertTask(task: Task): void {
    const index = tasks.value.findIndex((existing) => existing.id === task.id)
    if (index >= 0) {
      const next = [...tasks.value]
      next[index] = task
      tasks.value = next
    } else {
      tasks.value = [task, ...tasks.value]
    }
    if (currentTask.value?.id === task.id) {
      currentTask.value = task
    }
  }

  async function createTask(text: string): Promise<Task> {
    loading.value = true
    error.value = null
    try {
      const task = await useApi().post<Task>('/tasks', { task: text })
      tasks.value = [task, ...tasks.value]
      currentTask.value = task
      return task
    } catch (err) {
      error.value = toErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchTask(id: string): Promise<Task> {
    loading.value = true
    error.value = null
    try {
      const task = await useApi().get<Task>(`/tasks/${id}`)
      upsertTask(task)
      return task
    } catch (err) {
      error.value = toErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function pollTask(id: string, options: PollOptions = {}): Promise<Task> {
    const intervalMs = options.intervalMs ?? 1000
    const timeoutMs = options.timeoutMs ?? 30000
    const startedAt = Date.now()

    let task = await useApi().get<Task>(`/tasks/${id}`)
    upsertTask(task)

    while (!isTerminal(task.status)) {
      if (Date.now() - startedAt >= timeoutMs) {
        return task
      }
      await sleep(intervalMs)
      task = await useApi().get<Task>(`/tasks/${id}`)
      upsertTask(task)
    }

    return task
  }

  return { tasks, currentTask, loading, error, createTask, fetchTask, pollTask }
})
