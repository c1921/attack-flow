<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'

/** 节点类型 → 头部背景色（CSS 变量，定义在 main.css @theme 中） */
const NODE_HEADER_COLORS: Record<string, string> = {
  A: 'var(--color-node-a)',
  B: 'var(--color-node-b)',
  C: 'var(--color-node-c)',
  D: 'var(--color-node-d)',
  E: 'var(--color-node-e)',
  F: 'var(--color-node-f)',
}

/** 端口类型 → 端口颜色（CSS 变量，定义在 main.css @theme 中） */
const PORT_COLORS: Record<number, string> = {
  1: 'var(--color-port-1)',
  2: 'var(--color-port-2)',
  3: 'var(--color-port-3)',
  4: 'var(--color-port-4)',
}

export interface PortItem {
  label: string
  /** 端口类型，对应 PORT_COLORS 中的颜色 */
  portType: number
  /** 手柄类型，默认 'target' */
  handleType?: 'source' | 'target'
}

const props = defineProps<
  NodeProps & {
    /** 节点类型，对应 NODE_HEADER_COLORS 中的颜色 */
    nodeType: string
    /** 标题，默认取 data.label */
    label?: string
    /** 列表项 */
    items?: PortItem[]
  }
>()

const resolvedLabel = props.label ?? (props.data?.label as string | undefined) ?? ''

const headerColor = computed(() => NODE_HEADER_COLORS[props.nodeType] ?? '#666666')

const resolvedItems = computed(() =>
  (props.items ?? []).map(item => ({
    ...item,
    color: PORT_COLORS[item.portType] ?? '#888888',
  })),
)

const bodyBg = 'var(--color-node-bg)'
const borderColor = 'var(--color-node-border)'
</script>

<template>
  <div class="node-root">
    <!-- 端口和端口名 — 在容器外部，不受 overflow-hidden 裁切影响 -->
    <!-- 左侧：输入（target）手柄，右侧：输出（source）手柄 -->
    <div v-for="(item, index) in resolvedItems" :key="'port-' + index"
      class="port-row"
      :class="item.handleType === 'source' ? 'port-right' : 'port-left'"
      :style="{ top: 44 + index * 22 + 'px' }">
      <template v-if="item.handleType === 'source'">
        <span class="port-label port-label-right">{{ item.label }}</span>
        <Handle :id="item.label" type="source" :position="Position.Right"
          class="handle" :style="{ backgroundColor: item.color }" />
      </template>
      <template v-else>
        <Handle :id="item.label" type="target" :position="Position.Left"
          class="handle" :style="{ backgroundColor: item.color }" />
        <span class="port-label port-label-left">{{ item.label }}</span>
      </template>
    </div>

    <!-- 容器：外轮廓 + 灰色背景，圆角，通过 overflow-hidden 裁切头部 -->
    <div class="node-body" :style="{ backgroundColor: bodyBg, borderColor }">
      <!-- 头部 -->
      <div class="node-header"
        :style="{ backgroundColor: headerColor }">
        <span>{{ resolvedLabel }}</span>
      </div>
      <!-- 内容项（不含手柄） -->
      <div class="node-content">
        <div v-for="(item, index) in resolvedItems" :key="index"
          class="node-placeholder"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.node-root {
  position: relative;
  min-width: 140px;
  user-select: none;
  font-family: system-ui, sans-serif;
}

.port-row {
  position: absolute;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 4px;
}

.port-left {
  left: 0;
}

.port-right {
  right: 0;
}

.port-label {
  color: #e5e7eb;
  font-size: 13px;
  white-space: nowrap;
  user-select: none;
}

.port-label-right {
  margin-right: 8px;
}

.port-label-left {
  margin-left: 8px;
}

.handle {
  width: 12px !important;
  height: 12px !important;
  min-width: 12px !important;
  border-radius: 9999px;
  border: none !important;
}

.node-body {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid;
}

.node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  color: #fff;
  font-size: 14px;
  line-height: 20px;
}

.node-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
}

.node-placeholder {
  height: 16px;
}
</style>
