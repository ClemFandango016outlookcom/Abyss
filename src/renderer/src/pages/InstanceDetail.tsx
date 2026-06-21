import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Folder,
  Play as PlayIcon,
  Plus,
  Square,
  Trash2
} from 'lucide-react'
import { useStore } from '../store'

export function InstanceDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const instances = useStore((s) => s.instances)
  const launchStatus = useStore((s) => s.launchStatus)
  const launch = useStore((s) => s.launch)
  const kill = useStore((s) => s.kill)
  const updateInstance = useStore((s) => s.updateInstance)
  const deleteInstance = useStore((s) => s.deleteInstance)
  const refreshInstances = useStore((s) => s.refreshInstances)
  const hasAccount = useStore((s) => s.accounts.some((a) => a.active))

  const instance = instances.find((i) => i.id === id)
  const [name, setName] = useState(instance?.name ?? '')
  const [memoryMb, setMemoryMb] = useState(instance?.memoryMb ?? 4096)

  useEffect(() => {
    if (instance) {
      setName(instance.name)
      setMemoryMb(instance.memoryMb)
    }
  }, [instance?.id])

  if (!instance) {
    return (
      <div>
        <button className="btn ghost" onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="empty">
          <p>Instance not found.</p>
        </div>
      </div>
    )
  }

  const status = launchStatus[instance.id]
  const busy = !!status && status.phase !== 'closed' && status.phase !== 'error'
  const running = status?.phase === 'running'

  const onLaunch = async (): Promise<void> => {
    try {
      await launch(instance.id)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Launch failed')
    }
  }

  const toggleMod = async (projectId: string, enabled: boolean): Promise<void> => {
    await window.abyss.mods.toggle(instance.id, projectId, enabled)
    await refreshInstances()
  }

  const removeMod = async (projectId: string): Promise<void> => {
    await window.abyss.mods.remove(instance.id, projectId)
    await refreshInstances()
  }

  const onDelete = async (): Promise<void> => {
    if (!confirm(`Delete "${instance.name}" and all its files? This cannot be undone.`)) return
    await deleteInstance(instance.id)
    navigate('/')
  }

  return (
    <div>
      <button className="btn ghost" onClick={() => navigate('/')} style={{ marginBottom: 18 }}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <input
            className="input"
            style={{ fontSize: 22, fontWeight: 700, border: 'none', background: 'transparent', padding: 0 }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && name !== instance.name && updateInstance(instance.id, { name: name.trim() })}
          />
          <p className="muted" style={{ marginTop: 4 }}>
            {instance.mcVersion} · {instance.loader}
            {instance.loaderVersion ? ` ${instance.loaderVersion}` : ''}
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {running ? (
            <button className="btn danger" onClick={() => kill(instance.id)}>
              <Square size={15} /> Stop
            </button>
          ) : (
            <button className="btn lure" disabled={busy || !hasAccount} onClick={onLaunch}>
              {busy ? <span className="spinner" /> : <PlayIcon size={15} />}
              {busy ? 'Launching…' : 'Play'}
            </button>
          )}
          <button className="btn" onClick={() => window.abyss.instances.openFolder(instance.id)}>
            <Folder size={15} /> Folder
          </button>
          <button className="btn danger" onClick={onDelete}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Mods */}
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontSize: 18 }}>Mods ({instance.mods.length})</h2>
        <button className="btn sm" onClick={() => navigate('/browse')}>
          <Plus size={14} /> Add mods
        </button>
      </div>

      {instance.mods.length === 0 ? (
        <div className="empty" style={{ padding: 40 }}>
          <p className="muted">No mods installed. Browse Modrinth to add some.</p>
          <button className="btn primary" onClick={() => navigate('/browse')}>
            <Plus size={15} /> Browse mods
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: 30 }}>
          {instance.mods.map((mod) => (
            <div key={mod.projectId} className="friend-row card">
              {mod.iconUrl ? (
                <img src={mod.iconUrl} alt="" style={{ width: 38, height: 38, borderRadius: 9 }} />
              ) : (
                <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--ink-600)' }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{mod.title}</div>
                <div className="muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {mod.fileName}
                </div>
              </div>
              <label className="row muted" style={{ gap: 6 }}>
                <input
                  type="checkbox"
                  checked={mod.enabled}
                  onChange={(e) => toggleMod(mod.projectId, e.target.checked)}
                />
                {mod.enabled ? 'Enabled' : 'Disabled'}
              </label>
              <button className="btn sm danger" onClick={() => removeMod(mod.projectId)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="divider" />

      {/* Settings */}
      <h2 style={{ fontSize: 18, marginBottom: 14 }}>Instance settings</h2>
      <div className="card" style={{ padding: 18, maxWidth: 480 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Memory: {(memoryMb / 1024).toFixed(1)} GB</label>
          <input
            type="range"
            min={1024}
            max={16384}
            step={512}
            value={memoryMb}
            onChange={(e) => setMemoryMb(Number(e.target.value))}
            onMouseUp={() => updateInstance(instance.id, { memoryMb })}
          />
        </div>
      </div>
    </div>
  )
}
