import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { useStore } from './store'
import { Titlebar } from './components/Titlebar'
import { Sidebar } from './components/Sidebar'
import { LaunchToast } from './components/LaunchToast'
import { Play } from './pages/Play'
import { Browse } from './pages/Browse'
import { ModDetail } from './pages/ModDetail'
import { InstanceDetail } from './pages/InstanceDetail'
import { Friends } from './pages/Friends'
import { SettingsPage } from './pages/Settings'

export default function App(): JSX.Element {
  const init = useStore((s) => s.init)
  const ready = useStore((s) => s.ready)
  const theme = useStore((s) => s.settings?.theme)

  useEffect(() => {
    init().catch((err) => console.error('Failed to initialise Abyss:', err))
  }, [init])

  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <>
      <div className="atmosphere">
        <div className="beam" />
        <div className="grain" />
        <div className="vignette" />
      </div>
      <div className="app">
        <Titlebar />
        <div className="body">
          <Sidebar />
          <main className="content">
            {ready ? (
              <Routes>
                <Route path="/" element={<Play />} />
                <Route path="/browse" element={<Browse />} />
                <Route path="/mod/:slug" element={<ModDetail />} />
                <Route path="/instance/:id" element={<InstanceDetail />} />
                <Route path="/friends" element={<Friends />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            ) : (
              <div className="loading">
                <div className="sonar">
                  <span />
                  <span />
                  <span />
                </div>
                <span>Descending into the Abyss…</span>
              </div>
            )}
          </main>
        </div>
        <LaunchToast />
      </div>
    </>
  )
}
