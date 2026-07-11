<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import BaseNode from './BaseNode.vue'
import type { PortItem } from './BaseNode.vue'

const props = defineProps<NodeProps>()

const items: PortItem[] = [
  // 左侧输入（handleType 缺省 == 'target'）
  { label: '光照类型', portType: 3 },
  { label: '环境光色', portType: 3 },
  { label: '阴影', portType: 1 },
  { label: '雾效强度', portType: 1 },
  // 右侧输出（显式指定 handleType: 'source'）
  { label: '最终光照', portType: 2, handleType: 'source' },
  { label: '阴影贴图', portType: 4, handleType: 'source' },
]
</script>

<template>
  <BaseNode
    v-bind="props"
    node-type="C"
    label="光照处理"
    :items="items"
  />
</template>
