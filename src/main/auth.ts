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
/** Turns msmc's terse lexicon error codes into actionable, human messages. */
export function friendlyAuthError(err: unknown): Error {
  const raw = err as { name?: string; message?: string } | undefined
  const code = `${raw?.name ?? ''} ${raw?.message ?? ''}`.toLowerCase()

  if (code.includes('xsts.child'))
    return new Error(
      'This Microsoft account is a child (under-18) account. An adult has to add it to a ' +
        'Microsoft Family at account.microsoft.com/family and approve Xbox access before it can ' +
        'sign in to Minecraft. (If the birthday on the account is wrong, fixing it to 18+ also works.)'
    )
  if (code.includes('xsts.usernotfound') || code.includes('2148916233'))
    return new Error(
      "This Microsoft account has no Xbox profile yet. Sign in once at minecraft.net or xbox.com " +
        'to create one, then try again.'
    )
  if (code.includes('xsts.bannedcountry'))
    return new Error("Xbox Live isn't available in this account's country or region.")
  if (code.includes('error.auth.minecraft.profile') || code.includes('does not own'))
    return new Error("This Microsoft account doesn't own Minecraft: Java Edition.")
  if (code.includes('gui.closed'))
    return new Error('The sign-in window was closed before finishing — give it another go.')
  if (code.includes('error.auth') || code.includes('error.gui') || code.includes('error.state'))
    return new Error('Microsoft sign-in failed. Make sure the account owns Minecraft: Java Edition and try again.')

  return new Error(raw?.message || raw?.name || 'Sign-in failed')
}

export async function loginInteractive(): Promise<AbyssAccount> {
  try {
    const authManager = new Auth('select_account')
    const xbox = await authManager.launch('electron', { width: 520, height: 720 })
    const minecraft = await xbox.getMinecraft()
    const profile = minecraft.profile
    if (!profile) throw new Error("This account doesn't own Minecraft: Java Edition.")

    // Persist a refreshable token keyed by uuid.
    setAuthToken(profile.id, minecraft.getToken(true))

    return {
      uuid: profile.id,
      name: profile.name,
      avatar: avatarFor(profile.name),
      active: true,
      addedAt: Date.now()
    }
  } catch (err) {
    throw friendlyAuthError(err)
  }
}

/**
 * Restores a launch-ready user object for an account, refreshing the token if
 * needed. Throws if the account has no saved token (user must re-login).
 */
export async function getLaunchUser(uuid: string): Promise<LaunchUser> {
  const saved = getAuthToken(uuid) as MCToken | undefined
  if (!saved) throw new Error('No saved session for this account — please sign in again.')

  try {
    const authManager = new Auth('select_account')
    const minecraft = await mcTokenToolbox.fromToken(authManager, saved, true)
    if (!minecraft) throw new Error('Saved session is invalid — please sign in again.')

    // Refresh may rotate the token; re-persist the latest.
    setAuthToken(uuid, minecraft.getToken(true))
    return minecraft.mclc() as LaunchUser
  } catch (err) {
    throw friendlyAuthError(err)
  }
}

export function logout(uuid: string): void {
  removeAuthToken(uuid)
}
