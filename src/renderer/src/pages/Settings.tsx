import { useEffect, useState } from 'react'
import { ArrowUpCircle, Check, LogIn, LogOut, RefreshCw } from 'lucide-react'
import { useStore } from '../store'
import type { AbyssSettings, UpdateStatus } from '../../../shared/types'

const themes: AbyssSettings['theme'][] = ['abyss', 'midnight', 'void']

export function SettingsPage(): JSX.Element | null {
  const settings = useStore((s) => s.settings)
  const accounts = useStore((s) => s.accounts)
  const login = useStore((s) => s.login)
  const logout = useStore((s) => s.logout)
  const setActiveAccount = useStore((s) => s.setActiveAccount)
  const updateSettings = useStore((s) => s.updateSettings)
  const [busy, setBusy] = useState(false)
  const [update, setUpdate] = useState<UpdateStatus | null>(null)
  const [checkingUpdate, setCheckingUpdate] = useState(false)

  useEffect(() => {
    window.abyss.updates.getStatus().then(setUpdate).catch(() => {})
    return window.abyss.onUpdateStatus(setUpdate)
  }, [])

  const checkUpdate = async (): Promise<void> => {
    setCheckingUpdate(true)
    try {
      setUpdate(await window.abyss.updates.check())
    } finally {
      setCheckingUpdate(false)
    }
  }

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

      <div className="divider" />

      {/* Discord */}
      <h2 style={{ fontSize: 18, marginBottom: 14 }}>Discord</h2>
      <div className="card" style={{ padding: 18, maxWidth: 560 }}>
        <label className="row" style={{ gap: 9, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.discordRpc}
            onChange={(e) => updateSettings({ discordRpc: e.target.checked })}
          />
          <span>Show Abyss in my Discord status (Rich Presence)</span>
        </label>

        {settings.discordRpc && (
          <>
            <div className="field" style={{ marginTop: 16, marginBottom: 8 }}>
              <label>Discord application Client ID</label>
              <input
                className="input"
                placeholder="e.g. 1318020427421548615"
                value={settings.discordClientId}
                onChange={(e) => updateSettings({ discordClientId: e.target.value })}
              />
            </div>
            <p className="muted" style={{ lineHeight: 1.55 }}>
              Create a free app at{' '}
              <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer">
                discord.com/developers
              </a>
              , name it “Abyss”, then copy its <b>Application ID</b> into the box above. Optionally
              upload a 512×512 logo named <span className="mono">abyss</span> under Rich Presence → Art
              Assets to show the icon. Discord must be running on this PC.
            </p>
          </>
        )}
      </div>

      <div className="divider" />

      {/* Updates */}
      <h2 style={{ fontSize: 18, marginBottom: 14 }}>Updates</h2>
      <div className="card" style={{ padding: 18, maxWidth: 560 }}>
        <div className="row" style={{ justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>Abyss {update?.current ?? ''}</div>
            <div className="muted" style={{ marginTop: 2 }}>
              {update?.state === 'checking' && 'Checking for updates…'}
              {update?.state === 'available' && `Update available: ${update.version}`}
              {update?.state === 'downloading' &&
                `Downloading ${update.version ?? ''}… ${update.percent ?? 0}%`}
              {update?.state === 'downloaded' && `Version ${update.version} is ready to install.`}
              {update?.state === 'not-available' && "You're on the latest version."}
              {update?.state === 'error' && `Couldn't check for updates: ${update.error ?? ''}`}
              {update?.state === 'disabled' &&
                'Auto-update only works in the installed app, not in dev mode.'}
              {(!update || update.state === 'idle') &&
                'Abyss updates itself from GitHub Releases.'}
            </div>
          </div>
          {update?.state === 'downloaded' ? (
            <button className="btn teal" onClick={() => window.abyss.updates.install()}>
              <ArrowUpCircle size={15} /> Restart &amp; install
            </button>
          ) : (
            <button
              className="btn"
              disabled={
                checkingUpdate || update?.state === 'checking' || update?.state === 'downloading'
              }
              onClick={checkUpdate}
            >
              {checkingUpdate || update?.state === 'checking' ? (
                <span className="spinner" />
              ) : (
                <RefreshCw size={15} />
              )}
              Check for updates
            </button>
          )}
        </div>
        {update?.state === 'downloading' && (
          <div className="progress" style={{ marginTop: 14 }}>
            <div className="bar" style={{ width: `${update.percent ?? 0}%` }} />
          </div>
        )}
      </div>

      <p className="muted mono" style={{ marginTop: 24 }}>
        Abyss v0.6.3 · mods by Modrinth
      </p>
    </div>
  )
}
