/** 端口类型 → 端口颜色（与 main.css 中的 CSS 变量值保持一致） */
export const PORT_COLORS: Record<number, string> = {
  1: '#c7c729',
  2: '#63c763',
  3: '#6363c7',
  4: '#a1a1a1',
}

/** 通过端口类型获取颜色 hex 值 */
export function getPortColor(portType: number): string {
  return PORT_COLORS[portType] ?? '#888888'
}

/** 节点类型 → 头部背景色（与 main.css 中的 --color-node-* 变量值保持一致） */
export const NODE_COLORS = {
  A: '#82354c',
  B: '#2b652b',
  C: '#3c3c83',
  D: '#246283',
  E: '#6e6e23',
  F: '#79461d',
} as const

/** 将 NODE_COLORS 中的 hex 值转为 CSS 变量引用，供 BaseNode 模板使用 */
export function nodeColorAsCssVar(nodeType: string): string {
  return `var(--color-node-${nodeType.toLowerCase()})`
}

/** VueFlow 节点 type → 节点头部颜色，供 miniMapNodeColor 及未来查找使用 */
export const NODE_TYPE_COLORS: Record<string, string> = {
  'object-info': NODE_COLORS.A,
  'scene-info': NODE_COLORS.B,
  'process-node': NODE_COLORS.C,
}
