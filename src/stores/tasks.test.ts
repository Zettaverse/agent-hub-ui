import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { setApiClient } from '@/lib/api'
import { createMockApi } from '@/test/mockApi'
import { useTasksStore, type Task } from '@/stores/tasks'

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    task: 'do the thing',
    status: 'pending',
    subtasks: [],
    ...overrides,
  }
}

describe('useTasksStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('createTask posts the task text and prepends the result', async () => {
    const created = task({ status: 'running' })
    const api = createMockApi()
    api.post.mockResolvedValue(created)
    setApiClient(api)

    const store = useTasksStore()
    const result = await store.createTask('do the thing')

    expect(api.post).toHaveBeenCalledWith('/tasks', { task: 'do the thing' })
    expect(result).toEqual(created)
    expect(store.tasks).toEqual([created])
    expect(store.currentTask).toEqual(created)
  })

  it('fetchTask loads and upserts a task', async () => {
    const existing = task()
    const fetched = task({ status: 'completed', result: 'done' })
    const api = createMockApi()
    api.get.mockResolvedValue(fetched)
    setApiClient(api)

    const store = useTasksStore()
    store.tasks = [existing]
    await store.fetchTask('t1')

    expect(api.get).toHaveBeenCalledWith('/tasks/t1')
    expect(store.tasks).toEqual([fetched])
  })

  it('pollTask returns immediately when the task is already terminal', async () => {
    const done = task({ status: 'completed', result: 'done' })
    const api = createMockApi()
    api.get.mockResolvedValue(done)
    setApiClient(api)

    const store = useTasksStore()
    const result = await store.pollTask('t1')

    expect(api.get).toHaveBeenCalledTimes(1)
    expect(result.status).toBe('completed')
    expect(store.currentTask).toBeNull()
    expect(store.tasks).toEqual([done])
  })

  it('pollTask polls until the task reaches a terminal status', async () => {
    vi.useFakeTimers()
    const api = createMockApi()
    api.get
      .mockResolvedValueOnce(task({ status: 'pending' }))
      .mockResolvedValueOnce(
        task({ status: 'running', subtasks: [{ id: 's1', title: 'step', status: 'completed' }] }),
      )
      .mockResolvedValue(
        task({ status: 'completed', subtasks: [{ id: 's1', title: 'step', status: 'completed' }], result: 'done' }),
      )
    setApiClient(api)

    const store = useTasksStore()
    const promise = store.pollTask('t1', { intervalMs: 1000, timeoutMs: 60000 })
    await vi.runAllTimersAsync()

    const result = await promise
    expect(result.status).toBe('completed')
    expect(result.result).toBe('done')
    expect(api.get).toHaveBeenCalledTimes(3)
    expect(store.tasks).toEqual([result])
  })
})
