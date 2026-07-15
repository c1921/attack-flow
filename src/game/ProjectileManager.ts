import { Container, Graphics } from 'pixi.js'
import type { Enemy } from './EnemySpawner'
import { PROJECTILE_COLOR, PROJECTILE_CORE_COLOR } from './colors'

/** 单个发射物 */
export interface Projectile {
  gfx: Graphics
  x: number
  y: number
  /** 速度向量 */
  vx: number
  vy: number
  /** 伤害值 */
  damage: number
  active: boolean
}

/** 发射物管理器 */
export interface ProjectileManager {
  projectiles: Projectile[]
  /** 发射冷却计时器 */
  cooldownTimer: number
  /** 发射间隔（秒） */
  cooldown: number
}

const PROJECTILE_SPEED = 420
const PROJECTILE_RADIUS = 4
/** 发射物飞行超过此距离（离玩家）则销毁 */
const MAX_FLIGHT_DISTANCE = 800

/**
 * 创建发射物管理器。
 */
export function createProjectileManager(): ProjectileManager {
  return {
    projectiles: [],
    cooldownTimer: 0,
    cooldown: 0.25,
  }
}

/**
 * 创建单个发射物的 Graphics。
 */
function createProjectileGfx(): Graphics {
  const gfx = new Graphics()
  // 小光点：外圈 + 内核
  gfx.circle(0, 0, PROJECTILE_RADIUS + 2)
  gfx.fill({ color: PROJECTILE_COLOR, alpha: 0.4 })
  gfx.circle(0, 0, PROJECTILE_RADIUS)
  gfx.fill({ color: PROJECTILE_CORE_COLOR, alpha: 0.9 })
  gfx.circle(0, 0, PROJECTILE_RADIUS - 1)
  gfx.fill({ color: PROJECTILE_COLOR })
  return gfx
}

/**
 * 找到距离玩家最近的活敌人。
 */
function findNearestEnemy(
  enemies: Enemy[],
  px: number,
  py: number,
): Enemy | null {
  let nearest: Enemy | null = null
  let nearestDist = Infinity

  for (const enemy of enemies) {
    if (!enemy.active) continue
    const dx = enemy.x - px
    const dy = enemy.y - py
    const dist = dx * dx + dy * dy
    if (dist < nearestDist) {
      nearestDist = dist
      nearest = enemy
    }
  }

  return nearest
}

/**
 * 更新发射物管理器：冷却计时、自动瞄准发射、移动、命中检测。
 */
export function updateProjectileManager(
  mgr: ProjectileManager,
  dt: number,
  playerX: number,
  playerY: number,
  enemies: Enemy[],
  projectileLayer: Container,
): void {
  // 冷却计时
  mgr.cooldownTimer += dt

  // 自动瞄准最近敌人并发射
  if (mgr.cooldownTimer >= mgr.cooldown) {
    const target = findNearestEnemy(enemies, playerX, playerY)
    if (target) {
      mgr.cooldownTimer -= mgr.cooldown

      const dx = target.x - playerX
      const dy = target.y - playerY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const nx = dx / dist
      const ny = dy / dist

      const gfx = createProjectileGfx()
      gfx.x = playerX
      gfx.y = playerY

      const proj: Projectile = {
        gfx,
        x: playerX,
        y: playerY,
        vx: nx * PROJECTILE_SPEED,
        vy: ny * PROJECTILE_SPEED,
        damage: 1,
        active: true,
      }

      mgr.projectiles.push(proj)
      projectileLayer.addChild(gfx)
    }
  }

  // 更新每个发射物的位置和碰撞
  for (const proj of mgr.projectiles) {
    if (!proj.active) continue

    proj.x += proj.vx * dt
    proj.y += proj.vy * dt
    proj.gfx.x = proj.x
    proj.gfx.y = proj.y

    // 飞行距离超过阈值则销毁
    const dxFromPlayer = proj.x - playerX
    const dyFromPlayer = proj.y - playerY
    if (dxFromPlayer * dxFromPlayer + dyFromPlayer * dyFromPlayer > MAX_FLIGHT_DISTANCE * MAX_FLIGHT_DISTANCE) {
      proj.active = false
      continue
    }

    // 命中检测：与所有活敌人做距离判定
    for (const enemy of enemies) {
      if (!enemy.active) continue
      const dx = proj.x - enemy.x
      const dy = proj.y - enemy.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < enemy.radius + PROJECTILE_RADIUS) {
        // 命中
        enemy.hp -= proj.damage
        proj.active = false

        // 敌人生命归零
        if (enemy.hp <= 0) {
          enemy.active = false
        }
        break // 一发只命中一个敌人
      }
    }
  }
}

/**
 * 清理已失效的发射物（从数组和场景中移除）。
 */
export function cleanupProjectiles(
  mgr: ProjectileManager,
  projectileLayer: Container,
): void {
  for (let i = mgr.projectiles.length - 1; i >= 0; i--) {
    const proj = mgr.projectiles[i]
    if (!proj) continue
    if (!proj.active) {
      projectileLayer.removeChild(proj.gfx)
      proj.gfx.destroy()
      mgr.projectiles.splice(i, 1)
    }
  }
}
