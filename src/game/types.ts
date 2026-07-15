/** 二维坐标 */
export interface Point {
  x: number
  y: number
}

/** 基础实体 */
export interface Entity {
  /** 世界坐标位置 */
  x: number
  y: number
  /** 标记为 false 后下一帧被移除 */
  active: boolean
}

/** 发射物 */
export interface Projectile extends Entity {
  /** 移动速度（像素/秒） */
  speed: number
  /** 移动方向（弧度） */
  angle: number
  /** 造成的伤害 */
  damage: number
}

/** 敌人 */
export interface Enemy extends Entity {
  /** 当前生命值 */
  hp: number
  /** 最大生命值 */
  maxHp: number
  /** 移动速度（像素/秒） */
  speed: number
  /** 碰撞半径 */
  radius: number
}

/** 键盘输入状态 */
export interface InputState {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
}
