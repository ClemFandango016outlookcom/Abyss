import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Download, Heart, Layers, PackagePlus } from 'lucide-react'
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
  const [depCount, setDepCount] = useState(0)

  const isModpack = project?.project_type === 'modpack'
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

  // Modpacks show every version; mods show only versions matching the target instance.
  useEffect(() => {
    if (!slug || !project) return
    setInstalled(false)
    const load = isModpack
      ? window.abyss.mods.versions(slug)
      : selectedInstance
        ? window.abyss.mods.versions(slug, selectedInstance.loader, selectedInstance.mcVersion)
        : null
    if (!load) return
    load
      .then((vs) => {
        setVersions(vs)
        setVersionId(vs[0]?.id ?? '')
      })
      .catch(() => setVersions([]))
  }, [slug, project, isModpack, selectedInstance])

  const install = async (): Promise<void> => {
    if (!project) return
    const version = versions.find((v) => v.id === versionId)
    if (!version) return
    setInstalling(true)
    setError('')
    const meta = {
      title: project.title,
      iconUrl: project.icon_url ?? undefined,
      projectType: project.project_type
    }
    try {
      if (isModpack) {
        const instance = await window.abyss.mods.installModpack(version, meta)
        await refreshInstances()
        navigate(`/instance/${instance.id}`)
        return
      }
      if (!selectedInstance) return
      const added = await window.abyss.mods.install(selectedInstance.id, version, meta)
      await refreshInstances()
      setInstalled(true)
      setDepCount(Math.max(0, added.length - 1))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Install failed')
    } finally {
      setInstalling(false)
    }
  }

  if (error && !project) {
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
              {isModpack && <div className="eyebrow">Modpack</div>}
              <h1 style={{ fontSize: 24 }}>{project.title}</h1>
              <div className="row" style={{ gap: 16, marginTop: 8 }}>
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
            {isModpack ? <Layers size={18} /> : <PackagePlus size={18} />}
            {isModpack ? 'Install modpack' : 'Add to instance'}
          </h3>

          {isModpack ? (
            <>
              <p className="muted" style={{ marginBottom: 14 }}>
                Creates a new instance with the pack&apos;s Minecraft version, loader and every mod
                it bundles.
              </p>
              <div className="field">
                <label>Pack version</label>
                <select
                  className="select"
                  value={versionId}
                  onChange={(e) => setVersionId(e.target.value)}
                  disabled={!versions.length}
                >
                  {versions.length === 0 && <option>Loading…</option>}
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.version_number} · {v.game_versions[0] ?? ''}
                    </option>
                  ))}
                </select>
              </div>
              {error && <div className="banner error">{error}</div>}
              <button
                className="btn primary block"
                disabled={installing || versions.length === 0}
                onClick={install}
              >
                {installing ? <span className="spinner" /> : <Download size={16} />}
                {installing ? 'Installing…' : 'Install modpack'}
              </button>
            </>
          ) : instances.length === 0 ? (
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
              {installed && depCount > 0 && (
                <p className="muted" style={{ marginTop: 10 }}>
                  Also pulled in {depCount} required {depCount === 1 ? 'dependency' : 'dependencies'}.
                </p>
              )}
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
