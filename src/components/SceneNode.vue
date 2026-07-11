<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import BaseNode from './BaseNode.vue'
import type { PortItem } from './BaseNode.vue'

const props = defineProps<NodeProps>()

const items: PortItem[] = [
  { label: '场景名称', portType: 4 },
  { label: '光照类型', portType: 3 },
  { label: '环境光色', portType: 3 },
  { label: '阴影', portType: 1 },
  { label: '雾效强度', portType: 1 },
]
</script>

<template>
  <BaseNode
    v-bind="props"
    node-type="B"
    label="场景信息"
    :items="items"
  />
</template>
