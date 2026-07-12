<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Node, Edge, Connection, OnConnectStartParams } from '@vue-flow/core'
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/minimap/dist/style.css'
import '@vue-flow/controls/dist/style.css'

// these components are only shown as examples of how to use a custom node or edge
// you can find many examples of how to create these custom components in the examples page of the docs
import SpecialNode from './components/SpecialNode.vue'
import SpecialEdge from './components/SpecialEdge.vue'
import ObjectInfoNode from './components/ObjectInfoNode.vue'
import SceneNode from './components/SceneNode.vue'
import ProcessNode from './components/ProcessNode.vue'

function miniMapNodeColor(node: { type?: string }): string {
  const colors: Record<string, string> = {
    'object-info': '#82354c',
    'scene-info': '#2b652b',
    'process-node': '#3c3c83',
    special: '#666',
  }
  return colors[node.type ?? ''] ?? '#ccc'
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

  // scene-info: another collapsible node example
  {
    id: '6',
    type: 'scene-info',
    position: { x: 500, y: 250 },
    data: {
      label: '场景信息',
    },
  },

  // process-node: has both inputs (left) and outputs (right)
  {
    id: '7',
    type: 'process-node',
    position: { x: 350, y: 400 },
    data: {
      label: '光照处理',
    },
  },
])

// these are our edges
const edges = ref<Edge[]>([])

/** 端口类型 → 端口颜色（与 main.css 中的 CSS 变量一致） */
const PORT_COLORS: Record<number, string> = {
  1: '#c7c729',
  2: '#63c763',
  3: '#6363c7',
  4: '#a1a1a1',
}

/**
 * 通过 Handle DOM 元素的 data-port-type 获取端口颜色
 * 使用 CSS 变量取值以保证与主题定义一致
 */
function getPortColor(portType: number): string {
  return PORT_COLORS[portType] ?? '#888888'
}

/** 处理新连接：将拖拽生成的连接加入 edges 数组，并自动匹配 source 端口颜色 */
function onConnect(connection: Connection) {
  // 尝试从 sourceHandle 对应的 DOM 元素读取 data-port-type
  let color = '#888888'
  if (connection.sourceHandle) {
    const handleEl = document.querySelector(`[data-handleid="${connection.sourceHandle}"]`)
    const portType = handleEl?.getAttribute('data-port-type')
    if (portType) {
      color = getPortColor(Number(portType))
    }
  }

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

/** 拖拽开始时读取 source 端口的 data-port-type，匹配颜色 */
function onConnectStart({ handleId }: OnConnectStartParams) {
  if (handleId) {
    const handleEl = document.querySelector(`[data-handleid="${handleId}"]`)
    const portType = handleEl?.getAttribute('data-port-type')
    if (portType) {
      connectionLineColor.value = getPortColor(Number(portType))
      return
    }
  }
  connectionLineColor.value = '#3b82f6'
}

/** 拖拽结束后重置为蓝色兜底 */
function onConnectEnd() {
  connectionLineColor.value = '#3b82f6'
}

</script>

<template>
  <VueFlow :nodes="nodes" :edges="edges" @connect="onConnect" :connection-line-options="connectionLineOptions" @connect-start="onConnectStart" @connect-end="onConnectEnd">
    <!-- bind your custom node type to a component by using slots, slot names are always `node-<type>` -->
    <template #node-special="specialNodeProps">
      <SpecialNode v-bind="specialNodeProps" />
    </template>

    <!-- bind the object-info node type -->
    <template #node-object-info="objectInfoProps">
      <ObjectInfoNode v-bind="objectInfoProps" />
    </template>

    <!-- bind the scene-info node type -->
    <template #node-scene-info="sceneInfoProps">
      <SceneNode v-bind="sceneInfoProps" />
    </template>

    <!-- bind the process-node type -->
    <template #node-process-node="processNodeProps">
      <ProcessNode v-bind="processNodeProps" />
    </template>

    <!-- bind your custom edge type to a component by using slots, slot names are always `edge-<type>` -->

    <template #edge-special="specialEdgeProps">
      <SpecialEdge v-bind="specialEdgeProps" />
    </template>
    <Background patternColor="#2f2f2f"/>
    <MiniMap pannable zoomable :node-color="miniMapNodeColor" node-stroke-color="#555" />
    <Controls />
  </VueFlow>
</template>

<style>
/* import the necessary styles for Vue Flow to work */
@import '@vue-flow/core/dist/style.css';

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
