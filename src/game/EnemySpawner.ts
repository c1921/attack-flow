import { Container, Graphics } from 'pixi.js'
import { ENEMY_FILL_COLOR, ENEMY_STROKE_COLOR } from './colors'

/** 单个敌人 */
export interface Enemy {
  gfx: Graphics
  x: number
  y: number
  hp: number
  maxHp: number
  speed: number
  radius: number
  active: boolean
}

/** 敌人模板配置 */
interface EnemyTemplate {
  /** 顶点数（3=三角形, 4=方形, 5=五边形） */
  sides: number
  hp: number
  speed: number
  radius: number
}

const TEMPLATES: EnemyTemplate[] = [
  { sides: 3, hp: 2, speed: 100, radius: 12 },
  { sides: 4, hp: 3, speed: 75, radius: 14 },
  { sides: 5, hp: 5, speed: 55, radius: 16 },
]

/** 在玩家周围生成敌人的圆半径（大于可视范围对角线一半约 470px） */
const SPAWN_RADIUS = 500

/** 敌人距离玩家超过此值则自动销毁 */
const CLEANUP_DISTANCE = 2000

/** 敌人生成器 */
export interface EnemySpawner {
  enemies: Enemy[]
  /** 生成间隔计时器 */
  spawnTimer: number
  /** 当前生成间隔（秒），随游戏时间递减 */
  spawnInterval: number
  /** 游戏已运行时间 */
  elapsed: number
}

/**
 * 创建敌人生成器。
 */
export function createEnemySpawner(): EnemySpawner {
  return {
    enemies: [],
    spawnTimer: 0,
    spawnInterval: 1.8,
    elapsed: 0,
  }
}

/**
 * 绘制单个敌人的多边形 Graphics。
 */
function createEnemyGfx(tmpl: EnemyTemplate): Graphics {
  const gfx = new Graphics()
  const { sides, radius } = tmpl
  const points: number[] = []

  // 生成正多边形顶点（顶点朝上偏移 -π/2）
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2
    points.push(Math.cos(angle) * radius, Math.sin(angle) * radius)
  }

  gfx.poly(points, true)
  gfx.fill({ color: ENEMY_FILL_COLOR, alpha: 0.85 })
  gfx.stroke({ width: 1.5, color: ENEMY_STROKE_COLOR, alpha: 0.5 })

  return gfx
}

/**
 * 在以玩家为圆心、spawnRadius 为半径的圆上随机生成一个敌人。
 */
function spawnOnCircle(
  playerX: number,
  playerY: number,
  spawnRadius: number,
  tmpl: EnemyTemplate,
): Enemy {
  const angle = Math.random() * Math.PI * 2
  const x = playerX + Math.cos(angle) * spawnRadius
  const y = playerY + Math.sin(angle) * spawnRadius

  const gfx = createEnemyGfx(tmpl)
  gfx.x = x
  gfx.y = y

  return {
    gfx,
    x,
    y,
    hp: tmpl.hp,
    maxHp: tmpl.hp,
    speed: tmpl.speed,
    radius: tmpl.radius,
    active: true,
  }
}

/**
 * 更新敌人生成器和所有敌人。
 * @param spawner 生成器对象
 * @param dt 帧间隔（秒）
 * @param playerX 玩家 X
 * @param playerY 玩家 Y
 * @param enemyLayer 敌人所在的 Container（新增敌人 addChild 到此）
 */
export function updateEnemySpawner(
  spawner: EnemySpawner,
  dt: number,
  playerX: number,
  playerY: number,
  enemyLayer: Container,
): void {
  spawner.elapsed += dt

  // 生成计时
  spawner.spawnTimer += dt
  // 随游戏时间逐渐加速生成（最低 0.4 秒）
  spawner.spawnInterval = Math.max(0.4, 1.8 - spawner.elapsed * 0.01)

  while (spawner.spawnTimer >= spawner.spawnInterval) {
    spawner.spawnTimer -= spawner.spawnInterval
    const tmpl = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)]!
    const enemy = spawnOnCircle(playerX, playerY, SPAWN_RADIUS, tmpl)
    spawner.enemies.push(enemy)
    enemyLayer.addChild(enemy.gfx)
  }

  // 更新每个敌人
  for (const enemy of spawner.enemies) {
    if (!enemy.active) continue

    // 朝向玩家移动
    const dx = playerX - enemy.x
    const dy = playerY - enemy.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > 1) {
      enemy.x += (dx / dist) * enemy.speed * dt
      enemy.y += (dy / dist) * enemy.speed * dt
    }

    enemy.gfx.x = enemy.x
    enemy.gfx.y = enemy.y

    // 离玩家太远则自动销毁
    if (dist > CLEANUP_DISTANCE) {
      enemy.active = false
    }
  }
}

/**
 * 清理已死亡的敌人（从数组和场景中移除）。
 */
export function cleanupEnemies(spawner: EnemySpawner, enemyLayer: Container): void {
  for (let i = spawner.enemies.length - 1; i >= 0; i--) {
    const enemy = spawner.enemies[i]
    if (!enemy) continue
    if (!enemy.active) {
      enemyLayer.removeChild(enemy.gfx)
      enemy.gfx.destroy()
      spawner.enemies.splice(i, 1)
    }
  }
}
