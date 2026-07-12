import type { PortItem } from '../components/BaseNode.vue'

/** 每种节点类型的完整配置 */
export interface NodePreset {
  /** BaseNode 的 node-type 属性（A/B/C…） */
  nodeType: string
  /** 显示标题 */
  label: string
  /** 端口列表 */
  items: PortItem[]
}

export const NODE_PRESETS: Record<string, NodePreset> = {
  'object-info': {
    nodeType: 'A',
    label: '物体信息',
    items: [
      { label: '位置', portType: 1 },
      { label: '颜色', portType: 2 },
      { label: 'Alpha', portType: 3 },
      { label: '物体编号', portType: 3 },
      { label: '材质编号', portType: 3 },
    ],
  },
  'scene-info': {
    nodeType: 'B',
    label: '场景信息',
    items: [
      { label: '场景名称', portType: 4 },
      { label: '光照类型', portType: 3 },
      { label: '环境光色', portType: 3 },
      { label: '阴影', portType: 1 },
      { label: '雾效强度', portType: 1 },
    ],
  },
  'process-node': {
    nodeType: 'C',
    label: '光照处理',
    items: [
      { label: '光照类型', portType: 3 },
      { label: '环境光色', portType: 3 },
      { label: '阴影', portType: 1 },
      { label: '雾效强度', portType: 1 },
      { label: '最终光照', portType: 2, handleType: 'source' },
      { label: '阴影贴图', portType: 4, handleType: 'source' },
    ],
  },
}
