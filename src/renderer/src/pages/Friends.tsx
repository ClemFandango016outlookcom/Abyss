import { useState } from 'react'
import { Info, Trash2, UserPlus, Users } from 'lucide-react'
import { useStore } from '../store'
import type { Friend } from '../../../shared/types'

const statuses: Friend['status'][] = ['online', 'away', 'in-game', 'offline']

export function Friends(): JSX.Element {
  const friends = useStore((s) => s.friends)
  const addFriend = useStore((s) => s.addFriend)
  const removeFriend = useStore((s) => s.removeFriend)
  const updateFriend = useStore((s) => s.updateFriend)

  const [name, setName] = useState('')
  const [note, setNote] = useState('')

  const add = async (): Promise<void> => {
    if (!name.trim()) return
    await addFriend(name.trim(), note.trim() || undefined)
    setName('')
    setNote('')
  }

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">Social</div>
        <h1>Friends</h1>
        <p>Keep track of who you play with.</p>
      </div>

      <div className="banner warn">
        <Info size={16} />
        Friends are stored locally on this machine for now — live presence syncing arrives with the
        Abyss network service.
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 22 }}>
        <div className="row" style={{ gap: 10 }}>
          <input
            className="input"
            placeholder="Minecraft username"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <input
            className="input"
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <button className="btn primary" onClick={add} disabled={!name.trim()}>
            <UserPlus size={16} /> Add
          </button>
        </div>
      </div>

      {friends.length === 0 ? (
        <div className="empty">
          <Users size={42} />
          <p>No friends added yet.</p>
        </div>
      ) : (
        friends.map((f) => (
          <div key={f.id} className="friend-row card">
            <span className={`status-dot ${f.status}`} />
            <img
              src={`https://mc-heads.net/avatar/${encodeURIComponent(f.name)}/38`}
              alt=""
              style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--bg-3)' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{f.name}</div>
              {f.note && <div className="muted">{f.note}</div>}
            </div>
            <select
              className="select"
              style={{ width: 120 }}
              value={f.status}
              onChange={(e) => updateFriend(f.id, { status: e.target.value as Friend['status'] })}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button className="btn sm danger" onClick={() => removeFriend(f.id)}>
              <Trash2 size={14} />
            </button>
          </div>
        ))
      )}
    </div>
  )
}
