import { getCurrentWindow } from '@tauri-apps/api/window'
import type { AppWindowFrame, WindowFrameKind } from './windowFrame'

export function createTauriWindowFrame(): AppWindowFrame {
  const appWindow = getCurrentWindow()

  return {
    kind: detectWindowFrameKind(),
    close: () => appWindow.close(),
    minimize: () => appWindow.minimize(),
    startDragging: () => appWindow.startDragging(),
    toggleMaximize: () => appWindow.toggleMaximize(),
    subscribeMaximized: async (listener) => {
      let frameId: number | null = null
      let disposed = false

      const update = () => {
        if (disposed || frameId !== null) return
        frameId = window.requestAnimationFrame(() => {
          frameId = null
          void appWindow.isMaximized().then((maximized) => {
            if (!disposed) listener(maximized)
          }).catch(() => undefined)
        })
      }

      update()
      const unlisten = await appWindow.onResized(update)

      return () => {
        disposed = true
        unlisten()
        if (frameId !== null) window.cancelAnimationFrame(frameId)
      }
    },
  }
}

function detectWindowFrameKind(): WindowFrameKind {
  if (/mac|iphone|ipad|ipod/i.test(navigator.platform)) return 'macos-overlay'
  if (/win/i.test(navigator.platform)) return 'windows-custom'
  return 'native'
}
