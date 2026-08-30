// Shared Apple HIG palette. Single source of truth for chart series, node
// accents and status donuts so the whole UI stays on the same color system.
export const PALETTE = {
  blue: '#0A84FF',
  mint: '#30D158',
  lavender: '#BF5AF2',
  peach: '#FF9F0A',
  rose: '#FF375F',
} as const

export type PaletteKey = keyof typeof PALETTE

// Node type → accent color (flow editor pastel accents).
export const NODE_COLORS: Record<string, string> = {
  trigger: PALETTE.blue,
  agent: PALETTE.mint,
  mcp_tool: PALETTE.lavender,
  condition: PALETTE.peach,
  output: PALETTE.rose,
}

// Status → donut segment color (dashboard runs / tasks breakdown).
export const STATUS_COLORS: Record<string, string> = {
  success: PALETTE.mint,
  failed: PALETTE.rose,
  rolled_back: PALETTE.peach,
  pending: PALETTE.lavender,
  running: PALETTE.blue,
}

export function nodeColor(type: string): string {
  return NODE_COLORS[type] ?? PALETTE.blue
}

export function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? PALETTE.blue
}

// Convert a `#RRGGBB` hex color to an `rgba()` string with the given alpha.
// Used to build fading chart gradients and soft glows without a color lib.
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  const safe = Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)
  if (!safe) return `rgba(10, 132, 255, ${alpha})`
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
