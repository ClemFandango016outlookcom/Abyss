import { randomUUID } from 'crypto'
import { mkdir, rm, writeFile, rename } from 'fs/promises'
import { join } from 'path'
import { shell } from 'electron'
import type {
  ContentKind,
  CreateInstanceInput,
  GameInstance,
  InstalledMod,
  ModUpdate,
  ModrinthVersion
} from '../shared/types'
import { getInstances, setInstances, getSettings } from './store'
import { instanceDir, instanceModsDir, instanceContentDir } from './paths'
import * as modrinth from './modrinth'

export interface InstallMeta {
  title: string
  iconUrl?: string
  /** Modrinth project_type — routes the file to mods / resourcepacks / shaderpacks. */
  projectType?: string
}

export function listInstances(): GameInstance[] {
  return getInstances()
}

export async function createInstance(input: CreateInstanceInput): Promise<GameInstance> {
  const instance: GameInstance = {
    id: randomUUID(),
    name: input.name.trim() || 'New Instance',
    mcVersion: input.mcVersion,
    loader: input.loader,
    loaderVersion: input.loaderVersion,
    icon: input.icon,
    mods: [],
    createdAt: Date.now(),
    memoryMb: input.memoryMb ?? getSettings().defaultMemoryMb
  }
  await mkdir(instanceModsDir(instance.id), { recursive: true })
  setInstances([...getInstances(), instance])
  return instance
}

export function updateInstance(id: string, patch: Partial<GameInstance>): GameInstance | null {
  const all = getInstances()
  const idx = all.findIndex((i) => i.id === id)
  if (idx === -1) return null
  const next = { ...all[idx], ...patch, id }
  all[idx] = next
  setInstances(all)
  return next
}

export async function deleteInstance(id: string): Promise<void> {
  setInstances(getInstances().filter((i) => i.id !== id))
  await rm(instanceDir(id), { recursive: true, force: true })
}

export async function duplicateInstance(id: string): Promise<GameInstance | null> {
  const src = getInstances().find((i) => i.id === id)
  if (!src) return null
  const copy: GameInstance = {
    ...src,
    id: randomUUID(),
    name: `${src.name} (copy)`,
    createdAt: Date.now(),
    lastPlayed: undefined
  }
  // Re-download the copy's content so the two instances don't share files.
  await mkdir(instanceModsDir(copy.id), { recursive: true })
  setInstances([...getInstances(), copy])
  for (const mod of src.mods) {
    try {
      const version = await modrinth.getVersion(mod.versionId)
      await downloadContent(copy.id, version, mod.kind ?? 'mod', mod)
    } catch {
      /* skip anything that can't be re-fetched */
    }
  }
  return copy
}

export async function openInstanceFolder(id: string): Promise<void> {
  const dir = instanceDir(id)
  await mkdir(dir, { recursive: true })
  await shell.openPath(dir)
}

function getInstanceOrThrow(id: string): GameInstance {
  const inst = getInstances().find((i) => i.id === id)
  if (!inst) throw new Error('Instance not found')
  return inst
}

function kindFromProjectType(projectType?: string): ContentKind {
  if (projectType === 'resourcepack') return 'resourcepack'
  if (projectType === 'shader') return 'shader'
  return 'mod'
}

function newestVersion(versions: ModrinthVersion[]): ModrinthVersion | undefined {
  return versions
    .slice()
    .sort((a, b) => +new Date(b.date_published) - +new Date(a.date_published))[0]
}

/** Downloads a version's primary file into the right folder and returns the record. */
async function downloadContent(
  instanceId: string,
  version: ModrinthVersion,
  kind: ContentKind,
  meta: { title: string; iconUrl?: string }
): Promise<InstalledMod | null> {
  const file = version.files.find((f) => f.primary) ?? version.files[0]
  if (!file) return null
  const dir = instanceContentDir(instanceId, kind)
  await mkdir(dir, { recursive: true })
  const res = await fetch(file.url)
  if (!res.ok) throw new Error(`Download failed (${res.status})`)
  await writeFile(join(dir, file.filename), Buffer.from(await res.arrayBuffer()))
  return {
    projectId: version.project_id,
    versionId: version.id,
    title: meta.title,
    fileName: file.filename,
    iconUrl: meta.iconUrl,
    enabled: true,
    kind
  }
}

/**
 * Installs a mod and all of its REQUIRED dependencies (resolved transitively
 * against the instance's loader + Minecraft version). Resource packs and
 * shaders are routed to their own folders. Returns everything that was added.
 */
export async function installMod(
  instanceId: string,
  version: ModrinthVersion,
  meta: InstallMeta
): Promise<InstalledMod[]> {
  const instance = getInstanceOrThrow(instanceId)
  const seen = new Set(instance.mods.map((m) => m.projectId))
  let mods = [...instance.mods]
  const installed: InstalledMod[] = []

  interface QueueItem {
    version: ModrinthVersion
    title: string
    iconUrl?: string
    kind: ContentKind
  }
  const queue: QueueItem[] = [
    { version, title: meta.title, iconUrl: meta.iconUrl, kind: kindFromProjectType(meta.projectType) }
  ]

  while (queue.length) {
    const item = queue.shift() as QueueItem
    if (seen.has(item.version.project_id)) continue
    seen.add(item.version.project_id)

    const mod = await downloadContent(instanceId, item.version, item.kind, {
      title: item.title,
      iconUrl: item.iconUrl
    })
    if (!mod) continue
    mods = mods.filter((m) => m.projectId !== mod.projectId)
    mods.push(mod)
    installed.push(mod)

    // Queue required dependencies (always treated as mods).
    for (const dep of item.version.dependencies ?? []) {
      if (dep.dependency_type !== 'required') continue
      if (dep.project_id && seen.has(dep.project_id)) continue
      try {
        const depVersion = dep.version_id
          ? await modrinth.getVersion(dep.version_id)
          : dep.project_id
            ? newestVersion(
                await modrinth.getProjectVersions(dep.project_id, instance.loader, instance.mcVersion)
              )
            : undefined
        if (depVersion) {
          const proj = await modrinth.getProject(depVersion.project_id)
          queue.push({
            version: depVersion,
            title: proj.title,
            iconUrl: proj.icon_url ?? undefined,
            kind: 'mod'
          })
        }
      } catch {
        /* dependency couldn't be resolved — skip it */
      }
    }
  }

  updateInstance(instanceId, { mods })
  return installed
}

export async function removeMod(instanceId: string, projectId: string): Promise<void> {
  const instance = getInstanceOrThrow(instanceId)
  const mod = instance.mods.find((m) => m.projectId === projectId)
  if (!mod) return
  const dir = instanceContentDir(instanceId, mod.kind ?? 'mod')
  const name = mod.enabled ? mod.fileName : `${mod.fileName}.disabled`
  await rm(join(dir, name), { force: true })
  updateInstance(instanceId, { mods: instance.mods.filter((m) => m.projectId !== projectId) })
}

/** Enables/disables content by toggling the `.disabled` suffix on its file. */
export async function toggleMod(
  instanceId: string,
  projectId: string,
  enabled: boolean
): Promise<void> {
  const instance = getInstanceOrThrow(instanceId)
  const mod = instance.mods.find((m) => m.projectId === projectId)
  if (!mod || mod.enabled === enabled) return

  const dir = instanceContentDir(instanceId, mod.kind ?? 'mod')
  const from = mod.enabled ? mod.fileName : `${mod.fileName}.disabled`
  const to = enabled ? mod.fileName : `${mod.fileName}.disabled`
  await rename(join(dir, from), join(dir, to)).catch(() => {
    /* file may have been removed manually — ignore */
  })

  const mods = instance.mods.map((m) => (m.projectId === projectId ? { ...m, enabled } : m))
  updateInstance(instanceId, { mods })
}

/** Checks each installed mod for a newer version compatible with the instance. */
export async function checkUpdates(instanceId: string): Promise<ModUpdate[]> {
  const instance = getInstanceOrThrow(instanceId)
  const results = await Promise.all(
    instance.mods.map(async (mod): Promise<ModUpdate | null> => {
      try {
        const versions = await modrinth.getProjectVersions(
          mod.projectId,
          instance.loader,
          instance.mcVersion
        )
        const latest = newestVersion(versions)
        if (!latest || latest.id === mod.versionId) return null
        return {
          projectId: mod.projectId,
          title: mod.title,
          iconUrl: mod.iconUrl,
          currentVersionId: mod.versionId,
          latestVersionId: latest.id,
          latestVersionNumber: latest.version_number
        }
      } catch {
        return null
      }
    })
  )
  return results.filter((u): u is ModUpdate => u !== null)
}

/** Updates a single mod to the newest compatible version, preserving enabled state. */
export async function updateMod(
  instanceId: string,
  projectId: string
): Promise<InstalledMod | null> {
  const instance = getInstanceOrThrow(instanceId)
  const mod = instance.mods.find((m) => m.projectId === projectId)
  if (!mod) return null
  const versions = await modrinth.getProjectVersions(projectId, instance.loader, instance.mcVersion)
  const latest = newestVersion(versions)
  if (!latest || latest.id === mod.versionId) return mod

  const kind = mod.kind ?? 'mod'
  const dir = instanceContentDir(instanceId, kind)
  await rm(join(dir, mod.enabled ? mod.fileName : `${mod.fileName}.disabled`), { force: true })

  const updated = await downloadContent(instanceId, latest, kind, {
    title: mod.title,
    iconUrl: mod.iconUrl
  })
  if (!updated) return null
  if (!mod.enabled) {
    updated.enabled = false
    await rename(join(dir, updated.fileName), join(dir, `${updated.fileName}.disabled`)).catch(
      () => {}
    )
  }
  updateInstance(instanceId, {
    mods: instance.mods.map((m) => (m.projectId === projectId ? updated : m))
  })
  return updated
}
