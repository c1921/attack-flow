<script setup lang="ts">
import { ref } from 'vue'
import type { Node, Edge, Connection } from '@vue-flow/core'
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import '@vue-flow/minimap/dist/style.css'

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

/** 处理新连接：将拖拽生成的连接加入 edges 数组 */
function onConnect(connection: Connection) {
  edges.value = [...edges.value, {
    id: `e${connection.source}->${connection.target}`,
    source: connection.source!,
    target: connection.target!,
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
  }]
}

</script>

<template>
  <VueFlow :nodes="nodes" :edges="edges" @connect="onConnect">
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

</style>
