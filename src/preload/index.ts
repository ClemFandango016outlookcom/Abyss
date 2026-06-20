import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'
import type {
  AbyssAccount,
  AbyssSettings,
  CreateInstanceInput,
  Friend,
  GameInstance,
  InstalledMod,
  LaunchStatus,
  Loader,
  McVersion,
  ModrinthProject,
  ModrinthSearchResponse,
  ModrinthVersion,
  SearchParams
} from '../shared/types'

/** Invoke an IPC handler and unwrap the { ok, data, error } envelope. */
async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  const res = await ipcRenderer.invoke(channel, ...args)
  if (res && typeof res === 'object' && 'ok' in res) {
    if (!res.ok) throw new Error(res.error)
    return res.data as T
  }
  return res as T
}

const api = {
  window: {
    minimize: () => invoke<void>(IPC.windowMinimize),
    maximize: () => invoke<void>(IPC.windowMaximize),
    close: () => invoke<void>(IPC.windowClose)
  },
  settings: {
    get: () => invoke<AbyssSettings>(IPC.settingsGet),
    update: (patch: Partial<AbyssSettings>) => invoke<AbyssSettings>(IPC.settingsUpdate, patch)
  },
  accounts: {
    list: () => invoke<AbyssAccount[]>(IPC.accountsList),
    login: () => invoke<AbyssAccount[]>(IPC.accountLogin),
    logout: (uuid: string) => invoke<AbyssAccount[]>(IPC.accountLogout, uuid),
    setActive: (uuid: string) => invoke<AbyssAccount[]>(IPC.accountSetActive, uuid)
  },
  mc: {
    versions: () => invoke<McVersion[]>(IPC.mcVersions),
    loaderVersions: (loader: Loader, mcVersion: string) =>
      invoke<string[]>(IPC.loaderVersions, loader, mcVersion)
  },
  instances: {
    list: () => invoke<GameInstance[]>(IPC.instancesList),
    create: (input: CreateInstanceInput) => invoke<GameInstance>(IPC.instanceCreate, input),
    update: (id: string, patch: Partial<GameInstance>) =>
      invoke<GameInstance | null>(IPC.instanceUpdate, id, patch),
    remove: (id: string) => invoke<void>(IPC.instanceDelete, id),
    openFolder: (id: string) => invoke<void>(IPC.instanceOpenFolder, id),
    launch: (id: string) => invoke<boolean>(IPC.instanceLaunch, id),
    kill: (id: string) => invoke<boolean>(IPC.instanceKill, id)
  },
  mods: {
    search: (params: SearchParams) => invoke<ModrinthSearchResponse>(IPC.modrinthSearch, params),
    project: (idOrSlug: string) => invoke<ModrinthProject>(IPC.modrinthProject, idOrSlug),
    versions: (idOrSlug: string, loader?: Loader, gameVersion?: string) =>
      invoke<ModrinthVersion[]>(IPC.modrinthVersions, idOrSlug, loader, gameVersion),
    install: (instanceId: string, version: ModrinthVersion, meta: { title: string; iconUrl?: string }) =>
      invoke<InstalledMod>(IPC.modInstall, instanceId, version, meta),
    remove: (instanceId: string, projectId: string) =>
      invoke<void>(IPC.modRemove, instanceId, projectId),
    toggle: (instanceId: string, projectId: string, enabled: boolean) =>
      invoke<void>(IPC.modToggle, instanceId, projectId, enabled)
  },
  friends: {
    list: () => invoke<Friend[]>(IPC.friendsList),
    add: (name: string, note?: string) => invoke<Friend>(IPC.friendAdd, name, note),
    remove: (id: string) => invoke<void>(IPC.friendRemove, id),
    update: (id: string, patch: Partial<Friend>) => invoke<Friend | null>(IPC.friendUpdate, id, patch)
  },
  /** Subscribe to launch lifecycle events. Returns an unsubscribe function. */
  onLaunchStatus: (cb: (status: LaunchStatus) => void) => {
    const listener = (_e: unknown, status: LaunchStatus): void => cb(status)
    ipcRenderer.on(IPC.launchStatus, listener)
    return () => ipcRenderer.removeListener(IPC.launchStatus, listener)
  }
}

export type AbyssApi = typeof api

contextBridge.exposeInMainWorld('abyss', api)
