import { mkdir, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { Client } from 'minecraft-launcher-core'
import type { ChildProcess } from 'child_process'
import type { GameInstance, GameLogLine, Loader, LaunchStatus, McVersion } from '../shared/types'
import { getSettings } from './store'
import { sharedRoot, instanceDir } from './paths'
import type { LaunchUser } from './auth'

const MANIFEST = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'
const FABRIC_META = 'https://meta.fabricmc.net/v2'
const QUILT_META = 'https://meta.quiltmc.org/v3'
const FORGE_META = 'https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml'
const FORGE_BASE = 'https://maven.minecraftforge.net/net/minecraftforge/forge'
const NEOFORGE_META = 'https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml'
const NEOFORGE_BASE = 'https://maven.neoforged.net/releases/net/neoforged/neoforge'

/** Maps a Minecraft version to the NeoForge version prefix (1.21.1 -> "21.1."). */
function neoforgePrefix(mcVersion: string): string | null {
  const parts = mcVersion.split('.')
  if (parts[0] !== '1' || !parts[1]) return null
  return `${parts[1]}.${parts[2] ?? '0'}.`
}

function xmlVersions(xml: string): string[] {
  return [...xml.matchAll(/<version>([^<]+)<\/version>/g)].map((m) => m[1])
}

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
  if (loader === 'forge') {
    const res = await fetch(FORGE_META)
    if (!res.ok) return []
    return xmlVersions(await res.text())
      .filter((v) => v.startsWith(`${mcVersion}-`))
      .map((v) => v.slice(mcVersion.length + 1))
      .reverse()
  }
  if (loader === 'neoforge') {
    const res = await fetch(NEOFORGE_META)
    if (!res.ok) return []
    const prefix = neoforgePrefix(mcVersion)
    if (!prefix) return []
    return xmlVersions(await res.text())
      .filter((v) => v.startsWith(prefix))
      .reverse()
  }
  return []
}

/**
 * Downloads a Forge/NeoForge installer jar (cached). The jar is handed to
 * minecraft-launcher-core's `forge` option, which uses ForgeWrapper to run the
 * installer's processors and launch the patched client.
 */
async function downloadForgeInstaller(
  loader: Loader,
  mcVersion: string,
  loaderVersion: string
): Promise<string> {
  let url: string
  let fileName: string
  if (loader === 'forge') {
    const full = `${mcVersion}-${loaderVersion}`
    url = `${FORGE_BASE}/${full}/forge-${full}-installer.jar`
    fileName = `forge-${full}-installer.jar`
  } else {
    url = `${NEOFORGE_BASE}/${loaderVersion}/neoforge-${loaderVersion}-installer.jar`
    fileName = `neoforge-${loaderVersion}-installer.jar`
  }
  const dir = join(sharedRoot(), 'installers')
  await mkdir(dir, { recursive: true })
  const dest = join(dir, fileName)
  if (!existsSync(dest)) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Failed to download ${loader} installer (${res.status})`)
    await writeFile(dest, Buffer.from(await res.arrayBuffer()))
  }
  return dest
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
  emit: (status: LaunchStatus) => void,
  logEmit: (line: GameLogLine) => void = () => {}
): Promise<void> {
  const id = instance.id
  const settings = getSettings()
  const status = (phase: LaunchStatus['phase'], message: string, progress?: number): void =>
    emit({ instanceId: id, phase, message, progress })

  status('preparing', 'Preparing launch…')

  let customVersion: string | null = null
  let forgeInstaller: string | null = null
  if (instance.loader !== 'vanilla') {
    if (!instance.loaderVersion) throw new Error('No loader version selected for this instance.')
    if (instance.loader === 'fabric' || instance.loader === 'quilt') {
      status('installing', `Installing ${instance.loader} ${instance.loaderVersion}…`)
      customVersion = await installLoaderProfile(
        instance.loader,
        instance.mcVersion,
        instance.loaderVersion
      )
    } else {
      status('installing', `Downloading ${instance.loader} installer…`)
      forgeInstaller = await downloadForgeInstaller(
        instance.loader,
        instance.mcVersion,
        instance.loaderVersion
      )
      status('installing', `Installing ${instance.loader} — the first launch can take a few minutes…`)
    }
  }

  // Make sure the run directory exists.
  await mkdir(instanceDir(id), { recursive: true })

  const client = new Client()

  client.on('progress', (e: { type: string; task: number; total: number }) => {
    const pct = e.total ? e.task / e.total : undefined
    status('downloading', `Downloading ${e.type}…`, pct)
  })
  client.on('download-status', () => status('downloading', 'Downloading game files…'))
  client.on('data', (line: string) => {
    status('running', 'Minecraft is running')
    logEmit({ instanceId: id, line: String(line).replace(/\r?\n$/, ''), level: 'info' })
  })
  client.on('debug', (line: string) => {
    logEmit({ instanceId: id, line: String(line).replace(/\r?\n$/, ''), level: 'debug' })
  })
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
    ...(forgeInstaller ? { forge: forgeInstaller } : {}),
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
