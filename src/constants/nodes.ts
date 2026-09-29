import type { Node } from '@vue-flow/core'

export type AttackType =
  | 'basic-attack'
  | 'multi-attack'
  | 'extra-damage'
  | 'wait'
  | 'critical'
  | 'output'
export type AttackNode = Node<AttackNodeData> & { data: AttackNodeData }

export interface AttackConfig {
  duration: number
  damage: number
  hits: number
}

export interface AttackNodeData extends AttackConfig {
  label: string
  state?: 'idle' | 'running' | 'completed'
  progress?: number
  locked?: boolean
  critChance?: number
  criticalReady?: boolean
  critResult?: 'success' | 'failure'
}

export interface NodePreset {
  label: string
  icon: string
  color: string
  description: string
  defaults: AttackConfig
}

export const NODE_PRESETS: Record<AttackType, NodePreset> = {
  'basic-attack': {
    label: '基础攻击',
    icon: '↗',
    color: '#e9b86c',
    description: '蓄力结束后，造成一次基础伤害。',
    defaults: { duration: 1, damage: 100, hits: 1 },
  },
  'multi-attack': {
    label: '多重攻击',
    icon: '»',
    color: '#a89afa',
    description: '在持续时间内，等间隔进行多次攻击。',
    defaults: { duration: 1.5, damage: 60, hits: 3 },
  },
  'extra-damage': {
    label: '额外伤害',
    icon: '✧',
    color: '#77d8bc',
    description: '短暂延迟后，追加一次独立伤害。',
    defaults: { duration: 0.4, damage: 40, hits: 1 },
  },
  wait: {
    label: '等待',
    icon: '◷',
    color: '#8aa6c4',
    description: '等待一段时间，再执行下一个节点。',
    defaults: { duration: 0.6, damage: 0, hits: 1 },
  },
  critical: {
    label: '暴击',
    icon: 'ϟ',
    color: '#f18d9c',
    description: '完成时按当前暴击率判定；成功清零，失败累加 5 个百分点，上限 100%。',
    defaults: { duration: 0.3, damage: 0, hits: 1 },
  },
  output: {
    label: '输出',
    icon: '⇥',
    color: '#c8d885',
    description: '唯一终点，所有路径必须汇入此处。执行完成后开始下一轮。',
    defaults: { duration: 0.2, damage: 0, hits: 1 },
  },
}

export function isAttackType(type: string | undefined): type is AttackType {
  return type !== undefined && Object.hasOwn(NODE_PRESETS, type)
}
