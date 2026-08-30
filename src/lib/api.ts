export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export interface ApiClient {
  get<T>(path: string, signal?: AbortSignal): Promise<T>
  post<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T>
  put<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T>
  delete<T>(path: string, signal?: AbortSignal): Promise<T>
}

export class ApiError extends Error {
  readonly status: number
  readonly detail: unknown

  constructor(status: number, message: string, detail?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

export const AUTH_TOKEN_KEY = 'zettaverse_token'

export function getAuthToken(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

function redirectToLogin(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(AUTH_TOKEN_KEY)
  }
  if (typeof window !== 'undefined' && typeof window.location.assign === 'function') {
    window.location.assign('/login')
  }
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

function buildClient(fetchFn: FetchLike, baseUrl: string): ApiClient {
  async function request<T>(method: HttpMethod, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    const headers: Record<string, string> = {}
    const token = getAuthToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
    }

    const response = await fetchFn(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    })

    if (!response.ok) {
      let detail: unknown
      try {
        detail = await response.json()
      } catch {
        detail = undefined
      }
      if (response.status === 401 && path !== '/auth/login') {
        redirectToLogin()
        throw new ApiError(401, 'Session expired. Redirecting to login.', detail)
      }
      throw new ApiError(response.status, `Request failed: ${response.status} ${response.statusText}`, detail)
    }

    if (response.status === 204) {
      return undefined as T
    }

    const text = await response.text()
    if (!text) {
      return undefined as T
    }
    return JSON.parse(text) as T
  }

  return {
    get: <T>(path: string, signal?: AbortSignal) => request<T>('GET', path, undefined, signal),
    post: <T>(path: string, body?: unknown, signal?: AbortSignal) => request<T>('POST', path, body, signal),
    put: <T>(path: string, body?: unknown, signal?: AbortSignal) => request<T>('PUT', path, body, signal),
    delete: <T>(path: string, signal?: AbortSignal) => request<T>('DELETE', path, undefined, signal),
  }
}

const defaultClient: ApiClient = buildClient(
  (input, init) => globalThis.fetch(input, init),
  '/api/v1',
)

let activeClient: ApiClient = defaultClient

export function useApi(): ApiClient {
  return activeClient
}

export function setApiClient(client: ApiClient): void {
  activeClient = client
}

export function resetApiClient(): void {
  activeClient = defaultClient
}
