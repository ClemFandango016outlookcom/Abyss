import { join } from 'path'
import type { ContentKind } from '../shared/types'
import { getSettings } from './store'

/** Shared install/cache root — versions, libraries and assets are de-duplicated here. */
export function sharedRoot(): string {
  return join(getSettings().gameDir, 'shared')
}

/** Per-instance run directory — where mods, saves, configs and resourcepacks live. */
export function instanceDir(id: string): string {
  return join(getSettings().gameDir, 'instances', id)
}

export function instanceModsDir(id: string): string {
  return join(instanceDir(id), 'mods')
}

/** Resolves the install folder for a given content kind. */
export function instanceContentDir(id: string, kind: ContentKind): string {
  const sub = kind === 'resourcepack' ? 'resourcepacks' : kind === 'shader' ? 'shaderpacks' : 'mods'
  return join(instanceDir(id), sub)
}
