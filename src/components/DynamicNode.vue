<script setup lang="ts">
import { computed } from 'vue'
import type { NodeProps } from '@vue-flow/core'
import BaseNode from './BaseNode.vue'
import { NODE_PRESETS } from '../constants/nodes'

const props = defineProps<NodeProps>()

const preset = computed(() => NODE_PRESETS[props.type ?? ''])
</script>

<template>
  <BaseNode
    v-if="preset"
    v-bind="$props"
    :node-type="preset.nodeType"
    :label="preset.label"
    :items="preset.items"
  />
</template>
