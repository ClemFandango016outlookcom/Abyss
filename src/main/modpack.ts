import AdmZip from 'adm-zip'
import { mkdir, writeFile } from 'fs/promises'
import { dirname, join, resolve, sep } from 'path'
import type { GameInstance, LaunchStatus, Loader, ModrinthVersion } from '../shared/types'
import { createInstance } from './instances'
import { instanceDir } from './paths'

interface MrFile {
  path: string
  downloads: string[]
  hashes?: Record<string, string>
  env?: { client?: string; server?: string }
  fileSize?: number
}

interface MrIndex {
  formatVersion: number
  game: string
  name: string
  versionId?: string
  files: MrFile[]
  dependencies: Record<string, string>
}

/** Reads the loader + version out of a modpack's dependency map. */
function mapLoader(deps: Record<string, string>): { loader: Loader; loaderVersion?: string } {
  if (deps['fabric-loader']) return { loader: 'fabric', loaderVersion: deps['fabric-loader'] }
  if (deps['quilt-loader']) return { loader: 'quilt', loaderVersion: deps['quilt-loader'] }
  if (deps['neoforge']) return { loader: 'neoforge', loaderVersion: deps['neoforge'] }
  if (deps['forge']) return { loader: 'forge', loaderVersion: deps['forge'] }
  return { loader: 'vanilla' }
}

/** Resolve a path inside the instance, refusing anything that escapes it (zip-slip). */
function safeJoin(base: string, rel: string): string | null {
  const dest = resolve(base, rel)
  if (dest !== base && !dest.startsWith(base + sep)) return null
  return dest
}

/**
 * Installs a Modrinth modpack (.mrpack): creates an instance matching the pack's
 * Minecraft version + loader, downloads every mod, and unpacks the overrides.
 */
export async function installModpack(
  version: ModrinthVersion,
  meta: { title: string; iconUrl?: string },
  emit: (status: LaunchStatus) => void
): Promise<GameInstance> {
  const file =
    version.files.find((f) => f.filename.endsWith('.mrpack')) ??
    version.files.find((f) => f.primary) ??
    version.files[0]
  if (!file) throw new Error('This modpack has no downloadable .mrpack file.')

  const res = await fetch(file.url)
  if (!res.ok) throw new Error(`Failed to download modpack (${res.status})`)
  const zip = new AdmZip(Buffer.from(await res.arrayBuffer()))

  const indexEntry = zip.getEntry('modrinth.index.json')
  if (!indexEntry) throw new Error('Invalid modpack — missing modrinth.index.json')
  const index = JSON.parse(zip.readAsText(indexEntry)) as MrIndex

  const mcVersion = index.dependencies['minecraft']
  if (!mcVersion) throw new Error('Modpack does not declare a Minecraft version.')
  const { loader, loaderVersion } = mapLoader(index.dependencies)

  const instance = await createInstance({
    name: meta.title || index.name,
    mcVersion,
    loader,
    loaderVersion,
    icon: meta.iconUrl
  })
  const root = resolve(instanceDir(instance.id))
  const status = (message: string, progress?: number): void =>
    emit({ instanceId: instance.id, phase: 'downloading', message, progress })

  status('Unpacking modpack…')

  // Extract overrides (config, resource packs, etc.) into the instance.
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue
    for (const prefix of ['overrides/', 'client-overrides/']) {
      if (entry.entryName.startsWith(prefix)) {
        const dest = safeJoin(root, entry.entryName.slice(prefix.length))
        if (!dest) break
        await mkdir(dirname(dest), { recursive: true })
        await writeFile(dest, entry.getData())
        break
      }
    }
  }

  // Download the pack's mods (client-side files only), with light concurrency.
  const targets = index.files.filter((f) => f.env?.client !== 'unsupported' && f.downloads[0])
  const total = targets.length
  let done = 0
  const queue = [...targets]

  const worker = async (): Promise<void> => {
    for (let f = queue.shift(); f; f = queue.shift()) {
      const dest = safeJoin(root, f.path)
      if (dest) {
        const r = await fetch(f.downloads[0])
        if (r.ok) {
          await mkdir(dirname(dest), { recursive: true })
          await writeFile(dest, Buffer.from(await r.arrayBuffer()))
        }
      }
      done++
      status(`Downloading mods… ${done}/${total}`, total ? done / total : undefined)
    }
  }
  await Promise.all(Array.from({ length: 8 }, () => worker()))

  emit({ instanceId: instance.id, phase: 'closed', message: `Installed ${instance.name}` })
  return instance
}
