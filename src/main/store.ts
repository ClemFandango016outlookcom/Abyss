import { app } from 'electron'
import { join } from 'path'
import Store from 'electron-store'
import type { AbyssAccount, AbyssSettings, Friend, GameInstance } from '../shared/types'

interface AbyssSchema {
  settings: AbyssSettings
  accounts: AbyssAccount[]
  instances: GameInstance[]
  friends: Friend[]
  /** Saved msmc refresh token keyed by account uuid (opaque). */
  authTokens: Record<string, unknown>
}

const defaultGameDir = join(app.getPath('userData'), 'game-data')

const defaults: AbyssSchema = {
  settings: {
    gameDir: defaultGameDir,
    defaultMemoryMb: 4096,
    closeOnLaunch: false,
    theme: 'abyss',
    discordRpc: false,
    discordClientId: ''
  },
  accounts: [],
  instances: [],
  friends: [],
  authTokens: {}
}

export const store = new Store<AbyssSchema>({ name: 'abyss', defaults })

export function getSettings(): AbyssSettings {
  return store.get('settings')
}

export function updateSettings(patch: Partial<AbyssSettings>): AbyssSettings {
  const next = { ...store.get('settings'), ...patch }
  store.set('settings', next)
  return next
}

export function getAccounts(): AbyssAccount[] {
  return store.get('accounts')
}

export function setAccounts(accounts: AbyssAccount[]): void {
  store.set('accounts', accounts)
}

export function getInstances(): GameInstance[] {
  return store.get('instances')
}

export function setInstances(instances: GameInstance[]): void {
  store.set('instances', instances)
}

export function getFriends(): Friend[] {
  return store.get('friends')
}

export function setFriends(friends: Friend[]): void {
  store.set('friends', friends)
}

export function getAuthToken(uuid: string): unknown {
  return store.get('authTokens')[uuid]
}

export function setAuthToken(uuid: string, token: unknown): void {
  const all = { ...store.get('authTokens'), [uuid]: token }
  store.set('authTokens', all)
}

export function removeAuthToken(uuid: string): void {
  const all = { ...store.get('authTokens') }
  delete all[uuid]
  store.set('authTokens', all)
}
