<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { AttackNodeData } from '../constants/nodes'
import BaseNode from './BaseNode.vue'
defineProps<NodeProps<AttackNodeData>>()
</script>

<template><BaseNode v-bind="$props" /></template>
