import { Graphics } from 'pixi.js'
import type { InputState } from './types'
import { PLAYER_COLOR, PLAYER_INNER_COLOR } from './colors'

/** 玩家实体 */
export interface Player {
  gfx: Graphics
  x: number
  y: number
  /** 移动速度（像素/秒） */
  speed: number
}

/**
 * 创建玩家箭头。
 * @param x 初始 X 坐标
 * @param y 初始 Y 坐标
 */
export function createPlayer(x: number, y: number): Player {
  const gfx = new Graphics()

  // 外层蓝色尖锐箭头 — 顶点朝上 (-y)，rotation 0 = 朝上
  gfx.poly([0, -16, -10, 8, 10, 8], true)
  gfx.fill({ color: PLAYER_COLOR })

  // 亮色内核
  gfx.poly([0, -10, -5, 4, 5, 4], true)
  gfx.fill({ color: PLAYER_INNER_COLOR, alpha: 0.7 })

  gfx.x = x
  gfx.y = y

  return { gfx, x, y, speed: 220 }
}

/**
 * 根据输入更新玩家位置与朝向。
 */
export function updatePlayer(
  player: Player,
  input: InputState,
  dt: number,
): void {
  let dx = 0
  let dy = 0

  if (input.left) dx -= 1
  if (input.right) dx += 1
  if (input.up) dy -= 1
  if (input.down) dy += 1

  // 归一化
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len > 0) {
    dx /= len
    dy /= len
    // rotation 0 时箭头朝上；atan2(dy,dx) + π/2 让箭头指向移动方向
    player.gfx.rotation = Math.atan2(dy, dx) + Math.PI / 2
  }

  player.x += dx * player.speed * dt
  player.y += dy * player.speed * dt

  player.gfx.x = player.x
  player.gfx.y = player.y
}
