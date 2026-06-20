import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Heart, Search } from 'lucide-react'
import { compactNumber } from '../lib/format'
import { LOADERS } from '../../../shared/types'
import type { Loader, ModrinthHit, SearchParams } from '../../../shared/types'

const sorts: SearchParams['index'][] = ['relevance', 'downloads', 'follows', 'newest', 'updated']
const types = [
  { id: 'mod', label: 'Mods' },
  { id: 'modpack', label: 'Modpacks' },
  { id: 'resourcepack', label: 'Resource Packs' },
  { id: 'shader', label: 'Shaders' }
]

export function Browse(): JSX.Element {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<ModrinthHit[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sort, setSort] = useState<SearchParams['index']>('relevance')
  const [loader, setLoader] = useState<Loader | ''>('')
  const [projectType, setProjectType] = useState('mod')
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true)
      setError('')
      window.abyss.mods
        .search({
          query,
          index: sort,
          loader: loader || undefined,
          projectType,
          limit: 40
        })
        .then((res) => {
          setHits(res.hits)
          setTotal(res.total_hits)
        })
        .catch((e) => setError(e instanceof Error ? e.message : 'Search failed'))
        .finally(() => setLoading(false))
    }, 280)
    return () => clearTimeout(t)
  }, [query, sort, loader, projectType])

  return (
    <div>
      <div className="page-head">
        <h1>Browse Mods</h1>
        <p>Powered by Modrinth — search {compactNumber(total)} projects and install them in a click.</p>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            className="input"
            placeholder="Search Modrinth…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className="select" style={{ width: 160 }} value={projectType} onChange={(e) => setProjectType(e.target.value)}>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          className="select"
          style={{ width: 140 }}
          value={loader}
          onChange={(e) => setLoader(e.target.value as Loader | '')}
        >
          <option value="">Any loader</option>
          {LOADERS.filter((l) => l.id !== 'vanilla').map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
        <select className="select" style={{ width: 140 }} value={sort} onChange={(e) => setSort(e.target.value as SearchParams['index'])}>
          {sorts.map((s) => (
            <option key={s} value={s}>
              {s![0].toUpperCase() + s!.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="banner error">{error}</div>}

      {loading ? (
        <div className="loading">
          <span className="spinner" />
        </div>
      ) : hits.length === 0 ? (
        <div className="empty">
          <Search size={42} />
          <p>No results — try a different search.</p>
        </div>
      ) : (
        <div className="grid">
          {hits.map((hit) => (
            <div key={hit.project_id} className="mod-card card" onClick={() => navigate(`/mod/${hit.slug}`)}>
              {hit.icon_url ? (
                <img className="icon" src={hit.icon_url} alt="" />
              ) : (
                <div className="icon" />
              )}
              <div style={{ minWidth: 0 }}>
                <div className="title">{hit.title}</div>
                <div className="desc">{hit.description}</div>
                <div className="stats">
                  <span>
                    <Download size={13} /> {compactNumber(hit.downloads)}
                  </span>
                  <span>
                    <Heart size={13} /> {compactNumber(hit.follows)}
                  </span>
                  <span>by {hit.author}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
