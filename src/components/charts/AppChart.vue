<script setup lang="ts">
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, PieChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import type { EChartsCoreOption } from 'echarts/core'

// Tree-shaken registration: only the line/pie series + grid/tooltip/legend
// components and the canvas renderer are pulled into the bundle.
use([CanvasRenderer, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent])

defineProps<{
  option: EChartsCoreOption
}>()
</script>

<template>
  <VChart class="h-full w-full" :option="option" autoresize />
</template>
