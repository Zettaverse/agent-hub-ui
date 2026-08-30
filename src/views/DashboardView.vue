<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import type { EChartsCoreOption } from 'echarts/core'
import AppChart from '@/components/charts/AppChart.vue'
import { hexToRgba, STATUS_COLORS } from '@/lib/palette'
import { useDashboardStore, type DashboardHistorySample } from '@/stores/dashboard'
import { useThemeStore } from '@/stores/theme'

const SNAPSHOT_POLL_MS = 5000
const HISTORY_POLL_MS = 15000

const store = useDashboardStore()
const theme = useThemeStore()

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(1)} ${units[unit]}`
}

interface Kpi {
  title: string
  value: string
  detail: string
  color: string
}

const kpis = computed<Kpi[]>(() => [
  {
    title: 'Agents',
    value: `${store.snapshot.agents.online} / ${store.snapshot.agents.total}`,
    detail: 'online / total',
    color: '#0A84FF',
  },
  {
    title: 'MCP Servers',
    value: `${store.snapshot.mcp_servers.connected} / ${store.snapshot.mcp_servers.total}`,
    detail: 'connected / total',
    color: '#BF5AF2',
  },
  {
    title: 'Active Flows',
    value: String(store.snapshot.active_flows),
    detail: 'running',
    color: '#30D158',
  },
  {
    title: 'WS Clients',
    value: String(store.snapshot.websocket_clients),
    detail: 'connected',
    color: '#FF9F0A',
  },
])

// --- Theme-aware chart colors -------------------------------------------
const axisColor = computed(() => (theme.isDark ? 'rgba(148,163,184,0.55)' : 'rgba(100,116,139,0.55)'))
const textColor = computed(() => (theme.isDark ? '#e2e8f0' : '#1d1d1f'))
const mutedTextColor = computed(() => (theme.isDark ? '#94a3b8' : '#6e6e73'))
const splitLineColor = computed(() => (theme.isDark ? 'rgba(51,65,85,0.45)' : 'rgba(0,0,0,0.06)'))
const tooltipBackground = computed(() => (theme.isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.96)'))
const tooltipShadow = computed(() => (theme.isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.08)'))
const donutBorder = computed(() => (theme.isDark ? '#0f172a' : '#ffffff'))

// --- History time-series -------------------------------------------------
const samples = computed<DashboardHistorySample[]>(() => store.history)
const hasHistory = computed(() => samples.value.length > 0)

const timeLabels = computed<string[]>(() =>
  samples.value.map((sample) =>
    new Date(sample.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  ),
)

interface LineSpec {
  name: string
  color: string
  data: number[]
  axisLabel: (value: number) => string
  tooltipValue: (value: number) => string
}

function lineTooltipFormatter(spec: LineSpec): (params: unknown) => string {
  return (params: unknown) => {
    const list = (Array.isArray(params) ? params : [params]) as Array<Record<string, unknown>>
    const first = list[0]
    const title = first && typeof first.axisValue === 'string' ? first.axisValue : ''
    const body = list
      .map((item) => {
        const name = typeof item.seriesName === 'string' ? item.seriesName : spec.name
        const marker = typeof item.marker === 'string' ? item.marker : ''
        const value = typeof item.value === 'number' ? item.value : 0
        return `${marker} ${name}: ${spec.tooltipValue(value)}`
      })
      .join('<br/>')
    return [title, body].filter(Boolean).join('<br/>')
  }
}

function buildLineOption(spec: LineSpec): EChartsCoreOption {
  return {
    animationDuration: 700,
    animationEasing: 'cubicOut',
    grid: { left: 8, right: 14, top: 24, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: tooltipBackground.value,
      borderWidth: 0,
      padding: [8, 12],
      extraCssText: `box-shadow: 0 8px 24px ${tooltipShadow.value}; border-radius: 12px;`,
      textStyle: { color: textColor.value, fontSize: 12 },
      axisPointer: { type: 'line', lineStyle: { color: axisColor.value, type: 'dashed' } },
      formatter: lineTooltipFormatter(spec),
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: timeLabels.value,
      axisLine: { lineStyle: { color: splitLineColor.value } },
      axisTick: { show: false },
      axisLabel: { color: axisColor.value, fontSize: 11, hideOverlap: true },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: splitLineColor.value } },
      axisLabel: { color: axisColor.value, fontSize: 11, formatter: spec.axisLabel },
    },
    series: [
      {
        name: spec.name,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        showSymbol: false,
        data: spec.data,
        lineStyle: { width: 2.5, color: spec.color },
        itemStyle: { color: spec.color },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: hexToRgba(spec.color, 0.28) },
              { offset: 1, color: hexToRgba(spec.color, 0) },
            ],
          },
        },
        emphasis: {
          focus: 'series',
          scale: true,
          lineStyle: { width: 3.5, shadowBlur: 10, shadowColor: hexToRgba(spec.color, 0.5) },
          itemStyle: {
            color: spec.color,
            borderColor: '#ffffff',
            borderWidth: 2,
            shadowBlur: 18,
            shadowColor: hexToRgba(spec.color, 0.75),
          },
        },
      },
    ],
  }
}

const cpuOption = computed<EChartsCoreOption>(() =>
  buildLineOption({
    name: 'CPU',
    color: '#0A84FF',
    data: samples.value.map((sample) => sample.cpu),
    axisLabel: (value) => `${value.toFixed(0)}%`,
    tooltipValue: (value) => `${value.toFixed(1)}%`,
  }),
)

const memoryOption = computed<EChartsCoreOption>(() =>
  buildLineOption({
    name: 'Memory',
    color: '#BF5AF2',
    data: samples.value.map((sample) => sample.memory),
    axisLabel: (value) => formatBytes(value),
    tooltipValue: (value) => formatBytes(value),
  }),
)

const goroutinesOption = computed<EChartsCoreOption>(() =>
  buildLineOption({
    name: 'Goroutines',
    color: '#30D158',
    data: samples.value.map((sample) => sample.goroutines),
    axisLabel: (value) => `${value}`,
    tooltipValue: (value) => `${value}`,
  }),
)

interface DonutItem {
  name: string
  value: number
  itemStyle: { color: string }
}

function toDonutItems(counts: Record<string, number>): DonutItem[] {
  return Object.entries(counts)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({
      name: name.replace(/_/g, ' '),
      value,
      itemStyle: { color: STATUS_COLORS[name] ?? '#0A84FF' },
    }))
}

const runsDonutItems = computed<DonutItem[]>(() => toDonutItems(store.snapshot.runs_by_status))
const tasksDonutItems = computed<DonutItem[]>(() => toDonutItems(store.snapshot.tasks_by_status))

const runsTotal = computed(() => runsDonutItems.value.reduce((sum, item) => sum + item.value, 0))
const tasksTotal = computed(() => tasksDonutItems.value.reduce((sum, item) => sum + item.value, 0))

function buildDonutOption(items: DonutItem[]): EChartsCoreOption {
  return {
    color: items.map((item) => item.itemStyle.color),
    tooltip: {
      trigger: 'item',
      backgroundColor: tooltipBackground.value,
      borderWidth: 0,
      padding: [8, 12],
      extraCssText: `box-shadow: 0 8px 24px ${tooltipShadow.value}; border-radius: 12px;`,
      textStyle: { color: textColor.value, fontSize: 12 },
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 0,
      top: 'middle',
      icon: 'circle',
      itemWidth: 9,
      itemHeight: 9,
      itemGap: 12,
      textStyle: { color: mutedTextColor.value, fontSize: 12 },
    },
    series: [
      {
        name: 'status',
        type: 'pie',
        radius: ['56%', '80%'],
        center: ['36%', '50%'],
        avoidLabelOverlap: true,
        padAngle: 2,
        itemStyle: {
          borderRadius: 6,
          borderColor: donutBorder.value,
          borderWidth: 2,
        },
        label: { show: false },
        labelLine: { show: false },
        emphasis: {
          scale: true,
          scaleSize: 6,
          itemStyle: { shadowBlur: 22, shadowColor: 'rgba(0,0,0,0.25)' },
        },
        data: items,
      },
    ],
  }
}

const runsDonutOption = computed<EChartsCoreOption>(() => buildDonutOption(runsDonutItems.value))
const tasksDonutOption = computed<EChartsCoreOption>(() => buildDonutOption(tasksDonutItems.value))

// --- Lifecycle -----------------------------------------------------------
let snapshotTimer: ReturnType<typeof setInterval> | undefined
let historyTimer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  void store.fetchSnapshot()
  void store.fetchHistory()
  snapshotTimer = setInterval(() => void store.fetchSnapshot(), SNAPSHOT_POLL_MS)
  historyTimer = setInterval(() => void store.fetchHistory(), HISTORY_POLL_MS)
})

onUnmounted(() => {
  if (snapshotTimer !== undefined) clearInterval(snapshotTimer)
  if (historyTimer !== undefined) clearInterval(historyTimer)
})
</script>

<template>
  <div class="flex min-h-full flex-col">
    <header
      class="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-black/5 bg-white/70 px-6 py-4 backdrop-blur-[20px] dark:border-white/[0.06] dark:bg-slate-900/70"
    >
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">Live overview of the agent hub</p>
      </div>
      <div class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <span class="relative flex h-2.5 w-2.5">
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style="background-color: #30d158"></span>
          <span class="relative inline-flex h-2.5 w-2.5 rounded-full" style="background-color: #30d158"></span>
        </span>
        Live
      </div>
    </header>

    <div class="flex-1 space-y-6 p-6">
      <div
        v-if="store.error"
        class="squircle bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
      >
        {{ store.error }}
      </div>

      <!-- Hero KPI row -->
      <div v-if="store.loading" class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="index in 4" :key="index" class="squircle panel h-28 animate-pulse bg-slate-100 dark:bg-slate-800" />
      </div>
      <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="kpi in kpis" :key="kpi.title" class="squircle panel p-5">
          <div class="flex items-start justify-between">
            <div>
              <div class="text-sm text-slate-500 dark:text-slate-400">{{ kpi.title }}</div>
              <div class="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ kpi.value }}</div>
              <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ kpi.detail }}</div>
            </div>
            <span
              class="mt-1 h-3 w-3 shrink-0 rounded-full"
              :style="{ backgroundColor: kpi.color, boxShadow: `0 0 12px ${hexToRgba(kpi.color, 0.6)}` }"
            />
          </div>
        </div>
      </div>

      <!-- Time-series charts -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div class="squircle panel p-5">
          <div class="mb-3 flex items-baseline justify-between">
            <h3 class="text-sm font-medium text-slate-500 dark:text-slate-400">CPU</h3>
            <span class="text-lg font-semibold text-slate-900 dark:text-white">{{ store.snapshot.system.cpu.toFixed(1) }}%</span>
          </div>
          <div v-if="store.loading" class="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <div v-else-if="hasHistory" class="h-40"><AppChart :option="cpuOption" /></div>
          <div v-else class="flex h-40 items-center justify-center text-sm text-slate-400 dark:text-slate-500">Waiting for telemetry…</div>
        </div>

        <div class="squircle panel p-5">
          <div class="mb-3 flex items-baseline justify-between">
            <h3 class="text-sm font-medium text-slate-500 dark:text-slate-400">Memory</h3>
            <span class="text-lg font-semibold text-slate-900 dark:text-white">{{ formatBytes(store.snapshot.system.memory) }}</span>
          </div>
          <div v-if="store.loading" class="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <div v-else-if="hasHistory" class="h-40"><AppChart :option="memoryOption" /></div>
          <div v-else class="flex h-40 items-center justify-center text-sm text-slate-400 dark:text-slate-500">Waiting for telemetry…</div>
        </div>

        <div class="squircle panel p-5">
          <div class="mb-3 flex items-baseline justify-between">
            <h3 class="text-sm font-medium text-slate-500 dark:text-slate-400">Goroutines</h3>
            <span class="text-lg font-semibold text-slate-900 dark:text-white">{{ store.snapshot.system.goroutines }}</span>
          </div>
          <div v-if="store.loading" class="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <div v-else-if="hasHistory" class="h-40"><AppChart :option="goroutinesOption" /></div>
          <div v-else class="flex h-40 items-center justify-center text-sm text-slate-400 dark:text-slate-500">Waiting for telemetry…</div>
        </div>
      </div>

      <!-- Status donuts -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div class="squircle panel p-5">
          <h3 class="mb-3 text-sm font-medium text-slate-500 dark:text-slate-400">Run Status</h3>
          <div v-if="store.loading" class="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <div v-else-if="runsTotal > 0" class="h-48"><AppChart :option="runsDonutOption" /></div>
          <div v-else class="flex h-48 items-center justify-center text-sm text-slate-400 dark:text-slate-500">No runs yet</div>
        </div>

        <div class="squircle panel p-5">
          <h3 class="mb-3 text-sm font-medium text-slate-500 dark:text-slate-400">Task Status</h3>
          <div v-if="store.loading" class="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <div v-else-if="tasksTotal > 0" class="h-48"><AppChart :option="tasksDonutOption" /></div>
          <div v-else class="flex h-48 items-center justify-center text-sm text-slate-400 dark:text-slate-500">No tasks yet</div>
        </div>
      </div>
    </div>
  </div>
</template>
