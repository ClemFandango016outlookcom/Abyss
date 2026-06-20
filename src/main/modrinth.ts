import type {
  Loader,
  ModrinthProject,
  ModrinthSearchResponse,
  ModrinthVersion,
  SearchParams
} from '../shared/types'

const BASE = 'https://api.modrinth.com/v2'
// Modrinth asks every client to identify itself via User-Agent.
const UA = 'abyss-launcher/0.1.0 (github.com/abyss-launcher/abyss)'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'User-Agent': UA, Accept: 'application/json' }
  })
  if (!res.ok) {
    throw new Error(`Modrinth ${res.status} ${res.statusText} for ${path}`)
  }
  return (await res.json()) as T
}

export async function search(params: SearchParams): Promise<ModrinthSearchResponse> {
  const facets: string[][] = []
  if (params.projectType) facets.push([`project_type:${params.projectType}`])
  if (params.loader && params.loader !== 'vanilla') facets.push([`categories:${params.loader}`])
  if (params.gameVersion) facets.push([`versions:${params.gameVersion}`])
  if (params.category) facets.push([`categories:${params.category}`])

  const qs = new URLSearchParams()
  if (params.query) qs.set('query', params.query)
  qs.set('limit', String(params.limit ?? 30))
  qs.set('offset', String(params.offset ?? 0))
  qs.set('index', params.index ?? 'relevance')
  if (facets.length) qs.set('facets', JSON.stringify(facets))

  return get<ModrinthSearchResponse>(`/search?${qs.toString()}`)
}

export async function getProject(idOrSlug: string): Promise<ModrinthProject> {
  return get<ModrinthProject>(`/project/${encodeURIComponent(idOrSlug)}`)
}

export async function getProjectVersions(
  idOrSlug: string,
  loader?: Loader,
  gameVersion?: string
): Promise<ModrinthVersion[]> {
  const qs = new URLSearchParams()
  if (loader && loader !== 'vanilla') qs.set('loaders', JSON.stringify([loader]))
  if (gameVersion) qs.set('game_versions', JSON.stringify([gameVersion]))
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return get<ModrinthVersion[]>(`/project/${encodeURIComponent(idOrSlug)}/version${suffix}`)
}

export async function getVersion(versionId: string): Promise<ModrinthVersion> {
  return get<ModrinthVersion>(`/version/${encodeURIComponent(versionId)}`)
}
