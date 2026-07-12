<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import BaseNode from './BaseNode.vue'
import { NODE_PRESETS } from '../constants/nodes'

defineProps<NodeProps>()

const preset = NODE_PRESETS['process-node']
</script>

<template>
  <BaseNode
    v-bind="$props"
    :node-type="preset.nodeType"
    :label="preset.label"
    :items="preset.items"
  />
</template>
