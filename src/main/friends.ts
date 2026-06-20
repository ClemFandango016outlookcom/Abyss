import { randomUUID } from 'crypto'
import type { Friend } from '../shared/types'
import { getFriends, setFriends } from './store'

// NOTE: Abyss has no central social backend yet, so the friends list is stored
// locally on this machine. The data model + IPC surface are built so a real
// presence service can be dropped in later without UI changes.

export function listFriends(): Friend[] {
  return getFriends()
}

export function addFriend(name: string, note?: string): Friend {
  const friend: Friend = {
    id: randomUUID(),
    name: name.trim(),
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
