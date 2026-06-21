import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  Folder,
  Play as PlayIcon,
  Plus,
  RefreshCw,
  Square,
  Terminal,
  Trash2
} from 'lucide-react'
import { useStore } from '../store'
import type { ModUpdate } from '../../../shared/types'

export function InstanceDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const instances = useStore((s) => s.instances)
  const launchStatus = useStore((s) => s.launchStatus)
  const logsMap = useStore((s) => s.logs)
  const clearLogs = useStore((s) => s.clearLogs)
  const launch = useStore((s) => s.launch)
  const kill = useStore((s) => s.kill)
  const updateInstance = useStore((s) => s.updateInstance)
  const deleteInstance = useStore((s) => s.deleteInstance)
  const refreshInstances = useStore((s) => s.refreshInstances)
  const hasAccount = useStore((s) => s.accounts.some((a) => a.active))

  const instance = instances.find((i) => i.id === id)
  const [name, setName] = useState(instance?.name ?? '')
  const [memoryMb, setMemoryMb] = useState(instance?.memoryMb ?? 4096)
  const [updates, setUpdates] = useState<ModUpdate[]>([])
  const [checking, setChecking] = useState(false)
  const [updating, setUpdating] = useState<Set<string>>(new Set())
  const [duplicating, setDuplicating] = useState(false)
  const [consoleOpen, setConsoleOpen] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  const logs = instance ? (logsMap[instance.id] ?? []) : []

  useEffect(() => {
    if (instance) {
      setName(instance.name)
      setMemoryMb(instance.memoryMb)
      setUpdates([])
    }
  }, [instance?.id])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs.length])

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
  const updateMap = new Map(updates.map((u) => [u.projectId, u]))

  const onLaunch = async (): Promise<void> => {
    setConsoleOpen(true)
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

  const checkForUpdates = async (): Promise<void> => {
    setChecking(true)
    try {
      setUpdates(await window.abyss.mods.checkUpdates(instance.id))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Update check failed')
    } finally {
      setChecking(false)
    }
  }

  const updateOne = async (projectId: string): Promise<void> => {
    setUpdating((s) => new Set(s).add(projectId))
    try {
      await window.abyss.mods.update(instance.id, projectId)
      await refreshInstances()
      setUpdates((prev) => prev.filter((u) => u.projectId !== projectId))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setUpdating((s) => {
        const n = new Set(s)
        n.delete(projectId)
        return n
      })
    }
  }

  const updateAll = async (): Promise<void> => {
    for (const u of [...updates]) await updateOne(u.projectId)
  }

  const onDuplicate = async (): Promise<void> => {
    setDuplicating(true)
    try {
      const copy = await window.abyss.instances.duplicate(instance.id)
      await refreshInstances()
      if (copy) navigate(`/instance/${copy.id}`)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Duplicate failed')
    } finally {
      setDuplicating(false)
    }
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
            style={{ fontSize: 22, fontWeight: 700, border: 'none', background: 'transparent', padding: 0, fontFamily: 'var(--font-display)' }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && name !== instance.name && updateInstance(instance.id, { name: name.trim() })}
          />
          <p className="muted mono" style={{ marginTop: 4 }}>
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
          <button className="btn" title="Duplicate" disabled={duplicating} onClick={onDuplicate}>
            {duplicating ? <span className="spinner" /> : <Copy size={15} />}
          </button>
          <button className="btn" title="Open folder" onClick={() => window.abyss.instances.openFolder(instance.id)}>
            <Folder size={15} />
          </button>
          <button className="btn danger" title="Delete" onClick={onDelete}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontSize: 18 }}>Content ({instance.mods.length})</h2>
        <div className="row" style={{ gap: 8 }}>
          {updates.length > 0 && (
            <button className="btn sm teal" onClick={updateAll}>
              <ArrowUpCircle size={14} /> Update all ({updates.length})
            </button>
          )}
          {instance.mods.length > 0 && (
            <button className="btn sm" disabled={checking} onClick={checkForUpdates}>
              {checking ? <span className="spinner" /> : <RefreshCw size={14} />} Check updates
            </button>
          )}
          <button className="btn sm" onClick={() => navigate('/browse')}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {instance.mods.length === 0 ? (
        <div className="empty" style={{ padding: 40 }}>
          <p className="muted">Nothing installed yet. Browse Modrinth to add mods, packs or shaders.</p>
          <button className="btn primary" onClick={() => navigate('/browse')}>
            <Plus size={15} /> Browse Modrinth
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: 30 }}>
          {instance.mods.map((mod) => {
            const update = updateMap.get(mod.projectId)
            return (
              <div key={mod.projectId} className="friend-row card">
                {mod.iconUrl ? (
                  <img src={mod.iconUrl} alt="" style={{ width: 38, height: 38, borderRadius: 9 }} />
                ) : (
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--ink-600)' }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 8, fontWeight: 600 }}>
                    {mod.title}
                    {mod.kind && mod.kind !== 'mod' && (
                      <span className="tag" style={{ fontSize: 10 }}>
                        {mod.kind === 'resourcepack' ? 'resource pack' : 'shader'}
                      </span>
                    )}
                  </div>
                  <div className="muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {mod.fileName}
                  </div>
                </div>
                {update && (
                  <button
                    className="btn sm teal"
                    disabled={updating.has(mod.projectId)}
                    onClick={() => updateOne(mod.projectId)}
                    title={`Update to ${update.latestVersionNumber}`}
                  >
                    {updating.has(mod.projectId) ? <span className="spinner" /> : <ArrowUpCircle size={13} />}
                    Update
                  </button>
                )}
                <label className="row muted" style={{ gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={mod.enabled}
                    onChange={(e) => toggleMod(mod.projectId, e.target.checked)}
                  />
                  {mod.enabled ? 'On' : 'Off'}
                </label>
                <button className="btn sm danger" onClick={() => removeMod(mod.projectId)}>
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Console */}
      <div className="card" style={{ marginBottom: 30, overflow: 'hidden' }}>
        <button
          className="row"
          onClick={() => setConsoleOpen((o) => !o)}
          style={{ width: '100%', justifyContent: 'space-between', padding: '13px 16px', background: 'transparent' }}
        >
          <span className="row" style={{ gap: 9, fontWeight: 700 }}>
            <Terminal size={16} /> Console
            {logs.length > 0 && <span className="tag">{logs.length}</span>}
          </span>
          <span className="row" style={{ gap: 10 }}>
            {logs.length > 0 && (
              <span
                className="muted"
                onClick={(e) => {
                  e.stopPropagation()
                  clearLogs(instance.id)
                }}
                style={{ cursor: 'pointer' }}
              >
                clear
              </span>
            )}
            {consoleOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
        </button>
        {consoleOpen && (
          <div
            ref={logRef}
            style={{
              maxHeight: 280,
              overflowY: 'auto',
              padding: '0 16px 14px',
              fontFamily: 'var(--font-mono)',
              fontSize: 11.5,
              lineHeight: 1.5
            }}
          >
            {logs.length === 0 ? (
              <p className="muted" style={{ padding: '4px 0 10px' }}>
                Launch the instance to see live output here. Handy for debugging Forge / NeoForge.
              </p>
            ) : (
              logs.map((l, i) => (
                <div
                  key={i}
                  style={{
                    color: l.level === 'debug' ? 'var(--text-faint)' : 'var(--text-dim)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {l.line}
                </div>
              ))
            )}
          </div>
        )}
      </div>

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
