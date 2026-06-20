import { randomUUID } from 'crypto'
import { mkdir, rm, writeFile, rename } from 'fs/promises'
import { join } from 'path'
import { shell } from 'electron'
import type {
  CreateInstanceInput,
  GameInstance,
  InstalledMod,
  ModrinthVersion
} from '../shared/types'
import { getInstances, setInstances, getSettings } from './store'
import { instanceDir, instanceModsDir } from './paths'

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

/** Downloads a mod's primary file into the instance and records it. */
export async function installMod(
  instanceId: string,
  version: ModrinthVersion,
  meta: { title: string; iconUrl?: string }
): Promise<InstalledMod> {
  const instance = getInstanceOrThrow(instanceId)
  const file = version.files.find((f) => f.primary) ?? version.files[0]
  if (!file) throw new Error('This version has no downloadable file.')

  await mkdir(instanceModsDir(instanceId), { recursive: true })
  const res = await fetch(file.url)
  if (!res.ok) throw new Error(`Download failed (${res.status})`)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(join(instanceModsDir(instanceId), file.filename), buf)

  const mod: InstalledMod = {
    projectId: version.project_id,
    versionId: version.id,
    title: meta.title,
    fileName: file.filename,
    iconUrl: meta.iconUrl,
    enabled: true
  }

  // Replace any existing entry for the same project.
  const mods = instance.mods.filter((m) => m.projectId !== version.project_id)
  mods.push(mod)
  updateInstance(instanceId, { mods })
  return mod
}

export async function removeMod(instanceId: string, projectId: string): Promise<void> {
  const instance = getInstanceOrThrow(instanceId)
  const mod = instance.mods.find((m) => m.projectId === projectId)
  if (!mod) return
  const name = mod.enabled ? mod.fileName : `${mod.fileName}.disabled`
  await rm(join(instanceModsDir(instanceId), name), { force: true })
  updateInstance(instanceId, { mods: instance.mods.filter((m) => m.projectId !== projectId) })
}

/** Enables/disables a mod by toggling the `.disabled` suffix on its jar. */
export async function toggleMod(
  instanceId: string,
  projectId: string,
  enabled: boolean
): Promise<void> {
  const instance = getInstanceOrThrow(instanceId)
  const mod = instance.mods.find((m) => m.projectId === projectId)
  if (!mod || mod.enabled === enabled) return

  const dir = instanceModsDir(instanceId)
  const from = mod.enabled ? mod.fileName : `${mod.fileName}.disabled`
  const to = enabled ? mod.fileName : `${mod.fileName}.disabled`
  await rename(join(dir, from), join(dir, to)).catch(() => {
    /* file may have been removed manually — ignore */
  })

  const mods = instance.mods.map((m) => (m.projectId === projectId ? { ...m, enabled } : m))
  updateInstance(instanceId, { mods })
}
