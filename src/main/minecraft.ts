import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { Client } from 'minecraft-launcher-core'
import type { ChildProcess } from 'child_process'
import type { GameInstance, Loader, LaunchStatus, McVersion } from '../shared/types'
import { getSettings } from './store'
import { sharedRoot, instanceDir } from './paths'
import type { LaunchUser } from './auth'

const MANIFEST = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'
const FABRIC_META = 'https://meta.fabricmc.net/v2'
const QUILT_META = 'https://meta.quiltmc.org/v3'

// Track running game processes so they can be killed.
const running = new Map<string, ChildProcess>()

export async function getVanillaVersions(): Promise<McVersion[]> {
  const res = await fetch(MANIFEST)
  if (!res.ok) throw new Error(`Failed to load version manifest (${res.status})`)
  const json = (await res.json()) as { versions: McVersion[] }
  return json.versions
}

/** List available loader versions for a given Minecraft version. */
export async function getLoaderVersions(loader: Loader, mcVersion: string): Promise<string[]> {
  if (loader === 'fabric') {
    const res = await fetch(`${FABRIC_META}/versions/loader/${mcVersion}`)
    if (!res.ok) return []
    const arr = (await res.json()) as { loader: { version: string } }[]
    return arr.map((e) => e.loader.version)
  }
  if (loader === 'quilt') {
    const res = await fetch(`${QUILT_META}/versions/loader/${mcVersion}`)
    if (!res.ok) return []
    const arr = (await res.json()) as { loader: { version: string } }[]
    return arr.map((e) => e.loader.version)
  }
  // forge / neoforge installers are not yet wired up.
  return []
}

/**
 * Downloads a loader profile JSON (Fabric/Quilt) into the shared versions
 * folder so minecraft-launcher-core can launch it as a custom version.
 * Returns the custom version id, or null for vanilla.
 */
async function installLoaderProfile(
  loader: Loader,
  mcVersion: string,
  loaderVersion: string
): Promise<string | null> {
  if (loader === 'vanilla') return null

  let url: string
  if (loader === 'fabric') {
    url = `${FABRIC_META}/versions/loader/${mcVersion}/${loaderVersion}/profile/json`
  } else if (loader === 'quilt') {
    url = `${QUILT_META}/versions/loader/${mcVersion}/${loaderVersion}/profile/json`
  } else {
    throw new Error(`${loader} is not supported yet — use Fabric or Quilt.`)
  }

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${loader} profile (${res.status})`)
  const profile = (await res.json()) as { id: string }
  const id = profile.id
  const dir = join(sharedRoot(), 'versions', id)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, `${id}.json`), JSON.stringify(profile, null, 2))
  return id
}

/**
 * Launches an instance. `user` is a minecraft-launcher-core compatible auth
 * object (from auth.getLaunchUser). Status updates are streamed via `emit`.
 */
export async function launchInstance(
  instance: GameInstance,
  user: LaunchUser,
  emit: (status: LaunchStatus) => void
): Promise<void> {
  const id = instance.id
  const settings = getSettings()
  const status = (phase: LaunchStatus['phase'], message: string, progress?: number): void =>
    emit({ instanceId: id, phase, message, progress })

  status('preparing', 'Preparing launch…')

  let customVersion: string | null = null
  if (instance.loader !== 'vanilla') {
    if (!instance.loaderVersion) throw new Error('No loader version selected for this instance.')
    status('installing', `Installing ${instance.loader} ${instance.loaderVersion}…`)
    customVersion = await installLoaderProfile(
      instance.loader,
      instance.mcVersion,
      instance.loaderVersion
    )
  }

  // Make sure the run directory exists.
  await mkdir(instanceDir(id), { recursive: true })

  const client = new Client()

  client.on('progress', (e: { type: string; task: number; total: number }) => {
    const pct = e.total ? e.task / e.total : undefined
    status('downloading', `Downloading ${e.type}…`, pct)
  })
  client.on('download-status', () => status('downloading', 'Downloading game files…'))
  client.on('data', () => status('running', 'Minecraft is running'))
  client.on('close', (code: number) => {
    running.delete(id)
    status('closed', `Minecraft exited (code ${code})`)
  })

  status('launching', 'Starting the JVM…')

  const proc = await client.launch({
    root: sharedRoot(),
    authorization: user as never,
    version: {
      number: instance.mcVersion,
      type: 'release',
      ...(customVersion ? { custom: customVersion } : {})
    },
    memory: { max: `${instance.memoryMb}M`, min: '1024M' },
    overrides: {
      gameDirectory: instanceDir(id),
      maxSockets: 8
    },
    ...(settings.javaPath ? { javaPath: settings.javaPath } : {})
  })

  if (proc) {
    running.set(id, proc)
    status('running', 'Minecraft is running')
  } else {
    throw new Error('Launch failed — the game process did not start. Check the logs.')
  }
}

export function killInstance(instanceId: string): boolean {
  const proc = running.get(instanceId)
  if (proc) {
    proc.kill()
    running.delete(instanceId)
    return true
  }
  return false
}

export function isRunning(instanceId: string): boolean {
  return running.has(instanceId)
}
