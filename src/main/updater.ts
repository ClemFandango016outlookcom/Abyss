import { app } from 'electron'
import electronUpdater from 'electron-updater'
import type { UpdateStatus } from '../shared/types'

// electron-updater is CommonJS — pull autoUpdater off the default export.
const { autoUpdater } = electronUpdater

let status: UpdateStatus = { current: app.getVersion(), state: 'idle' }
let sender: (s: UpdateStatus) => void = () => {}

function emit(patch: Partial<UpdateStatus>): void {
  status = { current: app.getVersion(), ...patch } as UpdateStatus
  sender(status)
}

export function getUpdateStatus(): UpdateStatus {
  return { ...status, current: app.getVersion() }
}

export function initUpdater(send: (s: UpdateStatus) => void): void {
  sender = send
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => emit({ state: 'checking' }))
  autoUpdater.on('update-available', (info) => emit({ state: 'available', version: info.version }))
  autoUpdater.on('update-not-available', () => emit({ state: 'not-available' }))
  autoUpdater.on('download-progress', (p) =>
    emit({ state: 'downloading', percent: Math.round(p.percent) })
  )
  autoUpdater.on('update-downloaded', (info) => emit({ state: 'downloaded', version: info.version }))
  autoUpdater.on('error', (e) =>
    emit({ state: 'error', error: e instanceof Error ? e.message : String(e) })
  )

  // Quietly check on startup (a few seconds after launch so the window is ready).
  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {
        /* offline or no release feed — ignore */
      })
    }, 4000)
  }
}

export async function checkForUpdates(): Promise<UpdateStatus> {
  if (!app.isPackaged) {
    emit({ state: 'disabled' })
    return getUpdateStatus()
  }
  try {
    await autoUpdater.checkForUpdates()
  } catch (e) {
    emit({ state: 'error', error: e instanceof Error ? e.message : String(e) })
  }
  return getUpdateStatus()
}

export function quitAndInstall(): void {
  if (!app.isPackaged) return
  // false = don't force-close other windows, true = restart after install
  setImmediate(() => autoUpdater.quitAndInstall(false, true))
}
