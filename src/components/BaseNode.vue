<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position, type NodeProps } from '@vue-flow/core'
import { NODE_PRESETS, type AttackNodeData, type AttackType } from '../constants/nodes'
import { isDamageType } from '../engine/workflow'

const props = defineProps<NodeProps<AttackNodeData>>()
const preset = computed(() => NODE_PRESETS[props.type as AttackType])
const progress = computed(() => Math.round((props.data.progress ?? 0) * 100))
</script>

<template>
  <div
    class="attack-node"
    :class="[data.state, { selected }]"
    :style="{ '--node-accent': preset.color }"
  >
    <Handle id="in" type="target" :position="Position.Left" :connectable="!data.locked" />
    <div class="node-heading">
      <span class="node-icon">{{ preset.icon }}</span>
      <span>{{ data.label }}</span>
      <span class="node-indicator">{{ data.state === 'completed' ? '✓' : '•' }}</span>
    </div>
    <div class="node-details">
      <div class="node-damage">
        <template v-if="isDamageType(type)">
          <strong>{{ data.damage }}</strong
          ><span>{{ type === 'multi-attack' ? `× ${data.hits} 次` : '伤害' }}</span>
        </template>
        <template v-else-if="type === 'critical'"
          ><strong>{{ data.critChance ?? 0 }}%</strong
          ><span>{{
            data.critResult === 'success'
              ? data.criticalReady
                ? '成功 · 下次 ×2'
                : '本轮判定成功'
              : data.critResult === 'failure'
                ? '未触发 · 已 +5%'
                : '失败 +5%'
          }}</span></template
        >
        <template v-else-if="type === 'output'"
          ><strong>⇥</strong><span>汇合结束 · 自动循环</span></template
        >
        <template v-else
          ><strong>{{ data.duration }}</strong
          ><span>秒冷却</span></template
        >
      </div>
      <div class="node-meta">
        <span>◷ {{ data.duration.toFixed(1) }}s</span
        ><span>{{
          data.state === 'running'
            ? `${progress}%`
            : data.state === 'completed'
              ? '已完成'
              : '待执行'
        }}</span>
      </div>
    </div>
    <div class="node-progress"><div :style="{ width: `${progress}%` }" /></div>
    <Handle
      v-if="type !== 'output'"
      id="out"
      type="source"
      :position="Position.Right"
      :connectable="!data.locked"
    />
  </div>
</template>

<style scoped>
.attack-node {
  width: 208px;
  background: #20232c;
  border: 1px solid #3b3e4a;
  border-radius: 12px;
  position: relative;
  color: #ecedf3;
  box-shadow: 0 6px 18px #0003;
}
.attack-node.selected {
  border-color: var(--node-accent);
}
.attack-node.running {
  border-color: var(--node-accent);
  outline: 2px solid var(--node-accent);
  outline-offset: 4px;
  box-shadow: 0 0 30px color-mix(in srgb, var(--node-accent) 22%, transparent);
}
.node-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 15px;
  border-bottom: 1px solid #ffffff0c;
  font-size: 13px;
  font-weight: 600;
}
.node-icon {
  color: var(--node-accent);
  font-size: 22px;
  line-height: 1;
}
.node-indicator {
  margin-left: auto;
  color: var(--node-accent);
}
.node-details {
  padding: 14px 15px 12px;
}
.node-damage {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.node-damage strong {
  font-size: 26px;
  font-weight: 550;
  font-variant-numeric: tabular-nums;
}
.node-damage span,
.node-meta {
  color: #959aaa;
  font-size: 11px;
}
.node-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 13px;
}
.node-progress {
  height: 3px;
  overflow: hidden;
  border-radius: 0 0 12px 12px;
}
.node-progress div {
  height: 100%;
  background: var(--node-accent);
}
.attack-node :deep(.vue-flow__handle) {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  border: 3px solid #20232c;
  background: var(--node-accent);
  box-shadow: 0 0 0 1px var(--node-accent);
}
</style>
