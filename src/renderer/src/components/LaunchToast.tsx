import { useEffect } from 'react'
import { CheckCircle2, Loader2, Square, XCircle } from 'lucide-react'
import { useStore } from '../store'
import type { LaunchStatus } from '../../../shared/types'

function Toast({ status }: { status: LaunchStatus }): JSX.Element {
  const instances = useStore((s) => s.instances)
  const kill = useStore((s) => s.kill)
  const clear = useStore((s) => s.clearLaunchStatus)
  const name = instances.find((i) => i.id === status.instanceId)?.name ?? 'Instance'

  // Auto-dismiss terminal states.
  useEffect(() => {
    if (status.phase === 'closed' || status.phase === 'error') {
      const t = setTimeout(() => clear(status.instanceId), 5000)
      return () => clearTimeout(t)
    }
    return undefined
  }, [status.phase, status.instanceId, clear])

  const isError = status.phase === 'error'
  const isDone = status.phase === 'closed'
  const isRunning = status.phase === 'running'

  return (
    <div className="launch-status card">
      <div className="label">
        {isError ? (
          <XCircle size={17} color="var(--danger)" />
        ) : isDone ? (
          <CheckCircle2 size={17} color="var(--good)" />
        ) : (
          <Loader2 size={17} className="spin-icon" style={{ animation: 'spin 0.8s linear infinite' }} />
        )}
        <span style={{ flex: 1 }}>{name}</span>
        {isRunning && (
          <button className="btn sm danger" onClick={() => kill(status.instanceId)}>
            <Square size={12} /> Stop
          </button>
        )}
      </div>
      <div className="muted" style={{ marginTop: 6 }}>
        {status.message}
      </div>
      {typeof status.progress === 'number' && !isDone && !isError && (
        <div className="progress">
          <div className="bar" style={{ width: `${Math.round(status.progress * 100)}%` }} />
        </div>
      )}
    </div>
  )
}

export function LaunchToast(): JSX.Element | null {
  const launchStatus = useStore((s) => s.launchStatus)
  const entries = Object.values(launchStatus)
  if (entries.length === 0) return null
  // Show the most relevant (last updated) status.
  const status = entries[entries.length - 1]
  return <Toast status={status} />
}
