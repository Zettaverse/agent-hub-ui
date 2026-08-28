<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useAgentsStore, type Agent, type AgentInput } from '@/stores/agents'

const store = useAgentsStore()

const showForm = ref(false)
const editingId = ref<string | null>(null)
const skillsText = ref('')

const form = reactive<AgentInput>({
  name: '',
  profile: '',
  system_prompt: '',
  skills: [],
})

onMounted(() => {
  void store.fetchAgents()
})

function resetForm(): void {
  form.name = ''
  form.profile = ''
  form.system_prompt = ''
  form.skills = []
  skillsText.value = ''
  editingId.value = null
}

function openCreate(): void {
  resetForm()
  showForm.value = true
}

function openEdit(agent: Agent): void {
  editingId.value = agent.id
  form.name = agent.name
  form.profile = agent.profile
  form.system_prompt = agent.system_prompt
  form.skills = [...agent.skills]
  skillsText.value = agent.skills.join(', ')
  showForm.value = true
}

function closeForm(): void {
  showForm.value = false
  resetForm()
}

function parseSkills(): string[] {
  return skillsText.value
    .split(',')
    .map((skill) => skill.trim())
    .filter((skill) => skill.length > 0)
}

async function submit(): Promise<void> {
  const input: AgentInput = { ...form, skills: parseSkills() }
  if (editingId.value) {
    await store.updateAgent(editingId.value, input)
  } else {
    await store.createAgent(input)
  }
  closeForm()
}

async function remove(agent: Agent): Promise<void> {
  await store.deleteAgent(agent.id)
}
</script>

<template>
  <div class="p-6">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-white">Agents</h1>
      <button
        class="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        @click="openCreate"
      >
        New Agent
      </button>
    </div>

    <div v-if="store.loading" class="text-slate-400">Loading…</div>

    <div v-else-if="store.agents.length === 0" class="text-slate-400">No agents yet.</div>

    <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div v-for="agent in store.agents" :key="agent.id" class="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <div class="mb-2 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-white">{{ agent.name }}</h2>
          <div class="flex gap-2">
            <button class="text-sm text-slate-400 hover:text-white" @click="openEdit(agent)">Edit</button>
            <button class="text-sm text-rose-400 hover:text-rose-300" @click="remove(agent)">Delete</button>
          </div>
        </div>
        <p class="mb-3 text-sm text-slate-400">{{ agent.profile }}</p>
        <div class="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">System Prompt</div>
        <p class="mb-3 text-sm text-slate-300">{{ agent.system_prompt }}</p>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="skill in agent.skills"
            :key="skill"
            class="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300"
          >
            {{ skill }}
          </span>
        </div>
      </div>
    </div>

    <div v-if="showForm" class="fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-900 p-6">
        <h2 class="mb-4 text-lg font-semibold text-white">
          {{ editingId ? 'Edit Agent' : 'New Agent' }}
        </h2>
        <div class="mb-4">
          <label class="mb-1 block text-sm text-slate-400">Name</label>
          <input v-model="form.name" class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-white" />
        </div>
        <div class="mb-4">
          <label class="mb-1 block text-sm text-slate-400">Profile</label>
          <textarea
            v-model="form.profile"
            class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-white"
            rows="2"
          />
        </div>
        <div class="mb-4">
          <label class="mb-1 block text-sm text-slate-400">System Prompt</label>
          <textarea
            v-model="form.system_prompt"
            class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-white"
            rows="4"
          />
        </div>
        <div class="mb-4">
          <label class="mb-1 block text-sm text-slate-400">Skills (comma separated)</label>
          <input
            v-model="skillsText"
            class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-white"
          />
        </div>
        <div class="flex justify-end gap-2">
          <button class="rounded border border-slate-700 px-4 py-2 text-sm text-slate-300" @click="closeForm">
            Cancel
          </button>
          <button class="rounded bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-500" @click="submit">
            Save
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
