<script setup lang="ts">
import { ref, computed, markRaw } from 'vue'
import type { Node, Edge, Connection, OnConnectStartParams, NodeComponent } from '@vue-flow/core'
import { VueFlow } from '@vue-flow/core'
import { useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/minimap/dist/style.css'
import '@vue-flow/controls/dist/style.css'

import DynamicNode from './components/DynamicNode.vue'
import PixiCanvas from './components/PixiCanvas.vue'

import CanvasContextMenu from './components/CanvasContextMenu.vue'

import { getPortColor, NODE_TYPE_COLORS } from './constants/colors'
import { NODE_PRESETS } from './constants/nodes'

const { screenToFlowCoordinate } = useVueFlow()

// 从 NODE_PRESETS 自动生成节点类型 → DynamicNode 的注册表
const nodeTypes = Object.fromEntries(
  Object.keys(NODE_PRESETS).map((key) => [key, markRaw(DynamicNode)]),
) as Record<string, NodeComponent>

function miniMapNodeColor(node: { type?: string }): string {
  return NODE_TYPE_COLORS[node.type ?? ''] ?? '#ccc'
}

// these are our nodes
const nodes = ref<Node[]>([

  // object-info: a custom collapsible node
  {
    id: '5',
    type: 'object-info',
    position: { x: 250, y: 250 },
    data: {
      label: '物体信息',
      items: [
        { label: '位置', portType: 1 },
        { label: '颜色', portType: 2 },
        { label: 'Alpha', portType: 3 },
        { label: '物体编号', portType: 3 },
        { label: '材质编号', portType: 3 },
      ],
    },
  },

  // scene-info
  {
    id: '6',
    type: 'scene-info',
    position: { x: 500, y: 250 },
    data: {
      label: '场景信息',
      items: [
        { label: '场景名称', portType: 4 },
        { label: '光照类型', portType: 3 },
        { label: '环境光色', portType: 3 },
        { label: '阴影', portType: 1 },
        { label: '雾效强度', portType: 1 },
      ],
    },
  },

  // process-node: has both inputs (left) and outputs (right)
  {
    id: '7',
    type: 'process-node',
    position: { x: 350, y: 400 },
    data: {
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
  },
])

// these are our edges
const edges = ref<Edge[]>([])

/** 根据节点 ID 和 Handle ID 从 nodes 数据中查找端口类型 */
function findPortType(nodeId: string | null | undefined, handleId: string | null | undefined): number | null {
  if (!nodeId || !handleId) return null
  const node = nodes.value.find(n => n.id === nodeId)
  const items = node?.data?.items as Array<{ label: string; portType: number }> | undefined
  if (!items) return null
  const item = items.find(i => i.label === handleId)
  return item?.portType ?? null
}

/** 处理新连接：将拖拽生成的连接加入 edges 数组，并自动匹配 source 端口颜色 */
function onConnect(connection: Connection) {
  const portType = findPortType(connection.source, connection.sourceHandle)
  const color = portType != null ? getPortColor(portType) : '#888888'

  edges.value = [...edges.value, {
    id: `e${connection.source}->${connection.target}__${connection.sourceHandle}->${connection.targetHandle}`,
    source: connection.source!,
    target: connection.target!,
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
    style: {
      stroke: color,
      strokeWidth: 3,
    },
  }]
}

/** 拖拽连接线的颜色，connect-start 时根据 source 端口动态设置 */
const connectionLineColor = ref('#3b82f6')

const connectionLineOptions = computed(() => ({
  style: {
    stroke: connectionLineColor.value,
    strokeWidth: 3,
  },
}))

/** 拖拽开始时从 nodes 数据查找 source 端口颜色 */
function onConnectStart({ nodeId, handleId }: OnConnectStartParams) {
  const portType = findPortType(nodeId, handleId)
  connectionLineColor.value = portType != null ? getPortColor(portType) : '#3b82f6'
}

/** 拖拽结束后重置为蓝色兜底 */
function onConnectEnd() {
  connectionLineColor.value = '#3b82f6'
}

/** 新增节点：右键菜单触发 */
let nextId = 8

function addNode(type: string, screenPos: { x: number; y: number }) {
  const preset = NODE_PRESETS[type]
  if (!preset) return

  const id = String(nextId++)

  nodes.value = [...nodes.value, {
    id,
    type,
    position: screenToFlowCoordinate(screenPos),
    data: {
      label: preset.label,
      items: preset.items,
    },
  }]
}

</script>

<template>
  <div class="app-layout">
    <div class="editor-panel">
      <CanvasContextMenu @add-node="addNode">
        <VueFlow v-model:nodes="nodes" v-model:edges="edges" :node-types="nodeTypes" @connect="onConnect" :connection-line-options="connectionLineOptions" @connect-start="onConnectStart" @connect-end="onConnectEnd">
          <Background patternColor="#2f2f2f"/>
          <MiniMap pannable zoomable :node-color="miniMapNodeColor" node-stroke-color="#555" />
          <Controls />
        </VueFlow>
      </CanvasContextMenu>
    </div>
    <div class="preview-panel">
      <div class="preview-header">场景预览</div>
      <PixiCanvas />
    </div>
  </div>
</template>

<style>
/* import the necessary styles for Vue Flow to work */
@import '@vue-flow/core/dist/style.css';

html, body, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.app-layout {
  display: flex;
  width: 100vw;
  height: 100vh;
}

.editor-panel {
  flex: 1;
  min-width: 0;
  position: relative;
}

.preview-panel {
  width: 380px;
  flex-shrink: 0;
  border-left: 1px solid #2a2a2a;
  display: flex;
  flex-direction: column;
  background: #12121a;
}

.preview-header {
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #8888aa;
  border-bottom: 1px solid #2a2a2a;
  user-select: none;
}

.vue-flow {
  background-color: #1a1a1a;
}

.vue-flow__minimap {
  background-color: #2a2a2a;
}

.vue-flow__controls-button {
  background: #2a2a2a;
  border-bottom-color: #3a3a3a;
}

.vue-flow__controls-button:hover {
  background: #333;
}

.vue-flow__controls-button svg {
  fill: #ccc;
}

.vue-flow__controls {
  box-shadow: 0 0 2px 1px rgba(0, 0, 0, 0.3);
}

</style>
