import { computed, onUnmounted, ref, type Ref } from 'vue'
import type { Edge } from '@vue-flow/core'
import type { AttackNode } from '../constants/nodes'
import { WorkflowRunner, type DamageEvent } from '../engine/workflow'

export function useWorkflow(nodes: Ref<AttackNode[]>, edges: Ref<Edge[]>) {
  const status = ref<'idle' | 'running' | 'paused'>('idle')
  const speed = ref(1)
  const elapsed = ref(0)
  const totalDamage = ref(0)
  const hitCount = ref(0)
  const completedCycles = ref(0)
  const events = ref<DamageEvent[]>([])
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
    const finished = new Set(runner.sequence.slice(0, runner.index).map((node) => node.id))
    for (const node of nodes.value) {
      node.data = {
        ...node.data,
        locked: true,
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
      if (hits.length) events.value = [...hits.reverse(), ...events.value].slice(0, 60)
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
    for (const node of nodes.value)
      node.data = { ...node.data, state: 'idle', progress: 0, locked: false }
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
