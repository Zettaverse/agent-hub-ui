import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AUTH_TOKEN_KEY, setApiClient } from '@/lib/api'
import { createMockApi } from '@/test/mockApi'
import { useAuthStore } from '@/stores/auth'

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('login posts credentials and stores the JWT', async () => {
    const api = createMockApi()
    api.post.mockResolvedValue({ token: 'jwt.token.value' })
    setApiClient(api)

    const store = useAuthStore()
    const response = await store.login({ username: 'admin', password: 'secret' })

    expect(api.post).toHaveBeenCalledWith('/auth/login', { username: 'admin', password: 'secret' })
    expect(response).toEqual({ token: 'jwt.token.value' })
    expect(store.token).toBe('jwt.token.value')
    expect(store.isAuthenticated).toBe(true)
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('jwt.token.value')
  })

  it('isAuthenticated is false when there is no token', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)
    expect(store.token).toBeNull()
  })

  it('initializes the token from localStorage', () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'persisted.token')
    const store = useAuthStore()
    expect(store.token).toBe('persisted.token')
    expect(store.isAuthenticated).toBe(true)
  })

  it('logout clears the token and localStorage', async () => {
    const api = createMockApi()
    api.post.mockResolvedValue({ token: 'jwt.token.value' })
    setApiClient(api)

    const store = useAuthStore()
    await store.login({ username: 'admin', password: 'secret' })

    store.logout()

    expect(store.token).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull()
  })

  it('login records the error message on failure and rethrows', async () => {
    const api = createMockApi()
    api.post.mockRejectedValue(new Error('unauthorized'))
    setApiClient(api)

    const store = useAuthStore()
    await expect(store.login({ username: 'admin', password: 'bad' })).rejects.toThrow('unauthorized')
    expect(store.error).toBe('unauthorized')
    expect(store.token).toBeNull()
  })
})
