export type ConsoleStatus = 'connecting' | 'connected' | 'disconnected'

const MAX_RECONNECT_DELAY_MS = 30_000

export class ConsoleClient {
  private readonly url: string
  private socket: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private attempts = 0
  private manuallyClosed = false

  onMessage: ((message: string) => void) | null = null
  onStatus: ((status: ConsoleStatus) => void) | null = null

  constructor(url: string) {
    this.url = url
  }

  connect(): void {
    this.manuallyClosed = false
    this.open()
  }

  send(text: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(text)
    }
  }

  close(): void {
    this.manuallyClosed = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }

  private open(): void {
    this.onStatus?.('connecting')

    const socket = new WebSocket(this.url)
    this.socket = socket

    socket.onopen = () => {
      this.attempts = 0
      this.onStatus?.('connected')
    }

    socket.onmessage = (event) => {
      this.onMessage?.(String(event.data))
    }

    socket.onerror = () => {
      this.onStatus?.('disconnected')
    }

    socket.onclose = () => {
      this.onStatus?.('disconnected')
      if (!this.manuallyClosed) {
        this.scheduleReconnect()
      }
    }
  }

  private scheduleReconnect(): void {
    const delay = Math.min(1000 * 2 ** this.attempts, MAX_RECONNECT_DELAY_MS)
    this.attempts += 1
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.open()
    }, delay)
  }
}
