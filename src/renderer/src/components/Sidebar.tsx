import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Compass, Gamepad2, LogIn, Settings, Users } from 'lucide-react'
import { useStore } from '../store'

const links = [
  { to: '/', label: 'Play', icon: Gamepad2, end: true },
  { to: '/browse', label: 'Browse Mods', icon: Compass },
  { to: '/friends', label: 'Friends', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings }
]

export function Sidebar(): JSX.Element {
  const accounts = useStore((s) => s.accounts)
  const login = useStore((s) => s.login)
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const active = accounts.find((a) => a.active)

  const handleLogin = async (): Promise<void> => {
    setBusy(true)
    try {
      await login()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <aside className="sidebar">
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="spacer" />

      {active ? (
        <div className="account-card" onClick={() => navigate('/settings')} title="Manage accounts">
          <img className="account-avatar" src={active.avatar} alt={active.name} />
          <div className="meta">
            <div className="name">{active.name}</div>
            <div className="sub">Microsoft</div>
          </div>
        </div>
      ) : (
        <button className="btn primary block" disabled={busy} onClick={handleLogin}>
          {busy ? <span className="spinner" /> : <LogIn size={16} />}
          {busy ? 'Signing in…' : 'Sign in with Microsoft'}
        </button>
      )}
    </aside>
  )
}
