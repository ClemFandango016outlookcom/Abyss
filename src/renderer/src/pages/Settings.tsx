import { useState } from 'react'
import { Check, LogIn, LogOut } from 'lucide-react'
import { useStore } from '../store'
import type { AbyssSettings } from '../../../shared/types'

const themes: AbyssSettings['theme'][] = ['abyss', 'midnight', 'void']

export function SettingsPage(): JSX.Element | null {
  const settings = useStore((s) => s.settings)
  const accounts = useStore((s) => s.accounts)
  const login = useStore((s) => s.login)
  const logout = useStore((s) => s.logout)
  const setActiveAccount = useStore((s) => s.setActiveAccount)
  const updateSettings = useStore((s) => s.updateSettings)
  const [busy, setBusy] = useState(false)

  if (!settings) return null

  const addAccount = async (): Promise<void> => {
    setBusy(true)
    try {
      await login()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">Configuration</div>
        <h1>Settings</h1>
        <p>Accounts, memory and game options.</p>
      </div>

      {/* Accounts */}
      <h2 style={{ fontSize: 18, marginBottom: 14 }}>Accounts</h2>
      {accounts.length === 0 ? (
        <div className="card" style={{ padding: 18, marginBottom: 12 }}>
          <p className="muted" style={{ marginBottom: 14 }}>
            No accounts. Sign in with Microsoft to play online.
          </p>
        </div>
      ) : (
        accounts.map((a) => (
          <div key={a.uuid} className="friend-row card">
            <img src={a.avatar} alt="" style={{ width: 40, height: 40, borderRadius: 9 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{a.name}</div>
              <div className="muted">{a.active ? 'Active' : 'Microsoft account'}</div>
            </div>
            {a.active ? (
              <span className="tag accent">
                <Check size={12} /> Active
              </span>
            ) : (
              <button className="btn sm" onClick={() => setActiveAccount(a.uuid)}>
                Set active
              </button>
            )}
            <button className="btn sm danger" onClick={() => logout(a.uuid)}>
              <LogOut size={14} /> Sign out
            </button>
          </div>
        ))
      )}
      <button className="btn primary" style={{ marginTop: 6 }} disabled={busy} onClick={addAccount}>
        {busy ? <span className="spinner" /> : <LogIn size={16} />}
        Add Microsoft account
      </button>

      <div className="divider" />

      {/* Game settings */}
      <h2 style={{ fontSize: 18, marginBottom: 14 }}>Game</h2>
      <div className="card" style={{ padding: 18, maxWidth: 560 }}>
        <div className="field">
          <label>Default memory: {(settings.defaultMemoryMb / 1024).toFixed(1)} GB</label>
          <input
            type="range"
            min={1024}
            max={16384}
            step={512}
            value={settings.defaultMemoryMb}
            onChange={(e) => updateSettings({ defaultMemoryMb: Number(e.target.value) })}
          />
        </div>

        <div className="field">
          <label>Java path (optional — leave blank to auto-detect)</label>
          <input
            className="input"
            placeholder="C:\\Program Files\\Java\\…\\bin\\javaw.exe"
            value={settings.javaPath ?? ''}
            onChange={(e) => updateSettings({ javaPath: e.target.value || undefined })}
          />
        </div>

        <div className="field">
          <label>Theme</label>
          <select
            className="select"
            value={settings.theme}
            onChange={(e) => updateSettings({ theme: e.target.value as AbyssSettings['theme'] })}
          >
            {themes.map((t) => (
              <option key={t} value={t}>
                {t[0].toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <label className="row" style={{ gap: 9, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.closeOnLaunch}
            onChange={(e) => updateSettings({ closeOnLaunch: e.target.checked })}
          />
          <span>Minimize Abyss when the game launches</span>
        </label>

        <div className="divider" />
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Game directory</label>
          <div className="muted" style={{ wordBreak: 'break-all' }}>
            {settings.gameDir}
          </div>
        </div>
      </div>

      <p className="muted mono" style={{ marginTop: 24 }}>
        Abyss v0.4.0 · mods by Modrinth
      </p>
    </div>
  )
}
