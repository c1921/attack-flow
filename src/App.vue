<script setup lang="ts">
import { computed, markRaw, nextTick, onMounted, onUnmounted, ref, type Ref } from 'vue'
import {
  MarkerType,
  VueFlow,
  useVueFlow,
  type Connection,
  type Edge,
  type NodeComponent,
} from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/minimap/dist/style.css'
import '@vue-flow/controls/dist/style.css'
import DynamicNode from './components/DynamicNode.vue'
import CanvasContextMenu from './components/CanvasContextMenu.vue'
import { NODE_PRESETS, isAttackType, type AttackNode, type AttackType } from './constants/nodes'
import { NODE_TYPE_COLORS } from './constants/colors'
import { compileWorkflow, connectionError, isDamageType, type DamageEvent } from './engine/workflow'
import { useWorkflow } from './composables/useWorkflow'

const { screenToFlowCoordinate, fitView } = useVueFlow()
const nodeTypes = Object.fromEntries(
  Object.keys(NODE_PRESETS).map((key) => [key, markRaw(DynamicNode)]),
) as Record<string, NodeComponent>
const canvas = ref<HTMLElement>()
let resizeFrame = 0
const resizeObserver = new ResizeObserver(() => {
  cancelAnimationFrame(resizeFrame)
  resizeFrame = requestAnimationFrame(() => fitView({ padding: 0.22 }))
})
onMounted(() => {
  if (canvas.value) resizeObserver.observe(canvas.value)
})
onUnmounted(() => {
  resizeObserver.disconnect()
  cancelAnimationFrame(resizeFrame)
})
let nextId = 7

function createNode(id: string, type: AttackType, position: { x: number; y: number }): AttackNode {
  const preset = NODE_PRESETS[type]
  return {
    id,
    type,
    position,
    deletable: type !== 'output',
    data: { label: preset.label, ...preset.defaults, state: 'idle', progress: 0 },
  }
}

const nodes = ref() as Ref<AttackNode[]>
nodes.value = [
  createNode('5', 'critical', { x: 50, y: 100 }),
  createNode('1', 'basic-attack', { x: 340, y: 100 }),
  createNode('2', 'multi-attack', { x: 630, y: 100 }),
  createNode('3', 'extra-damage', { x: 50, y: 350 }),
  createNode('4', 'wait', { x: 340, y: 350 }),
  createNode('6', 'output', { x: 630, y: 350 }),
]

function createEdge(source: string, target: string): Edge {
  const sourceNode = nodes.value.find((node) => node.id === source)
  const color = NODE_TYPE_COLORS[sourceNode?.type ?? ''] ?? '#8aa6c4'
  return {
    id: `e-${source}-${target}`,
    source,
    target,
    sourceHandle: 'out',
    targetHandle: 'in',
    type: 'smoothstep',
    style: { stroke: color, strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
  }
}

const edges = ref() as Ref<Edge[]>
edges.value = [
  createEdge('5', '1'),
  createEdge('1', '2'),
  createEdge('2', '3'),
  createEdge('3', '4'),
  createEdge('4', '6'),
]
const {
  status,
  speed,
  elapsed,
  totalDamage,
  hitCount,
  completedCycles,
  events,
  lastDamage: lastHit,
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
} = useWorkflow(nodes, edges)
const selectedId = ref('5')
const hasOutput = computed(() => nodes.value.some((node) => node.type === 'output'))
const selectedNode = computed(() => nodes.value.find((node) => node.id === selectedId.value))
const selectedPreset = computed(() =>
  selectedNode.value && isAttackType(selectedNode.value.type)
    ? NODE_PRESETS[selectedNode.value.type]
    : undefined,
)
const activeNode = computed(() => nodes.value.find((node) => node.id === activeId.value))
const sequence = computed(() => {
  try {
    return compileWorkflow(nodes.value, edges.value)
  } catch {
    return []
  }
})
const cycleDuration = computed(() =>
  sequence.value.reduce((total, node) => total + node.data.duration, 0),
)
const cycleDamage = computed(() =>
  sequence.value.reduce(
    (total, node) =>
      total +
      (isDamageType(node.type)
        ? node.data.damage * (node.type === 'multi-attack' ? node.data.hits : 1)
        : 0),
    0,
  ),
)
const damageEvents = computed(() =>
  events.value.filter((event): event is DamageEvent => event.kind === 'damage'),
)
const floatingHits = computed(() =>
  damageEvents.value.filter((event) => elapsed.value - event.time < 1.1).slice(0, 5),
)
const recentHit = computed(() => lastHit.value && elapsed.value - lastHit.value.time < 0.18)
const statusLabel = computed(
  () => ({ idle: '准备就绪', running: '运行中', paused: '已暂停' })[status.value],
)

function onConnect(connection: Connection) {
  if (locked.value) return
  const { source, target, sourceHandle, targetHandle } = connection
  if (sourceHandle !== 'out' || targetHandle !== 'in') return
  error.value = connectionError(nodes.value, edges.value, source, target)
  if (error.value) return
  edges.value.push(createEdge(source, target))
  error.value = ''
}

async function addNode(type: string, screenPos?: { x: number; y: number }) {
  if (locked.value || !isAttackType(type)) return
  if (type === 'output' && hasOutput.value) {
    error.value = '工作流只能有一个输出节点。'
    return
  }
  const rect = canvas.value?.getBoundingClientRect()
  const position = screenPos
    ? screenToFlowCoordinate(screenPos)
    : screenToFlowCoordinate({
        x: (rect?.left ?? 0) + (rect?.width ?? 600) / 2 + (nextId % 3) * 24,
        y: (rect?.top ?? 0) + (rect?.height ?? 400) / 2 + (nextId % 3) * 24,
      })
  const id = String(nextId++)
  nodes.value.push(createNode(id, type, position))
  selectedId.value = id
  error.value = ''
  await nextTick()
  fitView({ padding: 0.22, duration: 250 })
}

function updateConfig(field: 'duration' | 'damage' | 'hits', event: Event) {
  if (locked.value || !selectedNode.value) return
  const input = event.target as HTMLInputElement
  const value = Number(input.value)
  const previous = selectedNode.value.data[field]
  const min = field === 'duration' ? 0.1 : field === 'hits' ? 1 : 0
  const max = field === 'duration' ? 30 : field === 'hits' ? 20 : 100000
  const clamped =
    input.value === '' || !Number.isFinite(value) ? previous : Math.min(max, Math.max(min, value))
  const normalized = field === 'duration' ? Math.round(clamped * 10) / 10 : Math.round(clamped)
  selectedNode.value.data = { ...selectedNode.value.data, [field]: normalized }
  input.value = String(normalized)
  error.value = ''
}

function removeSelected() {
  if (locked.value || !selectedNode.value || selectedNode.value.type === 'output') return
  const id = selectedId.value
  nodes.value = nodes.value.filter((node) => node.id !== id)
  edges.value = edges.value.filter((edge) => edge.source !== id && edge.target !== id)
  selectedId.value = ''
  error.value = ''
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${(seconds % 60).toFixed(1).padStart(4, '0')}`
}
function number(value: number) {
  return value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="brand">
        <span class="brand-mark">↯</span>
        <div>
          <h1>ATTACK FLOW</h1>
          <span>攻击流实验室</span>
        </div>
      </div>
      <div class="project-title">
        <span class="project-dot" />训练场 / <strong>连击实验</strong
        ><span class="version-badge">SANDBOX</span>
      </div>
      <div class="header-status"><span :class="['status-dot', status]" />{{ statusLabel }}</div>
    </header>

    <div class="workspace">
      <aside class="library-panel">
        <div class="section-heading">
          <h2>节点库</h2>
          <span>{{ Object.keys(NODE_PRESETS).length.toString().padStart(2, '0') }}</span>
        </div>
        <p class="muted library-hint">点击添加，连接你的攻击节奏。</p>
        <div class="node-library">
          <button
            v-for="(preset, type) in NODE_PRESETS"
            :key="type"
            class="palette-node"
            :disabled="locked || (type === 'output' && hasOutput)"
            :style="{ '--accent': preset.color }"
            @click="addNode(type)"
          >
            <span class="palette-icon">{{ preset.icon }}</span>
            <span
              ><strong>{{ preset.label }}</strong
              ><small
                >{{ preset.defaults.duration.toFixed(1) }}s ·
                {{
                  type === 'output'
                    ? '唯一终点'
                    : type === 'critical'
                      ? '概率判定'
                      : type === 'wait'
                        ? '节奏控制'
                        : type === 'multi-attack'
                          ? '连续命中'
                          : '伤害输出'
                }}</small
              ></span
            >
            <span class="palette-add">+</span>
          </button>
        </div>

        <section class="inspector">
          <div class="section-heading">
            <h2>节点参数</h2>
            <span v-if="selectedNode">#{{ selectedNode.id.padStart(2, '0') }}</span>
          </div>
          <template v-if="selectedNode && selectedPreset">
            <div class="inspector-title" :style="{ color: selectedPreset.color }">
              {{ selectedPreset.icon }} {{ selectedPreset.label }}
            </div>
            <p class="muted inspector-description">{{ selectedPreset.description }}</p>
            <label class="field-label" for="duration">执行耗时 <span>秒</span></label>
            <input
              id="duration"
              type="number"
              min="0.1"
              max="30"
              step="0.1"
              :value="selectedNode.data.duration"
              :disabled="locked"
              @change="updateConfig('duration', $event)"
            />
            <template v-if="isDamageType(selectedNode.type)">
              <label class="field-label" for="damage">单次伤害 <span>DMG</span></label>
              <input
                id="damage"
                type="number"
                min="0"
                max="100000"
                step="10"
                :value="selectedNode.data.damage"
                :disabled="locked"
                @change="updateConfig('damage', $event)"
              />
            </template>
            <template v-if="selectedNode.type === 'multi-attack'">
              <label class="field-label" for="hits">攻击次数 <span>次</span></label>
              <input
                id="hits"
                type="number"
                min="1"
                max="20"
                step="1"
                :value="selectedNode.data.hits"
                :disabled="locked"
                @change="updateConfig('hits', $event)"
              />
            </template>
            <p v-if="selectedNode.type === 'critical'" class="node-rule-note">
              初始 0%，跨轮累加；成功后下一次命中 ×2，暴击效果不叠加。
            </p>
            <p v-if="selectedNode.type === 'output'" class="node-rule-note">
              保留唯一输出节点；所有分支执行完成后在此结束本轮。
            </p>
            <button
              class="delete-button"
              :disabled="locked || selectedNode.type === 'output'"
              @click="removeSelected"
            >
              删除节点
            </button>
          </template>
          <p v-else class="muted inspector-description">选择画布中的节点，调整伤害与执行耗时。</p>
          <p v-if="locked" class="lock-hint">重置后可继续编辑攻击流。</p>
        </section>
        <div class="library-footer"><span>◇</span> 每一次连接，都是新的连招。</div>
      </aside>

      <main class="editor-panel">
        <div class="editor-toolbar">
          <div>
            <h2>攻击工作流</h2>
            <p>{{ nodes.length }} 个节点 <span>·</span> {{ edges.length }} 条连接</p>
          </div>
          <div class="run-controls">
            <select v-model.number="speed" aria-label="运行倍速">
              <option :value="0.5">0.5×</option>
              <option :value="1">1×</option>
              <option :value="2">2×</option>
              <option :value="4">4×</option>
            </select>
            <button class="reset-button" @click="reset"><span>↺</span> 重置</button>
            <button
              class="run-button"
              :class="{ 'is-running': status === 'running' }"
              @click="status === 'running' ? pause() : start()"
            >
              <span>{{ status === 'running' ? 'Ⅱ' : '▶' }}</span>
              {{ status === 'running' ? '暂停' : status === 'paused' ? '继续运行' : '运行攻击流' }}
            </button>
          </div>
        </div>

        <div class="stats-strip">
          <div>
            <span>游戏时间</span><strong data-testid="elapsed">{{ formatTime(elapsed) }}</strong>
          </div>
          <div>
            <span>累计伤害</span
            ><strong class="damage-value" data-testid="total-damage">{{
              number(totalDamage)
            }}</strong>
          </div>
          <div>
            <span>平均 DPS</span><strong>{{ dps.toFixed(1) }}</strong>
          </div>
          <div>
            <span>已完成循环</span
            ><strong data-testid="cycles"
              >{{ completedCycles.toString().padStart(2, '0') }}<small>轮</small></strong
            >
          </div>
        </div>

        <div v-if="error" class="error-banner" role="alert">
          <span>{{ error }}</span
          ><button aria-label="关闭提示" @click="error = ''">×</button>
        </div>
        <div ref="canvas" class="flow-canvas">
          <div class="canvas-caption">
            <span class="live-dot" />{{ locked ? '执行预览' : '编排画布'
            }}<span class="auto-loop">∞ 自动循环</span>
          </div>
          <CanvasContextMenu :disabled="locked" :has-output="hasOutput" @add-node="addNode">
            <VueFlow
              v-model:nodes="nodes"
              v-model:edges="edges"
              :node-types="nodeTypes"
              :nodes-connectable="!locked"
              :edges-updatable="false"
              :delete-key-code="locked ? null : ['Backspace', 'Delete']"
              :min-zoom="0.25"
              :max-zoom="1.8"
              fit-view-on-init
              :fit-view-params="{ padding: 0.22 }"
              :connection-line-style="{ stroke: '#b4a1ff', strokeWidth: 2 }"
              @connect="onConnect"
              @node-click="selectedId = $event.node.id"
              @pane-click="selectedId = ''"
            >
              <Background pattern-color="#343744" :gap="22" :size="1" />
              <MiniMap
                pannable
                zoomable
                :node-color="(node) => NODE_TYPE_COLORS[node.type ?? ''] ?? '#888'"
                node-stroke-color="transparent"
                :node-border-radius="4"
                mask-color="#0e101980"
                :style="{ backgroundColor: '#20232d' }"
              />
              <Controls :show-interactive="false" />
            </VueFlow>
          </CanvasContextMenu>
          <div v-if="!nodes.length" class="canvas-empty">从左侧添加节点，开始编排攻击流。</div>
          <div class="canvas-help">拖动端口连接节点 · 选中连线后按 Delete 删除 · 右键添加节点</div>
        </div>

        <section class="timeline-panel">
          <div class="section-heading">
            <h2><span class="timeline-icon">≋</span> 执行时间线</h2>
            <span v-if="sequence.length">{{ cycleDuration.toFixed(1) }}s / 轮</span>
          </div>
          <div v-if="sequence.length" class="timeline-track">
            <div
              v-for="node in sequence"
              :key="node.id"
              class="timeline-segment"
              :class="{ active: activeId === node.id }"
              :style="{
                flex: node.data.duration,
                '--segment-color': NODE_TYPE_COLORS[node.type ?? ''],
              }"
            >
              <div
                class="timeline-fill"
                :style="{
                  width: `${(nodes.find((n) => n.id === node.id)?.data.progress ?? 0) * 100}%`,
                }"
              />
              <span>{{ node.data.label }}</span
              ><small>{{ node.data.duration.toFixed(1) }}s</small>
            </div>
            <span class="loop-symbol" title="结束后自动循环">↻</span>
          </div>
          <p v-else class="muted">将所有路径接入唯一输出节点，即可预览执行时间线。</p>
          <div class="timeline-footer">
            <span>{{
              activeNode
                ? `${status === 'paused' ? '暂停于' : '正在执行'} · ${activeNode.data.label} ${Math.round(progress * 100)}%`
                : '所有路径汇入输出节点；输出完成后自动开始下一轮。'
            }}</span
            ><span
              >基础单轮伤害 <b>{{ number(cycleDamage) }}</b></span
            >
          </div>
        </section>
        <details class="workflow-rules">
          <summary>工作流规则 · 唯一输出终点 · 暴击判定</summary>
          <ul>
            <li>必须且只能有一个输出节点。所有路径必须汇入它；输出节点没有输出端口，不可删除。</li>
            <li>
              支持分支和合流，按依赖顺序串行执行。多个节点同时就绪时按编号排序，每个节点每轮执行一次。
            </li>
            <li>
              暴击率初始为 0%，所有暴击节点共享并跨轮保留。每次节点执行完成时判定，失败增加 5
              个百分点，上限 100%；成功清零。
            </li>
            <li>
              暴击成功后下一次非零伤害命中
              ×2，随后消耗。等待、输出及零伤害不消耗；多重攻击仅一次命中翻倍。未消耗效果可跨轮保留，多次成功不叠加。
            </li>
            <li>
              所有节点结束后执行输出节点，再开始新一轮。暂停保留暴击状态，重置清空暴击率与待触发效果。
            </li>
          </ul>
        </details>
      </main>

      <aside class="battle-panel">
        <div class="section-heading">
          <h2>训练场</h2>
          <span class="practice-badge">无尽模式</span>
        </div>
        <div class="target-stage" :class="{ impact: recentHit }">
          <div class="target-grid" />
          <div class="target-orbit orbit-one" />
          <div class="target-orbit orbit-two" />
          <svg class="training-target" viewBox="0 0 160 190" aria-label="训练木桩" role="img">
            <ellipse cx="80" cy="170" rx="48" ry="10" fill="#000" opacity=".25" />
            <path d="M70 108h20v58H70z" fill="#665243" />
            <path d="M80 108h10v58H80z" fill="#463f3a" />
            <path d="M46 164h68v9H46z" fill="#7b6450" />
            <path d="M24 75h112v17H24z" fill="#927455" />
            <path d="M25 87h110v5H25z" fill="#5e5144" />
            <path d="M65 27l15-7 15 7 3 25-18 11-18-11z" fill="#c2a482" />
            <path d="M80 20l15 7 3 25-18 11z" fill="#8d735c" />
            <path d="M55 64l25-10 25 10 7 58-32 13-32-13z" fill="#aa8967" />
            <path d="M80 54l25 10 7 58-32 13z" fill="#80674f" />
            <circle cx="80" cy="94" r="25" fill="#473e38" stroke="#d2b28c" stroke-width="3" />
            <circle cx="80" cy="94" r="16" fill="none" stroke="#bd9670" stroke-width="3" />
            <circle cx="80" cy="94" r="6" fill="#e9b86c" />
            <path d="M61 35h12m14 0h7" stroke="#493d34" stroke-width="3" />
          </svg>
          <div
            v-for="(hit, index) in floatingHits"
            :key="hit.id"
            class="floating-damage"
            :style="{
              color: NODE_TYPE_COLORS[hit.type],
              left: `${35 + (hit.id % 3) * 13}%`,
              top: `${25 + index * 7}%`,
              animationPlayState: status === 'paused' ? 'paused' : 'running',
            }"
          >
            {{ hit.critical ? '暴击 ' : '' }}-{{ number(hit.damage) }}
          </div>
          <div class="target-label"><strong>训练木桩</strong><span>无限生命 · 无护甲</span></div>
        </div>
        <div class="target-health">
          <span>HP</span>
          <div />
          <strong>∞</strong>
        </div>
        <div class="hit-summary">
          <div>
            <span>命中次数</span><strong data-testid="hit-count">{{ hitCount }}</strong>
          </div>
          <div>
            <span>最近伤害</span
            ><strong :style="{ color: lastHit ? NODE_TYPE_COLORS[lastHit.type] : undefined }">{{
              lastHit ? number(lastHit.damage) : '—'
            }}</strong>
          </div>
        </div>
        <div class="critical-summary">
          <div>
            <span>当前暴击率</span><strong data-testid="crit-chance">{{ critChance }}%</strong>
          </div>
          <div>
            <span>暴击命中</span><strong data-testid="critical-hits">{{ criticalHits }}</strong>
          </div>
          <p data-testid="crit-ready" :class="{ ready: criticalReady }">
            {{ criticalReady ? 'ϟ 暴击就绪 · 下一次命中 ×2' : '判定失败 +5% · 成功清零' }}
          </p>
        </div>
        <section class="combat-log">
          <div class="section-heading">
            <h2>战斗记录</h2>
            <span>最近 60 条</span>
          </div>
          <div v-if="!events.length" class="log-empty">
            <span>⌁</span>
            <p>等待第一次攻击</p>
            <small>运行攻击流，观察每一次命中。</small>
          </div>
          <ol v-else class="event-list" aria-label="战斗记录">
            <li v-for="event in events" :key="event.id">
              <span class="event-dot" :style="{ background: NODE_TYPE_COLORS[event.type] }" />
              <div>
                <strong
                  >{{ event.label
                  }}<small v-if="event.kind === 'damage' && event.critical"> 暴击 ×2</small
                  ><small v-if="event.type === 'multi-attack'"> #{{ event.hit }}</small
                  ><small v-if="event.kind === 'critical'">
                    {{ event.chanceBefore }}% → {{ event.chanceAfter }}%</small
                  ></strong
                ><span>{{ formatTime(event.time) }} · 第 {{ event.cycle }} 轮</span>
              </div>
              <b :style="{ color: NODE_TYPE_COLORS[event.type] }">{{
                event.kind === 'critical'
                  ? event.success
                    ? '成功 · ×2'
                    : '未触发 +5%'
                  : `+${number(event.damage)}`
              }}</b>
            </li>
          </ol>
        </section>
        <div class="battle-footer">
          <span class="status-dot running" />伤害按游戏时间结算 · 后台时冻结时间
        </div>
      </aside>
    </div>
  </div>
</template>
