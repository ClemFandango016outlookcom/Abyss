import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Folder, Play as PlayIcon, Plus, Settings2, Square, Boxes } from 'lucide-react'
import { useStore } from '../store'
import { CreateInstanceModal } from '../components/CreateInstanceModal'
import { timeAgo } from '../lib/format'
import type { Loader } from '../../../shared/types'

const loaderIcon: Record<Loader, string> = {
  vanilla: '🟩',
  fabric: '🧵',
  quilt: '🧩',
  forge: '⚒️',
  neoforge: '🔥'
}

export function Play(): JSX.Element {
  const instances = useStore((s) => s.instances)
  const accounts = useStore((s) => s.accounts)
  const launch = useStore((s) => s.launch)
  const kill = useStore((s) => s.kill)
  const launchStatus = useStore((s) => s.launchStatus)
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)

  const hasAccount = accounts.some((a) => a.active)

  const onLaunch = async (id: string): Promise<void> => {
    try {
      await launch(id)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Launch failed')
    }
  }

  const isBusy = (id: string): boolean => {
    const s = launchStatus[id]
    return !!s && s.phase !== 'closed' && s.phase !== 'error'
  }
  const isRunning = (id: string): boolean => launchStatus[id]?.phase === 'running'

  return (
    <div>
      <div className="page-head row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>Play</h1>
          <p>Your Minecraft instances — launch, manage and mod them.</p>
        </div>
        <button className="btn primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New instance
        </button>
      </div>

      {!hasAccount && (
        <div className="banner warn">
          Sign in with your Microsoft account (bottom-left) to launch Minecraft.
        </div>
      )}

      {instances.length === 0 ? (
        <div className="empty">
          <Boxes size={48} />
          <div>
            <h3>No instances yet</h3>
            <p className="muted">Create your first instance to start playing.</p>
          </div>
          <button className="btn primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Create instance
          </button>
        </div>
      ) : (
        <div className="instance-grid">
          {instances.map((inst) => (
            <div key={inst.id} className="instance-card card">
              <div className="head">
                <div className="instance-icon">{loaderIcon[inst.loader]}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="name">{inst.name}</div>
                  <div className="ver">
                    {inst.mcVersion} · {inst.loader}
                  </div>
                </div>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="muted">{inst.mods.length} mods</span>
                <span className="muted">Played {timeAgo(inst.lastPlayed)}</span>
              </div>
              <div className="row" style={{ gap: 8 }}>
                {isRunning(inst.id) ? (
                  <button className="btn danger" style={{ flex: 1 }} onClick={() => kill(inst.id)}>
                    <Square size={15} /> Stop
                  </button>
                ) : (
                  <button
                    className="btn primary"
                    style={{ flex: 1 }}
                    disabled={isBusy(inst.id) || !hasAccount}
                    onClick={() => onLaunch(inst.id)}
                  >
                    {isBusy(inst.id) ? <span className="spinner" /> : <PlayIcon size={15} />}
                    {isBusy(inst.id) ? 'Launching…' : 'Play'}
                  </button>
                )}
                <button
                  className="btn"
                  title="Manage"
                  onClick={() => navigate(`/instance/${inst.id}`)}
                >
                  <Settings2 size={15} />
                </button>
                <button
                  className="btn"
                  title="Open folder"
                  onClick={() => window.abyss.instances.openFolder(inst.id)}
                >
                  <Folder size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateInstanceModal
          onClose={() => setShowCreate(false)}
          onCreated={(inst) => navigate(`/instance/${inst.id}`)}
        />
      )}
    </div>
  )
}
