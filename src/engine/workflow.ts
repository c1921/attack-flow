// The simulation advances in game seconds, independently of rendering and wall time.
export interface WorkflowNode {
  id: string
  type?: string
  data: { duration: number; damage: number; hits: number; label: string }
}

export interface WorkflowEdge {
  source: string
  target: string
}
export interface DamageEvent {
  id: number
  nodeId: string
  label: string
  type: string
  damage: number
  time: number
  cycle: number
  hit: number
}

export function compileWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
  if (!nodes.length) throw new Error('请先添加一个攻击节点。')
  const byId = new Map(nodes.map((node) => [node.id, node]))
  if (byId.size !== nodes.length) throw new Error('节点编号重复，请重新添加节点。')
  const next = new Map<string, string>()
  const incoming = new Set<string>()
  for (const node of nodes) {
    const { duration, damage, hits } = node.data
    if (!['basic-attack', 'multi-attack', 'extra-damage', 'wait'].includes(node.type ?? '')) {
      throw new Error('存在不支持的节点类型。')
    }
    if (
      !Number.isFinite(duration) ||
      duration < 0.1 ||
      duration > 30 ||
      !Number.isFinite(damage) ||
      damage < 0 ||
      damage > 100000 ||
      !Number.isInteger(hits) ||
      hits < 1 ||
      hits > 20
    ) {
      throw new Error(`${node.data.label}的参数无效：耗时 0.1–30 秒，伤害 0–100000，次数 1–20。`)
    }
  }
  for (const edge of edges) {
    if (!byId.has(edge.source) || !byId.has(edge.target))
      throw new Error('连线指向了不存在的节点。')
    if (edge.source === edge.target) throw new Error('不能连接节点自身；攻击流会自动循环。')
    if (next.has(edge.source) || incoming.has(edge.target)) {
      throw new Error('请连接为单条攻击链：每个节点最多一个输入和一个输出。')
    }
    next.set(edge.source, edge.target)
    incoming.add(edge.target)
  }
  const roots = nodes.filter((node) => !incoming.has(node.id))
  if (roots.length !== 1) throw new Error('请将所有节点连接成一条链，保留一个起点；无需连接首尾。')
  const ordered: WorkflowNode[] = []
  const visited = new Set<string>()
  let id: string | undefined = roots[0]!.id
  while (id) {
    if (visited.has(id)) throw new Error('连线中存在环路；末尾会自动回到起点，无需手动连回。')
    visited.add(id)
    const node = byId.get(id)!
    ordered.push({ ...node, data: { ...node.data } })
    id = next.get(id)
  }
  if (ordered.length !== nodes.length) throw new Error('存在未接入攻击链的节点或环路，请检查连线。')
  if (!ordered.some((node) => node.type !== 'wait' && node.data.damage > 0)) {
    throw new Error('攻击链中至少需要一个能造成伤害的节点。')
  }
  return ordered
}

export class WorkflowRunner {
  readonly sequence: WorkflowNode[]
  elapsed = 0
  nodeElapsed = 0
  index = 0
  completedCycles = 0
  totalDamage = 0
  hitCount = 0
  private emittedHits = 0

  constructor(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
    this.sequence = compileWorkflow(nodes, edges)
  }

  get activeNode() {
    return this.sequence[this.index]!
  }
  get progress() {
    return this.nodeElapsed / this.activeNode.data.duration
  }

  advance(seconds: number): DamageEvent[] {
    if (!Number.isFinite(seconds) || seconds <= 0) return []
    const events: DamageEvent[] = []
    let remaining = seconds
    while (remaining > 0) {
      const node = this.activeNode
      const duration = node.data.duration
      const step = Math.min(remaining, duration - this.nodeElapsed)
      const nodeStartedAt = this.elapsed - this.nodeElapsed
      this.nodeElapsed += step
      this.elapsed += step
      remaining = Math.max(0, remaining - step)
      const hits = node.type === 'multi-attack' ? node.data.hits : 1
      const due = Math.min(hits, Math.floor(((this.nodeElapsed + 1e-9) / duration) * hits))
      while (this.emittedHits < due) {
        this.emittedHits++
        if (node.type === 'wait' || node.data.damage === 0) continue
        this.totalDamage += node.data.damage
        this.hitCount++
        events.push({
          id: this.hitCount,
          nodeId: node.id,
          label: node.data.label,
          type: node.type!,
          damage: node.data.damage,
          time: nodeStartedAt + (duration * this.emittedHits) / hits,
          cycle: this.completedCycles + 1,
          hit: this.emittedHits,
        })
      }
      if (this.nodeElapsed + 1e-9 < duration) break
      this.nodeElapsed = 0
      this.emittedHits = 0
      this.index++
      if (this.index === this.sequence.length) {
        this.index = 0
        this.completedCycles++
      }
    }
    return events
  }
}
