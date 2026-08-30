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
  <div class="flex min-h-screen items-center justify-center bg-[#F5F5F7] text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
    <form class="squircle panel w-80 p-6" @submit.prevent="submit">
      <h1 class="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Agent Hub — Sign in</h1>

      <label class="mb-1 block text-xs text-slate-500 dark:text-slate-400">Username</label>
      <input
        v-model="username"
        class="mb-3 w-full rounded-xl border-transparent bg-slate-100 px-3 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-white"
      />

      <label class="mb-1 block text-xs text-slate-500 dark:text-slate-400">Password</label>
      <input
        v-model="password"
        type="password"
        class="mb-4 w-full rounded-xl border-transparent bg-slate-100 px-3 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-white"
      />

      <div v-if="error" class="mb-3 text-xs text-rose-500 dark:text-rose-400">{{ error }}</div>

      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-xl bg-royal px-3 py-2 text-sm font-medium text-white transition-colors duration-300 hover:bg-royal-hover disabled:opacity-50"
      >
        {{ loading ? 'Signing in…' : 'Sign in' }}
      </button>

      <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">Default credentials: admin / admin</p>
    </form>
  </div>
</template>
