export type WindowFrameKind = 'native' | 'windows-custom' | 'macos-overlay'

export type AppWindowFrame = {
  kind: WindowFrameKind
  close: () => Promise<void>
  minimize: () => Promise<void>
  startDragging: () => Promise<void>
  toggleMaximize: () => Promise<void>
  subscribeMaximized: (listener: (maximized: boolean) => void) => Promise<() => void>
}

const noWindowAction = async () => undefined

export const nativeWindowFrame: AppWindowFrame = {
  kind: 'native',
  close: noWindowAction,
  minimize: noWindowAction,
  startDragging: noWindowAction,
  toggleMaximize: noWindowAction,
  subscribeMaximized: async () => () => undefined,
}
