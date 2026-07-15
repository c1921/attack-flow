<script setup lang="ts">
import { ref, watch } from 'vue'
import { usePixiApp } from '@/composables/usePixiApp'
import {
  Container,
  Graphics,
  Text,
  TextStyle,
  BlurFilter,
  Rectangle,
} from 'pixi.js'

const container = ref<HTMLDivElement>()
const { isReady, app } = usePixiApp(container, {
  background: 0x0f0f23,
})

// ── Demo scene: shapes with animation ──────────────────────────
let demoContainer: Container | null = null
// Layer that receives the blur filter — only balls go here
let blurLayer: Container | null = null
let shapes: {
  gfx: Graphics
  speed: number
  angle: number
  color: number
  orbitRadius: number
}[] = []

function buildScene() {
  if (!app.value) return

  demoContainer = new Container()
  app.value.stage.addChild(demoContainer)

  // Balls go into a separate layer so the blur filter doesn't affect
  // text or the center dot. resolution: 'inherit' matches the canvas
  // devicePixelRatio so blur rendering stays crisp on high-DPI displays.
  blurLayer = new Container()
  demoContainer.addChild(blurLayer)

  const blur = new BlurFilter({
    strength: 3,
    quality: 4,
    resolution: 'inherit',
  })
  blur.repeatEdgePixels = true
  blurLayer.filters = [blur]
  blurLayer.filterArea = new Rectangle(0, 0, app.value.screen.width, app.value.screen.height)

  const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf9ca24, 0xa29bfe, 0xfd79a8]

  // Create orbiting shapes
  shapes = colors.map((color, i) => {
    const gfx = new Graphics()
    const orbitRadius = 80 + i * 30
    const size = 14 + Math.random() * 14
    const angle = (i / colors.length) * Math.PI * 2

    // Draw filled circle with a bright core
    gfx.circle(0, 0, size)
    gfx.fill({ color, alpha: 0.9 })

    blurLayer!.addChild(gfx)

    return {
      gfx,
      speed: 0.3 + Math.random() * 0.5,
      angle,
      color,
      orbitRadius,
    }
  })

  // Label
  const style = new TextStyle({
    fontFamily: 'monospace',
    fontSize: 18,
    fill: '#ffffff',
    fontWeight: 'bold',
  })
  const label = new Text({ text: 'PixiJS v8 ✓', style })
  label.anchor.set(0.5)
  demoContainer.addChild(label)

  const subStyle = new TextStyle({
    fontFamily: 'monospace',
    fontSize: 12,
    fill: '#8888aa',
  })
  const subLabel = new Text({
    text: 'Attack Flow — PixiJS Demo',
    style: subStyle,
  })
  subLabel.anchor.set(0.5)
  demoContainer.addChild(subLabel)

  // Center dot
  const dot = new Graphics()
  dot.circle(0, 0, 4)
  dot.fill(0xffffff, 0.5)
  demoContainer.addChild(dot)
}

// ── Animation tick ─────────────────────────────────────────────
function animate() {
  if (!app.value || !demoContainer) return

  const now = Date.now() / 1000
  const cx = app.value.screen.width / 2
  const cy = app.value.screen.height / 2

  for (const s of shapes) {
    s.angle += s.speed * 0.016
    s.gfx.x = cx + Math.cos(s.angle) * s.orbitRadius
    s.gfx.y = cy + Math.sin(s.angle) * s.orbitRadius
    s.gfx.scale.set(0.85 + Math.sin(now * 2 + s.orbitRadius) * 0.15)
  }

  // Sync filterArea to current canvas size (may have changed via resizeTo)
  if (blurLayer) {
    blurLayer.filterArea = new Rectangle(0, 0, app.value.screen.width, app.value.screen.height)
  }

  // Update label and dot positions (screen may have resized)
  // demoContainer children: [blurLayer, label, subLabel, dot]
  const children = demoContainer.children
  if (children.length >= 4) {
    ;(children[1] as Text).x = cx
    ;(children[1] as Text).y = cy + 120
    ;(children[2] as Text).x = cx
    ;(children[2] as Text).y = cy + 150
    ;(children[3] as Graphics).x = cx
    ;(children[3] as Graphics).y = cy
  }
}

// ── Lifecycle ──────────────────────────────────────────────────
watch(isReady, (ready) => {
  if (ready) {
    buildScene()
  }
})

// Start ticker callback once app is ready
watch(app, (pixiApp) => {
  if (pixiApp) {
    pixiApp.ticker.add(() => animate())
  }
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
