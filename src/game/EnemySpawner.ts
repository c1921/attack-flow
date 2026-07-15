import { Container, Graphics } from 'pixi.js'

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
  color: number
  hp: number
  speed: number
  radius: number
}

const TEMPLATES: EnemyTemplate[] = [
  { sides: 3, color: 0xff4444, hp: 2, speed: 100, radius: 12 },
  { sides: 4, color: 0xff8844, hp: 3, speed: 75, radius: 14 },
  { sides: 5, color: 0xff44aa, hp: 5, speed: 55, radius: 16 },
]

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
  gfx.fill({ color: tmpl.color, alpha: 0.85 })
  gfx.stroke({ width: 1.5, color: 0xffffff, alpha: 0.3 })

  return gfx
}

/**
 * 在区域边缘随机生成一个敌人。
 */
function spawnAtEdge(w: number, h: number, tmpl: EnemyTemplate): Enemy {
  // 随机选择边：0=上, 1=右, 2=下, 3=左
  const edge = Math.floor(Math.random() * 4)
  let x: number, y: number

  switch (edge) {
    case 0: // 上
      x = Math.random() * w
      y = -20
      break
    case 1: // 右
      x = w + 20
      y = Math.random() * h
      break
    case 2: // 下
      x = Math.random() * w
      y = h + 20
      break
    default: // 左
      x = -20
      y = Math.random() * h
  }

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
 * @param boundsW 区域宽度
 * @param boundsH 区域高度
 * @param enemyLayer 敌人所在的 Container（新增敌人 addChild 到此）
 */
export function updateEnemySpawner(
  spawner: EnemySpawner,
  dt: number,
  playerX: number,
  playerY: number,
  boundsW: number,
  boundsH: number,
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
    const enemy = spawnAtEdge(boundsW, boundsH, tmpl)
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
