import { io, type Socket } from 'socket.io-client';

const MIDDLEWARE_URL = 'http://localhost:3000';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventCallback = (...args: any[]) => void;

class SocketManager {
  private socket: Socket | null = null;
  private subscribedSymbols = new Set<string>();
  // Persistent registry: handlers survive socket teardown/recreation
  // (React StrictMode disconnects + reconnects; a bare socket.on would
  // leave listeners bound to the dead instance)
  private handlers = new Map<string, Set<EventCallback>>();

  connect(): Socket {
    if (this.socket) return this.socket; // existing or still-connecting socket

    this.socket = io(MIDDLEWARE_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });

    // Re-apply every registered handler to the fresh socket
    for (const [event, callbacks] of this.handlers) {
      for (const cb of callbacks) this.socket.on(event, cb);
    }

    this.socket.on('connect', () => {
      console.log('[Socket] Connected to middleware');
      // Re-subscribe to all symbols on reconnect
      for (const symbol of this.subscribedSymbols) {
        this.socket?.emit('subscribe', symbol);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.subscribedSymbols.clear();
    }
  }

  subscribe(symbol: string): void {
    this.subscribedSymbols.add(symbol);
    if (this.socket?.connected) {
      this.socket.emit('subscribe', symbol);
    }
  }

  unsubscribe(symbol: string): void {
    this.subscribedSymbols.delete(symbol);
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe', symbol);
    }
  }

  emit(event: string, payload: unknown): boolean {
    if (!this.socket?.connected) return false;
    this.socket.emit(event, payload);
    return true;
  }

  on(event: string, callback: EventCallback): void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(callback);
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: EventCallback): void {
    if (callback) {
      this.handlers.get(event)?.delete(callback);
      this.socket?.off(event, callback);
    } else {
      this.handlers.delete(event);
      this.socket?.off(event);
    }
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }
}

// Singleton instance
export const socketManager = new SocketManager();
