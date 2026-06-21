import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'
import { LOADERS } from '../../../shared/types'
import type { GameInstance, Loader, McVersion } from '../../../shared/types'
import { useStore } from '../store'

interface Props {
  onClose: () => void
  onCreated?: (instance: GameInstance) => void
}

export function CreateInstanceModal({ onClose, onCreated }: Props): JSX.Element {
  const createInstance = useStore((s) => s.createInstance)
  const settings = useStore((s) => s.settings)

  const [versions, setVersions] = useState<McVersion[]>([])
  const [showSnapshots, setShowSnapshots] = useState(false)
  const [name, setName] = useState('')
  const [mcVersion, setMcVersion] = useState('')
  const [loader, setLoader] = useState<Loader>('fabric')
  const [loaderVersions, setLoaderVersions] = useState<string[]>([])
  const [loaderVersion, setLoaderVersion] = useState('')
  const [memoryMb, setMemoryMb] = useState(settings?.defaultMemoryMb ?? 4096)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    window.abyss.mc.versions().then(setVersions).catch(() => setError('Could not load Minecraft versions.'))
  }, [])

  const filtered = useMemo(
    () => versions.filter((v) => (showSnapshots ? true : v.type === 'release')),
    [versions, showSnapshots]
  )

  useEffect(() => {
    if (filtered.length && !filtered.some((v) => v.id === mcVersion)) {
      setMcVersion(filtered[0].id)
    }
  }, [filtered, mcVersion])

  useEffect(() => {
    if (loader === 'vanilla' || !mcVersion) {
      setLoaderVersions([])
      setLoaderVersion('')
      return
    }
    let cancelled = false
    setLoaderVersions([])
    window.abyss.mc
      .loaderVersions(loader, mcVersion)
      .then((vs) => {
        if (cancelled) return
        setLoaderVersions(vs)
        setLoaderVersion(vs[0] ?? '')
      })
      .catch(() => {
        if (!cancelled) setLoaderVersion('')
      })
    return () => {
      cancelled = true
    }
  }, [loader, mcVersion])

  const loaderMeta = LOADERS.find((l) => l.id === loader)
  const supported = loaderMeta?.supported ?? false
  const placeholder = `${loaderMeta?.label ?? loader} ${mcVersion}`
  const canCreate =
    supported && mcVersion && (loader === 'vanilla' || loaderVersion) && !busy

  const submit = async (): Promise<void> => {
    setError('')
    setBusy(true)
    try {
      const created = await createInstance({
        name: name.trim() || placeholder,
        mcVersion,
        loader,
        loaderVersion: loader === 'vanilla' ? undefined : loaderVersion,
        memoryMb
      })
      onCreated?.(created)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create instance')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Create instance" onClose={onClose}>
      {error && (
        <div className="banner error">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div className="field">
        <label>Name</label>
        <input
          className="input"
          placeholder={placeholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label>Minecraft version</label>
          <select className="select" value={mcVersion} onChange={(e) => setMcVersion(e.target.value)}>
            {filtered.map((v) => (
              <option key={v.id} value={v.id}>
                {v.id}
              </option>
            ))}
          </select>
        </div>
        <label className="row muted" style={{ alignSelf: 'flex-end', marginBottom: 18, gap: 6 }}>
          <input
            type="checkbox"
            checked={showSnapshots}
            onChange={(e) => setShowSnapshots(e.target.checked)}
          />
          Snapshots
        </label>
      </div>

      <div className="field">
        <label>Mod loader</label>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {LOADERS.map((l) => (
            <button
              key={l.id}
              className={`btn sm ${loader === l.id ? 'primary' : ''}`}
              onClick={() => setLoader(l.id)}
              disabled={!l.supported}
            >
              {l.label}
              {l.experimental && (
                <span
                  className="mono"
                  style={{ fontSize: 9, opacity: 0.7, letterSpacing: '0.08em' }}
                >
                  BETA
                </span>
              )}
            </button>
          ))}
        </div>
        {loaderMeta?.experimental && (
          <p className="muted" style={{ marginTop: 8 }}>
            {loaderMeta.label} support is experimental. The first launch runs the official installer
            and can take a few minutes.
          </p>
        )}
      </div>

      {loader !== 'vanilla' && (
        <div className="field">
          <label>Loader version</label>
          <select
            className="select"
            value={loaderVersion}
            onChange={(e) => setLoaderVersion(e.target.value)}
            disabled={!loaderVersions.length}
          >
            {loaderVersions.length === 0 && <option>Loading…</option>}
            {loaderVersions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="field">
        <label>Memory: {(memoryMb / 1024).toFixed(1)} GB</label>
        <input
          type="range"
          min={1024}
          max={16384}
          step={512}
          value={memoryMb}
          onChange={(e) => setMemoryMb(Number(e.target.value))}
        />
      </div>

      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn primary" disabled={!canCreate} onClick={submit}>
          {busy ? <span className="spinner" /> : null}
          Create
        </button>
      </div>
    </Modal>
  )
}
