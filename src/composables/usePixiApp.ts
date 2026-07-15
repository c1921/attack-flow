import { ref, watch, onUnmounted, type Ref, shallowRef } from 'vue'
import { Application, type ApplicationOptions } from 'pixi.js'

/**
 * Vue composable that manages a PixiJS Application lifecycle.
 *
 * @param containerRef - A template ref to a HTMLDivElement that will host the canvas.
 * @param options      - PixiJS Application options (passed to app.init()).
 * @returns An object with reactive `isReady` flag, the `Application` instance,
 *          and a `destroy` method.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { ref } from 'vue'
 * import { usePixiApp } from '@/composables/usePixiApp'
 *
 * const container = ref<HTMLDivElement>()
 * const { isReady, app } = usePixiApp(container)
 * </script>
 *
 * <template>
 *   <div ref="container" />
 * </template>
 * ```
 */
export function usePixiApp(
  containerRef: Ref<HTMLDivElement | undefined>,
  options?: Partial<ApplicationOptions>,
) {
  const isReady = ref(false)
  const app = shallowRef<Application>()

  let instance: Application | null = null

  async function init() {
    if (!containerRef.value || instance) return

    const pixiApp = new Application()

    await pixiApp.init({
      resizeTo: containerRef.value,
      background: 0x1a1a2e,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
      ...options,
    })

    containerRef.value.appendChild(pixiApp.canvas)

    instance = pixiApp
    app.value = pixiApp
    isReady.value = true
  }

  function destroy() {
    if (instance) {
      instance.destroy(
        { removeView: true, releaseGlobalResources: true },
        { children: true, texture: true },
      )
      instance = null
      app.value = undefined
      isReady.value = false
    }
  }

  // 等 containerRef 绑定到 DOM 后再初始化
  const stopWatch = watch(containerRef, (el) => {
    if (el && !instance) {
      init()
      stopWatch()
    }
  })

  onUnmounted(() => {
    destroy()
  })

  return {
    isReady,
    app,
    destroy,
  }
}
