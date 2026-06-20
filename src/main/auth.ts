import { Auth, mcTokenToolbox } from 'msmc'
import type { MCToken } from 'msmc'
import type { AbyssAccount } from '../shared/types'
import { getAuthToken, setAuthToken, removeAuthToken } from './store'

/** Minimal shape of the user object minecraft-launcher-core consumes. */
export interface LaunchUser {
  access_token: string
  client_token?: string
  uuid: string
  name?: string
  meta?: { type: string; xuid?: string; demo?: boolean; refresh?: string }
  user_properties?: Record<string, unknown>
}

function avatarFor(name: string): string {
  return `https://mc-heads.net/avatar/${encodeURIComponent(name)}/64`
}

/**
 * Opens a Microsoft login popup (Electron) and authenticates the user against
 * Xbox Live + Minecraft services. Returns a normalised account record and
 * persists a refreshable token so future launches don't require re-login.
 */
export async function loginInteractive(): Promise<AbyssAccount> {
  const authManager = new Auth('select_account')
  const xbox = await authManager.launch('electron', { width: 520, height: 720 })
  const minecraft = await xbox.getMinecraft()
  const profile = minecraft.profile
  if (!profile) throw new Error('Microsoft account has no Minecraft profile (Game Pass not set up?)')

  // Persist a refreshable token keyed by uuid.
  setAuthToken(profile.id, minecraft.getToken(true))

  return {
    uuid: profile.id,
    name: profile.name,
    avatar: avatarFor(profile.name),
    active: true,
    addedAt: Date.now()
  }
}

/**
 * Restores a launch-ready user object for an account, refreshing the token if
 * needed. Throws if the account has no saved token (user must re-login).
 */
export async function getLaunchUser(uuid: string): Promise<LaunchUser> {
  const saved = getAuthToken(uuid) as MCToken | undefined
  if (!saved) throw new Error('No saved session for this account — please sign in again.')

  const authManager = new Auth('select_account')
  const minecraft = await mcTokenToolbox.fromToken(authManager, saved, true)
  if (!minecraft) throw new Error('Saved session is invalid — please sign in again.')

  // Refresh may rotate the token; re-persist the latest.
  setAuthToken(uuid, minecraft.getToken(true))
  return minecraft.mclc() as LaunchUser
}

export function logout(uuid: string): void {
  removeAuthToken(uuid)
}
