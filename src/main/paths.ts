import { join } from 'path'
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
