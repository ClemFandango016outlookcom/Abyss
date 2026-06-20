import type { AbyssApi } from './index'

declare global {
  interface Window {
    abyss: AbyssApi
  }
}

export {}
