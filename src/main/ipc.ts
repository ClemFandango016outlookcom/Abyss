import { BrowserWindow, ipcMain } from 'electron'
import { IPC } from '../shared/ipc'
import type { GameLogLine, LaunchStatus, UpdateStatus } from '../shared/types'
import { getSettings, updateSettings, getAccounts, setAccounts } from './store'
import { loginInteractive, logout, getLaunchUser } from './auth'
import { getVanillaVersions, getLoaderVersions, launchInstance, killInstance } from './minecraft'
import * as modrinth from './modrinth'
import {
  listInstances,
  createInstance,
  updateInstance,
  deleteInstance,
  duplicateInstance,
  openInstanceFolder,
  installMod,
  removeMod,
  toggleMod,
  checkUpdates,
  updateMod
} from './instances'
import { listFriends, addFriend, removeFriend, updateFriend } from './friends'
import { installModpack } from './modpack'
import { discord } from './discord'
import { initUpdater, checkForUpdates, quitAndInstall, getUpdateStatus } from './updater'

/** Wrap a handler so the renderer always receives { ok, data?, error? }. */
function handle<T>(channel: string, fn: (...args: never[]) => Promise<T> | T): void {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      return { ok: true, data: await fn(...(args as never[])) }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[ipc:${channel}]`, message)
      return { ok: false, error: message }
    }
  })
}

export function registerIpc(getWindow: () => BrowserWindow | null): void {
  // Start Discord Rich Presence if the user has it enabled.
  const startup = getSettings()
  discord.configure(startup.discordRpc, startup.discordClientId)

  // App self-updater — checks GitHub Releases and streams status to the UI.
  initUpdater((s: UpdateStatus) => getWindow()?.webContents.send(IPC.updateStatus, s))

  // ---- window controls ----
  handle(IPC.windowMinimize, () => getWindow()?.minimize())
  handle(IPC.windowMaximize, () => {
    const win = getWindow()
    if (!win) return
    win.isMaximized() ? win.unmaximize() : win.maximize()
  })
  handle(IPC.windowClose, () => getWindow()?.close())

  // ---- settings ----
  handle(IPC.settingsGet, () => getSettings())
  handle(IPC.settingsUpdate, (patch) => {
    const next = updateSettings(patch)
    discord.configure(next.discordRpc, next.discordClientId)
    return next
  })

  // ---- accounts ----
  handle(IPC.accountsList, () => getAccounts())
  handle(IPC.accountLogin, async () => {
    const account = await loginInteractive()
    const others = getAccounts()
      .filter((a) => a.uuid !== account.uuid)
      .map((a) => ({ ...a, active: false }))
    setAccounts([...others, account])
    return getAccounts()
  })
  handle(IPC.accountLogout, (uuid: string) => {
    logout(uuid)
    const accounts = getAccounts().filter((a) => a.uuid !== uuid)
    if (accounts.length && !accounts.some((a) => a.active)) accounts[0].active = true
    setAccounts(accounts)
    return accounts
  })
  handle(IPC.accountSetActive, (uuid: string) => {
    const accounts = getAccounts().map((a) => ({ ...a, active: a.uuid === uuid }))
    setAccounts(accounts)
    return accounts
  })

  // ---- minecraft versions ----
  handle(IPC.mcVersions, () => getVanillaVersions())
  handle(IPC.loaderVersions, (loader, mcVersion) => getLoaderVersions(loader, mcVersion))

  // ---- launching ----
  handle(IPC.instanceLaunch, async (instanceId: string) => {
    const instance = listInstances().find((i) => i.id === instanceId)
    if (!instance) throw new Error('Instance not found')
    const account = getAccounts().find((a) => a.active)
    if (!account) throw new Error('Sign in with a Microsoft account first.')

    const win = getWindow()
    const emit = (s: LaunchStatus): void => {
      win?.webContents.send(IPC.launchStatus, s)
      if (s.phase === 'running') discord.setPlaying(instance.name, instance.mcVersion, instance.loader)
      else if (s.phase === 'closed' || s.phase === 'error') discord.setLauncher()
    }
    const logEmit = (l: GameLogLine): void => {
      win?.webContents.send(IPC.gameLog, l)
    }

    emit({ instanceId, phase: 'authenticating', message: 'Refreshing session…' })
    const user = await getLaunchUser(account.uuid)
    await launchInstance(instance, user, emit, logEmit)
    updateInstance(instanceId, { lastPlayed: Date.now() })
    if (getSettings().closeOnLaunch) win?.minimize()
    return true
  })
  handle(IPC.instanceKill, (instanceId: string) => killInstance(instanceId))

  // ---- instances ----
  handle(IPC.instancesList, () => listInstances())
  handle(IPC.instanceCreate, (input) => createInstance(input))
  handle(IPC.instanceUpdate, (id, patch) => updateInstance(id, patch))
  handle(IPC.instanceDelete, (id: string) => deleteInstance(id))
  handle(IPC.instanceDuplicate, (id: string) => duplicateInstance(id))
  handle(IPC.instanceOpenFolder, (id: string) => openInstanceFolder(id))

  // ---- mods (modrinth) ----
  handle(IPC.modrinthSearch, (params) => modrinth.search(params))
  handle(IPC.modrinthProject, (idOrSlug: string) => modrinth.getProject(idOrSlug))
  handle(IPC.modrinthVersions, (idOrSlug, loader, gameVersion) =>
    modrinth.getProjectVersions(idOrSlug, loader, gameVersion)
  )
  handle(IPC.modInstall, (instanceId, version, meta) => installMod(instanceId, version, meta))
  handle(IPC.modRemove, (instanceId, projectId) => removeMod(instanceId, projectId))
  handle(IPC.modToggle, (instanceId, projectId, enabled) =>
    toggleMod(instanceId, projectId, enabled)
  )
  handle(IPC.modUpdatesCheck, (instanceId: string) => checkUpdates(instanceId))
  handle(IPC.modUpdate, (instanceId, projectId) => updateMod(instanceId, projectId))
  handle(IPC.modpackInstall, (version, meta) => {
    const win = getWindow()
    return installModpack(version, meta, (s) => win?.webContents.send(IPC.launchStatus, s))
  })

  // ---- friends ----
  handle(IPC.friendsList, () => listFriends())
  handle(IPC.friendAdd, (name, note) => addFriend(name, note))
  handle(IPC.friendRemove, (id: string) => removeFriend(id))
  handle(IPC.friendUpdate, (id, patch) => updateFriend(id, patch))

  // ---- self-update ----
  handle(IPC.updateStatusGet, () => getUpdateStatus())
  handle(IPC.updateCheck, () => checkForUpdates())
  handle(IPC.updateInstall, () => quitAndInstall())
}
