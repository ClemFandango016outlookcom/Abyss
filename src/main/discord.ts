import net from 'net'
import { randomUUID } from 'crypto'

// Minimal Discord Rich Presence client. Talks the Discord IPC protocol over the
// local socket directly, so it needs no third-party dependency. Requires a
// Discord application Client ID (the user creates a free app and pastes its id
// in Settings). Fails silently when Discord isn't running and retries later.

const SITE = 'https://clemfandango016outlookcom.github.io/Abyss/'

interface Activity {
  details?: string
  state?: string
  timestamps?: { start?: number }
  assets?: { large_image?: string; large_text?: string; small_image?: string; small_text?: string }
  buttons?: { label: string; url: string }[]
}

class DiscordPresence {
  private socket: net.Socket | null = null
  private connected = false
  private enabled = false
  private clientId = ''
  private current: Activity | null = null
  private retryTimer: NodeJS.Timeout | null = null
  private readonly launchedAt = Date.now()

  /** Apply settings — connect, reconnect or shut down as needed. */
  configure(enabled: boolean, clientId: string): void {
    const id = (clientId || '').trim()
    this.enabled = enabled
    if (!enabled || !id) {
      this.shutdown()
      this.clientId = id
      return
    }
    if (id !== this.clientId || !this.connected) {
      this.clientId = id
      this.setLauncher()
      this.reconnect()
    }
  }

  setLauncher(): void {
    this.setActivity({
      details: 'In the launcher',
      state: 'Browsing the abyss',
      timestamps: { start: this.launchedAt },
      assets: { large_image: 'abyss', large_text: 'Abyss' },
      buttons: [{ label: 'Get Abyss', url: SITE }]
    })
  }

  setPlaying(name: string, mcVersion: string, loader: string): void {
    this.setActivity({
      details: `Playing ${name}`.slice(0, 128),
      state: `Minecraft ${mcVersion} · ${loader}`.slice(0, 128),
      timestamps: { start: Date.now() },
      assets: { large_image: 'abyss', large_text: 'Abyss', small_image: 'minecraft', small_text: 'Minecraft' },
      buttons: [{ label: 'Get Abyss', url: SITE }]
    })
  }

  private setActivity(activity: Activity): void {
    this.current = activity
    if (this.connected && this.socket) {
      this.send(1, {
        cmd: 'SET_ACTIVITY',
        args: { pid: process.pid, activity },
        nonce: randomUUID()
      })
    }
  }

  private ipcPath(index: number): string {
    if (process.platform === 'win32') return `\\\\?\\pipe\\discord-ipc-${index}`
    const base =
      process.env['XDG_RUNTIME_DIR'] ||
      process.env['TMPDIR'] ||
      process.env['TMP'] ||
      process.env['TEMP'] ||
      '/tmp'
    return `${base.replace(/\/$/, '')}/discord-ipc-${index}`
  }

  private reconnect(): void {
    this.shutdownSocket()
    if (this.enabled && this.clientId) this.tryConnect(0)
  }

  private tryConnect(index: number): void {
    if (index > 9) {
      this.scheduleRetry()
      return
    }
    const sock = net.createConnection(this.ipcPath(index))
    sock.on('connect', () => {
      this.socket = sock
      this.send(0, { v: 1, client_id: this.clientId }) // handshake
    })
    sock.on('data', () => {
      // Any frame after the handshake means Discord accepted us.
      if (!this.connected) {
        this.connected = true
        if (this.current) this.setActivity(this.current)
      }
    })
    sock.on('error', () => {
      sock.destroy()
      if (this.socket === sock) this.socket = null
      this.tryConnect(index + 1)
    })
    sock.on('close', () => {
      this.connected = false
      if (this.socket === sock) this.socket = null
      if (this.enabled) this.scheduleRetry()
    })
  }

  private send(op: number, data: unknown): void {
    try {
      const json = Buffer.from(JSON.stringify(data))
      const header = Buffer.alloc(8)
      header.writeInt32LE(op, 0)
      header.writeInt32LE(json.length, 4)
      this.socket?.write(Buffer.concat([header, json]))
    } catch {
      /* socket went away — close handler will retry */
    }
  }

  private scheduleRetry(): void {
    if (this.retryTimer || !this.enabled) return
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      if (this.enabled && !this.connected) this.reconnect()
    }, 15000)
  }

  private shutdownSocket(): void {
    if (this.socket) {
      this.socket.removeAllListeners()
      this.socket.destroy()
      this.socket = null
    }
    this.connected = false
  }

  private shutdown(): void {
    this.enabled = false
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
    this.shutdownSocket()
  }
}

export const discord = new DiscordPresence()
