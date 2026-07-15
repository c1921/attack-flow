<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { Container, Graphics, Text } from 'pixi.js'
import { usePixiApp } from '@/composables/usePixiApp'
import { createGrid, syncGrid } from '@/game/Grid'
import { createCamera, updateCamera } from '@/game/Camera'
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
import type { Camera } from '@/game/Camera'

const container = ref<HTMLDivElement>()
const { isReady, app } = usePixiApp(container, {
  background: 0x0f0f23,
})

// ── 游戏状态 ──────────────────────────────────────────────────
let camera: Camera | null = null
let worldContainer: Container | null = null
let gridGfx: Graphics | null = null
let player: Player | null = null
let enemySpawner: EnemySpawner | null = null
let projectileMgr: ProjectileManager | null = null

// 图层（在 worldContainer 内）
let enemyLayer: Container | null = null
let projectileLayer: Container | null = null

// 玩家坐标标签（在三角下方显示）
let playerLabel: Text | null = null

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

  // 网格地面（在 stage 上，不在 worldContainer 中）
  gridGfx = new Graphics()
  createGrid(gridGfx, w, h)
  app.value.stage.addChild(gridGfx)

  // 世界容器（所有游戏对象在此之下，通过摄像机偏移实现滚动）
  worldContainer = new Container()
  app.value.stage.addChild(worldContainer)

  // 敌人层
  enemyLayer = new Container()
  worldContainer.addChild(enemyLayer)

  // 发射物层
  projectileLayer = new Container()
  worldContainer.addChild(projectileLayer)

  // 玩家
  player = createPlayer(0, 0)
  worldContainer.addChild(player.gfx)

  // 坐标标签（在三角下方）
  playerLabel = new Text({
    text: '(0, 0)',
    style: {
      fontFamily: 'monospace',
      fontSize: 12,
      fill: 0xffffff,
      align: 'center',
      stroke: { color: 0x000000, width: 3 },
    },
  })
  playerLabel.anchor.set(0.5, 0)
  worldContainer.addChild(playerLabel)

  // 摄像机
  camera = createCamera()

  // 敌人生成器
  enemySpawner = createEnemySpawner()

  // 发射物管理器
  projectileMgr = createProjectileManager()
}

// ── 游戏循环 ──────────────────────────────────────────────────
function gameLoop(): void {
  if (!app.value || !player || !camera || !worldContainer || !gridGfx) return
  if (!enemySpawner || !projectileMgr) return
  if (!enemyLayer || !projectileLayer) return

  const dt = app.value.ticker.deltaMS / 1000
  const sw = app.value.screen.width
  const sh = app.value.screen.height

  // 1. 更新玩家（世界空间，无边界）
  updatePlayer(player, input, dt)

  // 2. 更新摄像机 → 计算 worldContainer 偏移
  const { worldX, worldY } = updateCamera(camera, player.x, player.y, sw, sh)
  worldContainer.x = worldX
  worldContainer.y = worldY

  // 3. 同步网格取模偏移
  syncGrid(gridGfx, camera.x, camera.y)

  // 4. 更新敌人
  updateEnemySpawner(enemySpawner, dt, player.x, player.y, enemyLayer)

  // 5. 更新发射物
  updateProjectileManager(
    projectileMgr, dt,
    player.x, player.y,
    enemySpawner.enemies,
    projectileLayer,
  )

  // 6. 更新坐标标签（在三角下方 24px 处）
  if (playerLabel) {
    const px = Math.round(player.x)
    const py = Math.round(player.y)
    playerLabel.text = `(${px}, ${py})`
    playerLabel.x = player.x
    playerLabel.y = player.y + 24
  }

  // 7. 清理死亡实体
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
