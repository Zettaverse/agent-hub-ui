import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { AUTH_TOKEN_KEY, useApi } from '@/lib/api'

export interface LoginCredentials {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
}

function readToken(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(readToken())
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => Boolean(token.value))

  function setToken(value: string | null): void {
    token.value = value
    if (typeof localStorage === 'undefined') return
    if (value) {
      localStorage.setItem(AUTH_TOKEN_KEY, value)
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY)
    }
  }

  async function login(credentials: LoginCredentials): Promise<LoginResponse> {
    loading.value = true
    error.value = null
    try {
      const response = await useApi().post<LoginResponse>('/auth/login', credentials)
      setToken(response.token)
      return response
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  function logout(): void {
    setToken(null)
    error.value = null
  }

  return { token, isAuthenticated, loading, error, login, logout }
})
