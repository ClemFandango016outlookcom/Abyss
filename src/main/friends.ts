import { randomUUID } from 'crypto'
import type { Friend } from '../shared/types'
import { getFriends, setFriends } from './store'

// Friends are stored locally on this machine — there is no central Abyss social
// backend yet, so live presence isn't synced. Usernames are validated against
// Mojang's public API when added, so a friend reflects a real Minecraft account
// (real UUID + skin) rather than arbitrary text.

async function resolveMojang(name: string): Promise<{ id: string; name: string } | null> {
  try {
    const res = await fetch(
      `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(name)}`
    )
    if (res.status !== 200) return null
    const json = (await res.json()) as { id?: string; name?: string }
    if (!json.id || !json.name) return null
    return { id: json.id, name: json.name }
  } catch {
    return null
  }
}

export function listFriends(): Friend[] {
  return getFriends()
}

export async function addFriend(name: string, note?: string): Promise<Friend> {
  const trimmed = name.trim()
  const profile = await resolveMojang(trimmed)
  const friend: Friend = {
    id: randomUUID(),
    name: profile?.name ?? trimmed,
    uuid: profile?.id,
    verified: !!profile,
    status: 'offline',
    note,
    addedAt: Date.now()
  }
  setFriends([...getFriends(), friend])
  return friend
}

export function removeFriend(id: string): void {
  setFriends(getFriends().filter((f) => f.id !== id))
}

export function updateFriend(id: string, patch: Partial<Friend>): Friend | null {
  const all = getFriends()
  const idx = all.findIndex((f) => f.id === id)
  if (idx === -1) return null
  const next = { ...all[idx], ...patch, id }
  all[idx] = next
  setFriends(all)
  return next
}
