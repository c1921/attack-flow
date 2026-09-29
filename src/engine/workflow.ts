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
interface EventBase {
  id: number
  nodeId: string
  label: string
  type: string
  time: number
  cycle: number
}
export interface DamageEvent extends EventBase {
  kind: 'damage'
  damage: number
  hit: number
  critical: boolean
}
export interface CriticalEvent extends EventBase {
  kind: 'critical'
  damage: 0
  hit: 0
  success: boolean
  chanceBefore: number
  chanceAfter: number
}
export type WorkflowEvent = DamageEvent | CriticalEvent

export function isDamageType(type: string | undefined) {
  return type === 'basic-attack' || type === 'multi-attack' || type === 'extra-damage'
}

/** Validate a connection while the graph is still being edited (and may be incomplete). */
export function connectionError(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  source: string,
  target: string,
): string {
  const sourceNode = nodes.find((node) => node.id === source)
  if (!sourceNode || !nodes.some((node) => node.id === target)) return '连线指向了不存在的节点。'
  if (sourceNode.type === 'output') return '输出节点是唯一终点，不能再连接后续节点。'
  if (source === target) return '不能连接节点自身。'
  if (edges.some((edge) => edge.source === source && edge.target === target))
    return '这条连线已存在。'
  const visited = new Set<string>()
  const stack = [target]
  while (stack.length) {
    const id = stack.pop()!
    if (id === source) return '不能创建环路；输出节点完成后会自动开始下一轮。'
    if (visited.has(id)) continue
    visited.add(id)
    for (const edge of edges) if (edge.source === id) stack.push(edge.target)
  }
  return ''
}

export function compileWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
  if (!nodes.length) throw new Error('请先添加攻击节点和一个输出节点。')
  const byId = new Map(nodes.map((node) => [node.id, node]))
  if (byId.size !== nodes.length) throw new Error('节点编号重复，请重新添加节点。')
  const outputs = nodes.filter((node) => node.type === 'output')
  if (outputs.length !== 1)
    throw new Error('工作流必须有且只有一个输出节点，所有路径最终都要通向它。')
  const output = outputs[0]!
  const next = new Map(nodes.map((node) => [node.id, [] as string[]]))
  const incoming = new Map(nodes.map((node) => [node.id, 0]))
  for (const node of nodes) {
    const { duration, damage, hits } = node.data
    if (
      !['basic-attack', 'multi-attack', 'extra-damage', 'wait', 'critical', 'output'].includes(
        node.type ?? '',
      )
    ) {
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
  const seenEdges = new Set<string>()
  for (const edge of edges) {
    if (!byId.has(edge.source) || !byId.has(edge.target))
      throw new Error('连线指向了不存在的节点。')
    if (edge.source === output.id) throw new Error('输出节点是唯一终点，不能再连接后续节点。')
    if (edge.source === edge.target) throw new Error('不能连接节点自身。')
    const key = JSON.stringify([edge.source, edge.target])
    if (seenEdges.has(key)) throw new Error('存在重复连线，请删除后重试。')
    seenEdges.add(key)
    next.get(edge.source)!.push(edge.target)
    incoming.set(edge.target, incoming.get(edge.target)! + 1)
  }
  for (const node of nodes) {
    if (node.id !== output.id && !next.get(node.id)!.length) {
      throw new Error(`${node.data.label}没有通向输出节点，请将所有路径接入唯一输出节点。`)
    }
  }
  // Stable topological order: ready nodes run serially in ID order, shared successors once.
  const compareIds = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true })
  const ready = nodes
    .filter((node) => incoming.get(node.id) === 0)
    .map((node) => node.id)
    .sort(compareIds)
  const ordered: WorkflowNode[] = []
  while (ready.length) {
    const id = ready.shift()!
    const node = byId.get(id)!
    ordered.push({ ...node, data: { ...node.data } })
    for (const target of next.get(id)!) {
      const count = incoming.get(target)! - 1
      incoming.set(target, count)
      if (count === 0) ready.push(target)
    }
    ready.sort(compareIds)
  }
  if (ordered.length !== nodes.length)
    throw new Error('连线中存在环路；所有路径必须最终通向输出节点。')
  // In an acyclic graph with one sink, every node reaches that sink.
  if (ordered.at(-1)?.id !== output.id) throw new Error('所有节点必须最终通向唯一输出节点。')
  if (!ordered.some((node) => isDamageType(node.type) && node.data.damage > 0)) {
    throw new Error('工作流中至少需要一个能造成伤害的节点。')
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
  critChance = 0
  criticalReady = false
  criticalHits = 0
  criticalResults: Record<string, 'success' | 'failure'> = {}
  private emittedHits = 0
  private eventId = 0
  private random: () => number

  constructor(nodes: WorkflowNode[], edges: WorkflowEdge[], random: () => number = Math.random) {
    this.sequence = compileWorkflow(nodes, edges)
    this.random = random
  }

  get activeNode() {
    return this.sequence[this.index]!
  }
  get progress() {
    return this.nodeElapsed / this.activeNode.data.duration
  }

  advance(seconds: number): WorkflowEvent[] {
    if (!Number.isFinite(seconds) || seconds <= 0) return []
    const events: WorkflowEvent[] = []
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
        const event = {
          nodeId: node.id,
          label: node.data.label,
          type: node.type!,
          time: nodeStartedAt + (duration * this.emittedHits) / hits,
          cycle: this.completedCycles + 1,
        }
        if (node.type === 'critical') {
          const chanceBefore = this.critChance
          const success = chanceBefore === 100 || this.random() * 100 < chanceBefore
          this.critChance = success ? 0 : Math.min(100, chanceBefore + 5)
          if (success) this.criticalReady = true
          this.criticalResults[node.id] = success ? 'success' : 'failure'
          events.push({
            ...event,
            id: ++this.eventId,
            kind: 'critical',
            damage: 0,
            hit: 0,
            success,
            chanceBefore,
            chanceAfter: this.critChance,
          })
          continue
        }
        if (!isDamageType(node.type) || node.data.damage === 0) continue
        const critical = this.criticalReady
        const damage = node.data.damage * (critical ? 2 : 1)
        this.criticalReady = false
        if (critical) this.criticalHits++
        this.totalDamage += damage
        this.hitCount++
        events.push({
          ...event,
          id: ++this.eventId,
          kind: 'damage',
          damage,
          critical,
          hit: this.emittedHits,
        })
      }
      if (this.nodeElapsed + 1e-9 < duration) break
      this.nodeElapsed = 0
      this.emittedHits = 0
      if (node.type === 'output') {
        this.index = 0
        this.completedCycles++
        this.criticalResults = {}
      } else {
        this.index++
      }
    }
    return events
  }
}
