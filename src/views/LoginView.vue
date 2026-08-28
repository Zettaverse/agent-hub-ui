<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const username = ref('admin')
const password = ref('admin')
const error = ref<string | null>(null)
const loading = ref(false)

async function submit(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    await auth.login({ username: username.value, password: password.value })
    await router.push('/')
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
    <form class="w-80 rounded-lg border border-slate-800 bg-slate-900 p-6" @submit.prevent="submit">
      <h1 class="mb-4 text-lg font-semibold text-white">Agent Hub — Sign in</h1>

      <label class="mb-1 block text-xs text-slate-400">Username</label>
      <input
        v-model="username"
        class="mb-3 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
      />

      <label class="mb-1 block text-xs text-slate-400">Password</label>
      <input
        v-model="password"
        type="password"
        class="mb-4 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
      />

      <div v-if="error" class="mb-3 text-xs text-rose-400">{{ error }}</div>

      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
      >
        {{ loading ? 'Signing in…' : 'Sign in' }}
      </button>

      <p class="mt-3 text-xs text-slate-500">Default credentials: admin / admin</p>
    </form>
  </div>
</template>
