import type { RealtimeEvent } from "./protocol";

type Listener = (event: RealtimeEvent) => void;

export class RealtimeClient {
  private socket: WebSocket | null = null;
  private shouldRun = false;
  private retryTimer: number | null = null;
  private retryDelay = 500;
  private listeners = new Set<Listener>();
  private watchers = new Set<number>();
  private claims = new Set<number>();
  private seenEventIds = new Set<string>();

  connect() {
    this.shouldRun = true;
    this.open();
    return () => this.disconnect();
  }

  disconnect() {
    this.shouldRun = false;
    if (this.retryTimer !== null) window.clearTimeout(this.retryTimer);
    this.retryTimer = null;
    const socket = this.socket;
    this.socket = null;
    socket?.close(1000, "Client stopped");
  }

  onEvent(listener: Listener) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  watchDocument(documentId: number) {
    this.watchers.add(documentId);
    if (!this.claims.has(documentId)) this.send({ type: "SUBSCRIBE_DOCUMENT", documentId });
    return () => this.unwatchDocument(documentId);
  }

  unwatchDocument(documentId: number) {
    this.watchers.delete(documentId);
    if (!this.claims.has(documentId)) this.send({ type: "UNSUBSCRIBE_DOCUMENT", documentId });
  }

  claimDocument(documentId: number) {
    this.claims.add(documentId);
    this.send({ type: "CLAIM_DOCUMENT", documentId });
    return () => this.releaseDocument(documentId);
  }

  releaseDocument(documentId: number) {
    this.claims.delete(documentId);
    this.send({ type: "RELEASE_DOCUMENT", documentId });
    if (!this.watchers.has(documentId)) this.send({ type: "UNSUBSCRIBE_DOCUMENT", documentId });
  }

  private open() {
    if (!this.shouldRun || this.socket) return;
    const configured = import.meta.env.VITE_WS_URL as string | undefined;
    const url = configured || `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.hostname}:3000/ws`;
    const socket = new WebSocket(url);
    this.socket = socket;
    socket.onopen = () => {
      this.retryDelay = 500;
      for (const documentId of new Set([...this.watchers, ...this.claims])) {
        this.send({ type: "SUBSCRIBE_DOCUMENT", documentId });
        if (this.claims.has(documentId)) this.send({ type: "CLAIM_DOCUMENT", documentId });
      }
    };
    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(String(message.data)) as RealtimeEvent;
        if (!event.eventId || this.seenEventIds.has(event.eventId)) return;
        this.seenEventIds.add(event.eventId);
        if (this.seenEventIds.size > 250) this.seenEventIds.delete(this.seenEventIds.values().next().value!);
        for (const listener of this.listeners) listener(event);
      } catch { /* Ignore malformed server frames and continue the connection. */ }
    };
    socket.onclose = () => {
      if (this.socket === socket) this.socket = null;
      if (!this.shouldRun || this.retryTimer !== null) return;
      this.retryTimer = window.setTimeout(() => {
        this.retryTimer = null;
        this.open();
      }, this.retryDelay);
      this.retryDelay = Math.min(this.retryDelay * 2, 15_000);
    };
    socket.onerror = () => socket.close();
  }

  private send(message: { type: string; documentId: number }) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
  }
}

export const realtimeClient = new RealtimeClient();
