import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'zettaverse_theme'

type Theme = 'light' | 'dark'

function readInitial(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // storage unavailable (privacy mode / SSR) — fall back to default
  }
  return 'dark'
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>(readInitial())
  const isDark = computed(() => theme.value === 'dark')

  function apply(): void {
    document.documentElement.classList.toggle('dark', isDark.value)
  }

  function setTheme(next: Theme): void {
    theme.value = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // storage unavailable — theme still applies for this session
    }
    apply()
  }

  function toggle(): void {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  return { theme, isDark, apply, setTheme, toggle }
})
