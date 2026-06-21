// Shared types used across main, preload and renderer.

export type Loader = 'vanilla' | 'fabric' | 'quilt' | 'forge' | 'neoforge'

export const LOADERS: { id: Loader; label: string; supported: boolean; experimental?: boolean }[] = [
  { id: 'vanilla', label: 'Vanilla', supported: true },
  { id: 'fabric', label: 'Fabric', supported: true },
  { id: 'quilt', label: 'Quilt', supported: true },
  { id: 'neoforge', label: 'NeoForge', supported: true, experimental: true },
  { id: 'forge', label: 'Forge', supported: true, experimental: true }
]

export interface AbyssAccount {
  /** Minecraft profile UUID */
  uuid: string
  /** Player name */
  name: string
  /** Skin/cape texture url, when available */
  avatar?: string
  /** Whether this account is the active one */
  active: boolean
  addedAt: number
}

export interface InstalledMod {
  /** Modrinth project id */
  projectId: string
  /** Modrinth version id that is installed */
  versionId: string
  title: string
  fileName: string
  iconUrl?: string
  /** Whether the .jar is currently enabled (vs .jar.disabled) */
  enabled: boolean
}

export interface GameInstance {
  id: string
  name: string
  mcVersion: string
  loader: Loader
  loaderVersion?: string
  icon?: string
  mods: InstalledMod[]
  createdAt: number
  lastPlayed?: number
  /** Memory in megabytes */
  memoryMb: number
}

export interface AbyssSettings {
  /** Root directory where game files / instances live */
  gameDir: string
  /** Default memory allocation in MB */
  defaultMemoryMb: number
  /** Optional explicit path to a java executable */
  javaPath?: string
  /** Close launcher when the game starts */
  closeOnLaunch: boolean
  theme: 'abyss' | 'midnight' | 'void'
}

export interface Friend {
  id: string
  name: string
  /** Real Minecraft account UUID, when the username resolved against Mojang. */
  uuid?: string
  /** True when the username matched a real Minecraft: Java account. */
  verified?: boolean
  /** Free-form status the user can set */
  status: 'online' | 'offline' | 'away' | 'in-game'
  note?: string
  addedAt: number
}

// ---- Minecraft version manifest (subset of Mojang's piston-meta) ----
export interface McVersion {
  id: string
  type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha' | string
  url: string
  releaseTime: string
}

// ---- Modrinth API (subset) ----
export interface ModrinthHit {
  project_id: string
  slug: string
  title: string
  description: string
  categories: string[]
  downloads: number
  follows: number
  icon_url: string | null
  author: string
  versions: string[]
  project_type: string
}

export interface ModrinthSearchResponse {
  hits: ModrinthHit[]
  offset: number
  limit: number
  total_hits: number
}

export interface ModrinthProject {
  id: string
  slug: string
  title: string
  description: string
  body: string
  categories: string[]
  client_side: string
  server_side: string
  project_type: string
  downloads: number
  followers: number
  icon_url: string | null
  gallery: { url: string; featured: boolean; title?: string }[]
  game_versions: string[]
  loaders: string[]
}

export interface ModrinthFile {
  hashes: { sha1: string; sha512: string }
  url: string
  filename: string
  primary: boolean
  size: number
}

export interface ModrinthVersion {
  id: string
  project_id: string
  name: string
  version_number: string
  game_versions: string[]
  loaders: string[]
  version_type: 'release' | 'beta' | 'alpha'
  downloads: number
  date_published: string
  files: ModrinthFile[]
  dependencies: { project_id: string | null; version_id: string | null; dependency_type: string }[]
}

// ---- Launch lifecycle events streamed main -> renderer ----
export type LaunchPhase =
  | 'preparing'
  | 'authenticating'
  | 'installing'
  | 'downloading'
  | 'launching'
  | 'running'
  | 'closed'
  | 'error'

export interface LaunchStatus {
  instanceId: string
  phase: LaunchPhase
  message: string
  /** 0..1 when a determinate progress is known */
  progress?: number
}

export interface Result<T> {
  ok: boolean
  data?: T
  error?: string
}

// ---- Input payloads shared between renderer and main ----
export interface CreateInstanceInput {
  name: string
  mcVersion: string
  loader: Loader
  loaderVersion?: string
  memoryMb?: number
  icon?: string
}

export interface SearchParams {
  query?: string
  projectType?: string
  loader?: Loader
  gameVersion?: string
  category?: string
  index?: 'relevance' | 'downloads' | 'follows' | 'newest' | 'updated'
  limit?: number
  offset?: number
}
