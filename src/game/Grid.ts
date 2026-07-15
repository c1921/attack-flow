import { Graphics } from 'pixi.js'

/** 网格相关常量 */
export const GRID_CELL = 48

/**
 * 创建覆盖屏幕 + 2 格边距的网格 Graphics。
 * 配合每帧 `syncGrid` 用取模偏移实现无限滚动。
 */
export function createGrid(gfx: Graphics, screenW: number, screenH: number): void {
  const cell = GRID_CELL
  const w = screenW + cell * 2
  const h = screenH + cell * 2

  // 背景
  gfx.rect(0, 0, w, h).fill({ color: 0x1a1a2e })

  const lineColor = 0x2a2a4a

  for (let x = 0; x <= w; x += cell) {
    gfx.moveTo(x, 0).lineTo(x, h)
  }
  for (let y = 0; y <= h; y += cell) {
    gfx.moveTo(0, y).lineTo(w, y)
  }

  gfx.stroke({ width: 1, color: lineColor, alpha: 0.6 })
}

/**
 * 每帧同步网格位置：取模偏移实现无限滚动错觉。
 * @param gfx 网格 Graphics（在 stage 上，不在 worldContainer 中）
 * @param cameraX 摄像机世界 X（左上角）
 * @param cameraY 摄像机世界 Y（左上角）
 */
export function syncGrid(
  gfx: Graphics,
  cameraX: number,
  cameraY: number,
): void {
  const cell = GRID_CELL
  gfx.x = -(cameraX % cell) - cell
  gfx.y = -(cameraY % cell) - cell
}
