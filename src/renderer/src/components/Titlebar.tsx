import { Minus, Square, X } from 'lucide-react'
import { Logo } from './Logo'

export function Titlebar(): JSX.Element {
  return (
    <div className="titlebar">
      <div className="brand">
        <Logo />
        ABYSS
      </div>
      <div className="win-controls">
        <button title="Minimize" onClick={() => window.abyss.window.minimize()}>
          <Minus size={16} />
        </button>
        <button title="Maximize" onClick={() => window.abyss.window.maximize()}>
          <Square size={13} />
        </button>
        <button className="close" title="Close" onClick={() => window.abyss.window.close()}>
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
