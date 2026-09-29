import { NODE_PRESETS } from './nodes'

export const NODE_TYPE_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(NODE_PRESETS).map(([type, preset]) => [type, preset.color]),
)
