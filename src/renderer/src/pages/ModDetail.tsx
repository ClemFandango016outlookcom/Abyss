import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Download, Heart, PackagePlus } from 'lucide-react'
import { useStore } from '../store'
import { compactNumber } from '../lib/format'
import type { ModrinthProject, ModrinthVersion } from '../../../shared/types'

export function ModDetail(): JSX.Element {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const instances = useStore((s) => s.instances)
  const refreshInstances = useStore((s) => s.refreshInstances)

  const [project, setProject] = useState<ModrinthProject | null>(null)
  const [error, setError] = useState('')
  const [instanceId, setInstanceId] = useState('')
  const [versions, setVersions] = useState<ModrinthVersion[]>([])
  const [versionId, setVersionId] = useState('')
  const [installing, setInstalling] = useState(false)
  const [installed, setInstalled] = useState(false)

  const selectedInstance = instances.find((i) => i.id === instanceId)

  useEffect(() => {
    if (!slug) return
    window.abyss.mods
      .project(slug)
      .then(setProject)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load project'))
  }, [slug])

  useEffect(() => {
    if (instances.length && !instanceId) setInstanceId(instances[0].id)
  }, [instances, instanceId])

  // Load versions compatible with the selected instance.
  useEffect(() => {
    if (!slug || !selectedInstance) return
    setInstalled(false)
    window.abyss.mods
      .versions(slug, selectedInstance.loader, selectedInstance.mcVersion)
      .then((vs) => {
        setVersions(vs)
        setVersionId(vs[0]?.id ?? '')
      })
      .catch(() => setVersions([]))
  }, [slug, selectedInstance])

  const install = async (): Promise<void> => {
    if (!project || !selectedInstance) return
    const version = versions.find((v) => v.id === versionId)
    if (!version) return
    setInstalling(true)
    setError('')
    try {
      await window.abyss.mods.install(selectedInstance.id, version, {
        title: project.title,
        iconUrl: project.icon_url ?? undefined
      })
      await refreshInstances()
      setInstalled(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Install failed')
    } finally {
      setInstalling(false)
    }
  }

  if (error) {
    return (
      <div>
        <button className="btn ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="banner error" style={{ marginTop: 16 }}>
          {error}
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="loading">
        <span className="spinner" />
      </div>
    )
  }

  return (
    <div>
      <button className="btn ghost" onClick={() => navigate(-1)} style={{ marginBottom: 18 }}>
        <ArrowLeft size={16} /> Back
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
        <div>
          <div className="row" style={{ gap: 16, marginBottom: 18 }}>
            {project.icon_url ? (
              <img
                src={project.icon_url}
                alt=""
                style={{ width: 78, height: 78, borderRadius: 16, background: 'var(--ink-600)' }}
              />
            ) : (
              <div style={{ width: 78, height: 78, borderRadius: 16, background: 'var(--ink-600)' }} />
            )}
            <div>
              <h1 style={{ fontSize: 24 }}>{project.title}</h1>
              <div className="row" style={{ gap: 16, marginTop: 8 }} >
                <span className="muted row" style={{ gap: 5 }}>
                  <Download size={14} /> {compactNumber(project.downloads)}
                </span>
                <span className="muted row" style={{ gap: 5 }}>
                  <Heart size={14} /> {compactNumber(project.followers)}
                </span>
              </div>
            </div>
          </div>

          <p style={{ color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: 18 }}>
            {project.description}
          </p>

          <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {project.categories.map((c) => (
              <span key={c} className="tag accent">
                {c}
              </span>
            ))}
          </div>

          {project.gallery?.length > 0 && (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))' }}>
              {project.gallery.slice(0, 6).map((g) => (
                <img
                  key={g.url}
                  src={g.url}
                  alt={g.title ?? ''}
                  style={{ width: '100%', borderRadius: 12, border: '1px solid var(--line)' }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Install panel */}
        <div className="card" style={{ padding: 18, position: 'sticky', top: 0 }}>
          <h3 style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <PackagePlus size={18} /> Add to instance
          </h3>

          {instances.length === 0 ? (
            <p className="muted">Create an instance first, then install mods into it.</p>
          ) : (
            <>
              <div className="field">
                <label>Instance</label>
                <select className="select" value={instanceId} onChange={(e) => setInstanceId(e.target.value)}>
                  {instances.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.mcVersion} · {i.loader})
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Version</label>
                <select
                  className="select"
                  value={versionId}
                  onChange={(e) => setVersionId(e.target.value)}
                  disabled={versions.length === 0}
                >
                  {versions.length === 0 && <option>No compatible versions</option>}
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.version_number} · {v.version_type}
                    </option>
                  ))}
                </select>
              </div>

              {error && <div className="banner error">{error}</div>}

              <button
                className={`btn block ${installed ? 'teal' : 'primary'}`}
                disabled={installing || versions.length === 0}
                onClick={install}
              >
                {installing ? (
                  <span className="spinner" />
                ) : installed ? (
                  <Check size={16} />
                ) : (
                  <Download size={16} />
                )}
                {installed ? 'Installed' : 'Install'}
              </button>
              {selectedInstance && versions.length === 0 && (
                <p className="muted" style={{ marginTop: 10 }}>
                  No files match {selectedInstance.mcVersion} · {selectedInstance.loader}.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
