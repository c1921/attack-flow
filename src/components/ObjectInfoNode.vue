<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import BaseNode from './BaseNode.vue'
import type { PortItem } from './BaseNode.vue'

const props = defineProps<NodeProps>()

const items: PortItem[] = [
  { label: '位置', portType: 1 },
  { label: '颜色', portType: 2 },
  { label: 'Alpha', portType: 3 },
  { label: '物体编号', portType: 3 },
  { label: '材质编号', portType: 3 },
]
</script>

<template>
  <BaseNode
    v-bind="props"
    node-type="A"
    label="物体信息"
    :items="items"
  />
</template>
