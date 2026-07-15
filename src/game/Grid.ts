import { Graphics } from 'pixi.js'

/**
 * 在 Graphics 对象上绘制网格地面。
 * 返回同一个 Graphics 以便链式调用。
 */
export function drawGrid(
  gfx: Graphics,
  width: number,
  height: number,
  cellSize = 48,
): Graphics {
  // 背景
  gfx.rect(0, 0, width, height).fill({ color: 0x1a1a2e })

  // 网格线颜色
  const lineColor = 0x2a2a4a

  // 垂直线
  for (let x = 0; x <= width; x += cellSize) {
    gfx.moveTo(x, 0).lineTo(x, height)
  }

  // 水平线
  for (let y = 0; y <= height; y += cellSize) {
    gfx.moveTo(0, y).lineTo(width, y)
  }

  gfx.stroke({ width: 1, color: lineColor, alpha: 0.6 })

  return gfx
}
