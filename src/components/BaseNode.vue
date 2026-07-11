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
const handleClass = 'size-3! min-w-3! rounded-full border-none'
</script>

<template>
  <div class="relative min-w-35 select-none font-sans">
    <!-- 端口和端口名 — 在容器外部，不受 overflow-hidden 裁切影响 -->
    <!-- 左侧：输入（target）手柄，右侧：输出（source）手柄 -->
    <div v-for="(item, index) in resolvedItems" :key="'port-' + index"
      class="absolute z-10 flex items-center gap-1"
      :class="item.handleType === 'source' ? 'right-0' : 'left-0'"
      :style="{ top: 44 + index * 22 + 'px' }">
      <template v-if="item.handleType === 'source'">
        <span class="text-gray-200 text-[13px] whitespace-nowrap select-none mr-2">{{ item.label }}</span>
        <Handle :id="item.label" type="source" :position="Position.Right"
          :class="handleClass" :style="{ backgroundColor: item.color }" />
      </template>
      <template v-else>
        <Handle :id="item.label" type="target" :position="Position.Left"
          :class="handleClass" :style="{ backgroundColor: item.color }" />
        <span class="text-gray-200 text-[13px] whitespace-nowrap select-none ml-2">{{ item.label }}</span>
      </template>
    </div>

    <!-- 容器：外轮廓 + 灰色背景，圆角，通过 overflow-hidden 裁切头部 -->
    <div class="rounded-lg overflow-hidden border" :style="{ backgroundColor: bodyBg, borderColor }">
      <!-- 头部 -->
      <div class="flex items-center gap-1.5 px-3 py-2 text-white text-sm"
        :style="{ backgroundColor: headerColor }">
        <span>{{ resolvedLabel }}</span>
      </div>
      <!-- 内容项（不含手柄） -->
      <div class="flex flex-col gap-1.5 px-3 py-2">
        <div v-for="(item, index) in resolvedItems" :key="index"
          class="h-4"></div>
      </div>
    </div>
  </div>
</template>
