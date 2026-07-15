<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { Container, Graphics } from 'pixi.js'
import { usePixiApp } from '@/composables/usePixiApp'
import { drawGrid } from '@/game/Grid'
import { createPlayer, updatePlayer } from '@/game/Player'
import {
  createEnemySpawner,
  updateEnemySpawner,
  cleanupEnemies,
} from '@/game/EnemySpawner'
import {
  createProjectileManager,
  updateProjectileManager,
  cleanupProjectiles,
} from '@/game/ProjectileManager'
import type { InputState } from '@/game/types'
import type { Player } from '@/game/Player'
import type { EnemySpawner } from '@/game/EnemySpawner'
import type { ProjectileManager } from '@/game/ProjectileManager'

const container = ref<HTMLDivElement>()
const { isReady, app } = usePixiApp(container, {
  background: 0x0f0f23,
})

// ── 游戏状态 ──────────────────────────────────────────────────
let player: Player | null = null
let enemySpawner: EnemySpawner | null = null
let projectileMgr: ProjectileManager | null = null

// 图层
let enemyLayer: Container | null = null
let projectileLayer: Container | null = null

// 键盘输入
const input: InputState = { up: false, down: false, left: false, right: false }

function onKeyDown(e: KeyboardEvent): void {
  switch (e.key) {
    case 'w': case 'W': case 'ArrowUp':    input.up = true; break
    case 's': case 'S': case 'ArrowDown':  input.down = true; break
    case 'a': case 'A': case 'ArrowLeft':  input.left = true; break
    case 'd': case 'D': case 'ArrowRight': input.right = true; break
  }
}

function onKeyUp(e: KeyboardEvent): void {
  switch (e.key) {
    case 'w': case 'W': case 'ArrowUp':    input.up = false; break
    case 's': case 'S': case 'ArrowDown':  input.down = false; break
    case 'a': case 'A': case 'ArrowLeft':  input.left = false; break
    case 'd': case 'D': case 'ArrowRight': input.right = false; break
  }
}

// ── 场景构建 ──────────────────────────────────────────────────
function buildGame(): void {
  if (!app.value) return

  const w = app.value.screen.width
  const h = app.value.screen.height

  // 网格地面（底层）
  const gridGfx = new Graphics()
  drawGrid(gridGfx, w, h)
  app.value.stage.addChild(gridGfx)

  // 敌人层
  enemyLayer = new Container()
  app.value.stage.addChild(enemyLayer)

  // 发射物层
  projectileLayer = new Container()
  app.value.stage.addChild(projectileLayer)

  // 玩家（顶层）
  player = createPlayer(w / 2, h / 2)
  app.value.stage.addChild(player.gfx)

  // 敌人生成器
  enemySpawner = createEnemySpawner()

  // 发射物管理器
  projectileMgr = createProjectileManager()
}

// ── 游戏循环 ──────────────────────────────────────────────────
function gameLoop(): void {
  if (!app.value || !player || !enemySpawner || !projectileMgr) return
  if (!enemyLayer || !projectileLayer) return

  // dt 以秒为单位
  const dt = app.value.ticker.deltaMS / 1000
  const w = app.value.screen.width
  const h = app.value.screen.height

  // 更新玩家
  updatePlayer(player, input, dt, w, h)

  // 更新敌人
  updateEnemySpawner(enemySpawner, dt, player.x, player.y, w, h, enemyLayer)

  // 更新发射物
  updateProjectileManager(
    projectileMgr, dt,
    player.x, player.y,
    enemySpawner.enemies,
    w, h,
    projectileLayer,
  )

  // 清理死亡实体
  cleanupProjectiles(projectileMgr, projectileLayer)
  cleanupEnemies(enemySpawner, enemyLayer)
}

// ── 生命周期 ──────────────────────────────────────────────────
watch(isReady, (ready) => {
  if (ready) buildGame()
})

watch(app, (pixiApp) => {
  if (pixiApp) pixiApp.ticker.add(gameLoop)
})

window.addEventListener('keydown', onKeyDown)
window.addEventListener('keyup', onKeyUp)

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
})
</script>

<template>
  <div
    ref="container"
    class="pixi-canvas"
  />
</template>

<style scoped>
.pixi-canvas {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.pixi-canvas :deep(canvas) {
  display: block;
  border: none;
  outline: none;
}
</style>
