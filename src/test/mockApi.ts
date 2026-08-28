import { vi, type Mock } from 'vitest'
import type { ApiClient } from '@/lib/api'

export interface MockApiClient extends ApiClient {
  get: Mock
  post: Mock
  put: Mock
  delete: Mock
}

export function createMockApi(overrides: Partial<ApiClient> = {}): MockApiClient {
  const api = {
    get: vi.fn(async () => undefined),
    post: vi.fn(async () => undefined),
    put: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined),
  }
  Object.assign(api, overrides)
  return api as unknown as MockApiClient
}
