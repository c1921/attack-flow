<script setup lang="ts">
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuPortal,
  ContextMenuRoot,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from 'reka-ui'
import { NODE_TYPE_COLORS } from '../constants/colors'

/** 节点类型配置，用于子菜单 */
interface NodeTypeOption {
  key: string
  label: string
  color: string
}

const nodeTypes: NodeTypeOption[] = [
  { key: 'object-info', label: '物体信息', color: NODE_TYPE_COLORS['object-info'] },
  { key: 'scene-info', label: '场景信息', color: NODE_TYPE_COLORS['scene-info'] },
  { key: 'process-node', label: '光照处理', color: NODE_TYPE_COLORS['process-node'] },
]

const emit = defineEmits<{
  'add-node': [type: string]
}>()
</script>

<template>
  <ContextMenuRoot>
    <ContextMenuTrigger asChild>
      <slot />
    </ContextMenuTrigger>

    <ContextMenuPortal>
      <ContextMenuContent class="context-menu-content" :side-offset="2" :align-offset="2">
        <ContextMenuSub>
          <ContextMenuSubTrigger class="context-menu-item">
            <span class="context-menu-icon">＋</span>
            添加节点
          </ContextMenuSubTrigger>

          <ContextMenuPortal>
            <ContextMenuSubContent class="context-menu-content sub-content" :side-offset="4">
              <ContextMenuItem
                v-for="item in nodeTypes"
                :key="item.key"
                class="context-menu-item"
                @select="emit('add-node', item.key)"
              >
                <span class="color-dot" :style="{ backgroundColor: item.color }" />
                {{ item.label }}
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuPortal>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenuPortal>
  </ContextMenuRoot>
</template>

<style scoped>
:global(.context-menu-content) {
  min-width: 160px;
  padding: 4px;
  background-color: #2a2a2a;
  border: 1px solid #3e3e3e;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  font-size: 13px;
  color: #e5e7eb;
  user-select: none;
  z-index: 1000;
}

:global(.sub-content) {
  min-width: 140px;
}

:global(.context-menu-item) {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  outline: none;
  transition: background-color 0.15s;
  color: #e5e7eb;
}

:global(.context-menu-item:hover),
:global(.context-menu-item[data-highlighted]) {
  background-color: #3a3a3a;
}

:global(.context-menu-item[data-disabled]) {
  opacity: 0.4;
  pointer-events: none;
}

:global(.context-menu-icon) {
  font-size: 14px;
  line-height: 1;
}

:global(.color-dot) {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
