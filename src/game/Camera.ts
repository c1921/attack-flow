/** 可视区域（世界坐标） */
export interface ViewBounds {
  left: number
  top: number
  right: number
  bottom: number
}

/** 摄像机 */
export interface Camera {
  /** 屏幕左上角在世界坐标中的 X */
  x: number
  /** 屏幕左上角在世界坐标中的 Y */
  y: number
  /** 当前可视范围（世界坐标） */
  bounds: ViewBounds
}

/**
 * 创建摄像机。
 */
export function createCamera(): Camera {
  return {
    x: 0,
    y: 0,
    bounds: { left: 0, top: 0, right: 0, bottom: 0 },
  }
}

/**
 * 更新摄像机：使玩家保持在屏幕中央。
 * @returns worldContainer 应设置的位置（世界坐标偏移的负值）
 */
export function updateCamera(
  camera: Camera,
  playerX: number,
  playerY: number,
  screenW: number,
  screenH: number,
): { worldX: number; worldY: number } {
  camera.x = playerX - screenW / 2
  camera.y = playerY - screenH / 2

  camera.bounds.left = camera.x
  camera.bounds.top = camera.y
  camera.bounds.right = camera.x + screenW
  camera.bounds.bottom = camera.y + screenH

  // worldContainer 需要反向偏移，让摄像机"看向"玩家
  return { worldX: -camera.x, worldY: -camera.y }
}
