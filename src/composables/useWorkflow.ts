import { computed, onUnmounted, ref, type Ref } from 'vue'
import type { Edge } from '@vue-flow/core'
import type { AttackNode } from '../constants/nodes'
import { WorkflowRunner, type WorkflowEvent, type DamageEvent } from '../engine/workflow'

export function useWorkflow(nodes: Ref<AttackNode[]>, edges: Ref<Edge[]>) {
  const status = ref<'idle' | 'running' | 'paused'>('idle')
  const speed = ref(1)
  const elapsed = ref(0)
  const totalDamage = ref(0)
  const hitCount = ref(0)
  const completedCycles = ref(0)
  const events = ref<WorkflowEvent[]>([])
  const lastDamage = ref<DamageEvent>()
  const critChance = ref(0)
  const criticalReady = ref(false)
  const criticalHits = ref(0)
  const error = ref('')
  const activeId = ref('')
  const progress = ref(0)
  const locked = computed(() => status.value !== 'idle')
  const dps = computed(() => (elapsed.value ? totalDamage.value / elapsed.value : 0))
  let runner: WorkflowRunner | undefined
  let frame = 0
  let lastTime = 0

  function sync() {
    if (!runner) return
    elapsed.value = runner.elapsed
    totalDamage.value = runner.totalDamage
    hitCount.value = runner.hitCount
    completedCycles.value = runner.completedCycles
    activeId.value = runner.activeNode.id
    progress.value = runner.progress
    critChance.value = runner.critChance
    criticalReady.value = runner.criticalReady
    criticalHits.value = runner.criticalHits
    const finished = new Set(runner.sequence.slice(0, runner.index).map((node) => node.id))
    for (const node of nodes.value) {
      node.data = {
        ...node.data,
        locked: true,
        critChance: runner.critChance,
        criticalReady: runner.criticalReady,
        critResult: runner.criticalResults[node.id],
        state:
          node.id === activeId.value ? 'running' : finished.has(node.id) ? 'completed' : 'idle',
        progress: node.id === activeId.value ? progress.value : finished.has(node.id) ? 1 : 0,
      }
    }
    for (const edge of edges.value)
      edge.animated = status.value === 'running' && edge.target === activeId.value
  }

  function tick(time: number) {
    if (status.value !== 'running' || !runner) return
    const delta = Math.max(0, (time - lastTime) / 1000)
    lastTime = time
    if (!document.hidden) {
      const hits = runner.advance(delta * speed.value)
      if (hits.length) {
        hits.reverse()
        const latest = hits.find((event): event is DamageEvent => event.kind === 'damage')
        if (latest) lastDamage.value = latest
        events.value = [...hits, ...events.value].slice(0, 60)
      }
      sync()
    }
    frame = requestAnimationFrame(tick)
  }

  function start() {
    if (status.value === 'running') return
    error.value = ''
    if (status.value === 'idle') {
      try {
        runner = new WorkflowRunner(nodes.value, edges.value)
      } catch (cause) {
        error.value = cause instanceof Error ? cause.message : '攻击流无法运行。'
        return
      }
    }
    status.value = 'running'
    sync()
    lastTime = performance.now()
    frame = requestAnimationFrame(tick)
  }

  function pause() {
    if (status.value !== 'running') return
    status.value = 'paused'
    cancelAnimationFrame(frame)
    sync()
  }

  function reset() {
    cancelAnimationFrame(frame)
    runner = undefined
    status.value = 'idle'
    elapsed.value = totalDamage.value = hitCount.value = completedCycles.value = progress.value = 0
    activeId.value = error.value = ''
    events.value = []
    lastDamage.value = undefined
    critChance.value = criticalHits.value = 0
    criticalReady.value = false
    for (const node of nodes.value)
      node.data = {
        ...node.data,
        state: 'idle',
        progress: 0,
        locked: false,
        critChance: 0,
        criticalReady: false,
        critResult: undefined,
      }
    for (const edge of edges.value) edge.animated = false
  }

  // Reset the clock anchor on tab switches, so hidden time never becomes catch-up damage.
  function onVisibilityChange() {
    lastTime = performance.now()
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
  onUnmounted(() => {
    cancelAnimationFrame(frame)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })
  return {
    status,
    speed,
    elapsed,
    totalDamage,
    hitCount,
    completedCycles,
    events,
    lastDamage,
    critChance,
    criticalReady,
    criticalHits,
    error,
    activeId,
    progress,
    locked,
    dps,
    start,
    pause,
    reset,
  }
}
