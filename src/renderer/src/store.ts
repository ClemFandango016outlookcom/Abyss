import { create } from 'zustand'
import type {
  AbyssAccount,
  AbyssSettings,
  CreateInstanceInput,
  Friend,
  GameInstance,
  GameLogLine,
  LaunchStatus
} from '../../shared/types'

interface AppState {
  ready: boolean
  settings: AbyssSettings | null
  accounts: AbyssAccount[]
  instances: GameInstance[]
  friends: Friend[]
  launchStatus: Record<string, LaunchStatus>
  logs: Record<string, GameLogLine[]>

  init: () => Promise<void>

  // accounts
  login: () => Promise<void>
  logout: (uuid: string) => Promise<void>
  setActiveAccount: (uuid: string) => Promise<void>

  // instances
  refreshInstances: () => Promise<void>
  createInstance: (input: CreateInstanceInput) => Promise<GameInstance>
  updateInstance: (id: string, patch: Partial<GameInstance>) => Promise<void>
  deleteInstance: (id: string) => Promise<void>
  launch: (id: string) => Promise<void>
  kill: (id: string) => Promise<void>
  clearLaunchStatus: (id: string) => void
  clearLogs: (id: string) => void

  // friends
  refreshFriends: () => Promise<void>
  addFriend: (name: string, note?: string) => Promise<void>
  removeFriend: (id: string) => Promise<void>
  updateFriend: (id: string, patch: Partial<Friend>) => Promise<void>

  // settings
  updateSettings: (patch: Partial<AbyssSettings>) => Promise<void>
}

export const useStore = create<AppState>((set, get) => ({
  ready: false,
  settings: null,
  accounts: [],
  instances: [],
  friends: [],
  launchStatus: {},
  logs: {},

  init: async () => {
    const [settings, accounts, instances, friends] = await Promise.all([
      window.abyss.settings.get(),
      window.abyss.accounts.list(),
      window.abyss.instances.list(),
      window.abyss.friends.list()
    ])
    window.abyss.onLaunchStatus((status) => {
      set((s) => ({ launchStatus: { ...s.launchStatus, [status.instanceId]: status } }))
    })
    window.abyss.onGameLog((log) => {
      set((s) => {
        const existing = s.logs[log.instanceId] ?? []
        return { logs: { ...s.logs, [log.instanceId]: [...existing, log].slice(-600) } }
      })
    })
    set({ settings, accounts, instances, friends, ready: true })
  },

  login: async () => set({ accounts: await window.abyss.accounts.login() }),
  logout: async (uuid) => set({ accounts: await window.abyss.accounts.logout(uuid) }),
  setActiveAccount: async (uuid) => set({ accounts: await window.abyss.accounts.setActive(uuid) }),

  refreshInstances: async () => set({ instances: await window.abyss.instances.list() }),
  createInstance: async (input) => {
    const created = await window.abyss.instances.create(input)
    await get().refreshInstances()
    return created
  },
  updateInstance: async (id, patch) => {
    await window.abyss.instances.update(id, patch)
    await get().refreshInstances()
  },
  deleteInstance: async (id) => {
    await window.abyss.instances.remove(id)
    await get().refreshInstances()
  },
  launch: async (id) => {
    await window.abyss.instances.launch(id)
    await get().refreshInstances()
  },
  kill: async (id) => {
    await window.abyss.instances.kill(id)
  },
  clearLaunchStatus: (id) =>
    set((s) => {
      const next = { ...s.launchStatus }
      delete next[id]
      return { launchStatus: next }
    }),
  clearLogs: (id) =>
    set((s) => {
      const next = { ...s.logs }
      delete next[id]
      return { logs: next }
    }),

  refreshFriends: async () => set({ friends: await window.abyss.friends.list() }),
  addFriend: async (name, note) => {
    await window.abyss.friends.add(name, note)
    await get().refreshFriends()
  },
  removeFriend: async (id) => {
    await window.abyss.friends.remove(id)
    await get().refreshFriends()
  },
  updateFriend: async (id, patch) => {
    await window.abyss.friends.update(id, patch)
    await get().refreshFriends()
  },

  updateSettings: async (patch) => set({ settings: await window.abyss.settings.update(patch) })
}))
