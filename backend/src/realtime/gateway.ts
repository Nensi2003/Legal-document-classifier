import type { IncomingMessage, Server } from "node:http";
import WebSocket, { WebSocketServer } from "ws";
import { randomUUID } from "node:crypto";
import type { RealtimeEvent, RealtimeEventType } from "./protocol";

export interface RealtimeUser {
  id: number;
  name: string | null;
  role: string;
}

interface ClientState {
  socket: WebSocket;
  user: RealtimeUser;
  documents: Set<number>;
  claimedDocuments: Set<number>;
  availableRoom: boolean;
  isAlive: boolean;
}

interface GatewayOptions {
  authenticate: (request: IncomingMessage) => Promise<RealtimeUser | null>;
  authorizeDocument: (user: RealtimeUser, documentId: number) => Promise<boolean>;
  claimDocument: (user: RealtimeUser, documentId: number) => Promise<void>;
  releaseDocument: (user: RealtimeUser, documentId: number) => Promise<void>;
  renewDocumentClaim: (user: RealtimeUser, documentId: number) => Promise<boolean>;
  getDocumentWorkers: (documentId: number) => Promise<Array<{ userId: number; userName: string | null }>>;
  allowedOrigins?: string[];
}

const OPEN = WebSocket.OPEN;
const DOC_PREFIX = "document:";

export function createRealtimeGateway(options: GatewayOptions) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 8192 });
  const clients = new Map<WebSocket, ClientState>();
  const rooms = new Map<string, Set<WebSocket>>();
  const claimSockets = new Map<number, Map<number, Set<WebSocket>>>();
  const origins = new Set(options.allowedOrigins ?? ["http://localhost:5173"]);
  const heartbeat = setInterval(() => {
    for (const state of clients.values()) {
      if (!state.isAlive) {
        state.socket.terminate();
        cleanup(state);
      } else {
        state.isAlive = false;
        state.socket.ping();
        for (const documentId of state.claimedDocuments) {
          void options.renewDocumentClaim(state.user, documentId).then((renewed) => {
            if (!renewed) forgetUserClaim(state.user.id, documentId);
          }).catch(() => undefined);
        }
      }
    }
  }, 30_000);
  heartbeat.unref();

  function send(socket: WebSocket, event: RealtimeEvent) {
    if (socket.readyState === OPEN) socket.send(JSON.stringify(event));
  }

  function emit(room: string, event: RealtimeEvent, except?: WebSocket) {
    for (const socket of rooms.get(room) ?? []) if (socket !== except) send(socket, event);
  }

  function event(type: RealtimeEventType, documentId?: number, userId?: number, payload: Record<string, unknown> = {}): RealtimeEvent {
    return { eventId: randomUUID(), type, documentId, userId, timestamp: new Date().toISOString(), payload };
  }

  function addToRoom(socket: WebSocket, room: string) {
    const members = rooms.get(room) ?? new Set<WebSocket>();
    members.add(socket);
    rooms.set(room, members);
  }

  function removeFromRoom(socket: WebSocket, room: string) {
    const members = rooms.get(room);
    members?.delete(socket);
    if (members?.size === 0) rooms.delete(room);
  }

  function releaseDocument(state: ClientState, documentId: number) {
    releaseClaim(state, documentId);
    if (!state.documents.delete(documentId)) return;
    const room = `${DOC_PREFIX}${documentId}`;
    removeFromRoom(state.socket, room);
  }

  function releaseClaim(state: ClientState, documentId: number) {
    if (!state.claimedDocuments.delete(documentId)) return;
    const documentClaims = claimSockets.get(documentId);
    const userSockets = documentClaims?.get(state.user.id);
    userSockets?.delete(state.socket);
    if (userSockets?.size === 0) {
      documentClaims?.delete(state.user.id);
      if (documentClaims?.size === 0) claimSockets.delete(documentId);
      void options.releaseDocument(state.user, documentId).then(() => {
        emit(`${DOC_PREFIX}${documentId}`, event("DOCUMENT_RELEASED", documentId, state.user.id, { userName: state.user.name }));
      }).catch((error) => console.error("Failed to release document claim:", error));
    }
  }

  function forgetUserClaim(userId: number, documentId: number) {
    const documentClaims = claimSockets.get(documentId);
    const userSockets = documentClaims?.get(userId);
    if (!userSockets) return 0;
    let forgotten = 0;
    for (const socket of userSockets) {
      if (clients.get(socket)?.claimedDocuments.delete(documentId)) forgotten += 1;
    }
    documentClaims?.delete(userId);
    if (documentClaims?.size === 0) claimSockets.delete(documentId);
    return forgotten;
  }

  async function handleMessage(state: ClientState, raw: WebSocket.RawData) {
    let message: unknown;
    try { message = JSON.parse(raw.toString()); } catch { return; }
    if (!message || typeof message !== "object") return;
    const candidate = message as { type?: unknown; documentId?: unknown };
    if (!Number.isInteger(candidate.documentId) || (candidate.documentId as number) <= 0) return;
    const documentId = candidate.documentId as number;

    if (candidate.type === "UNSUBSCRIBE_DOCUMENT") {
      releaseClaim(state, documentId);
      state.documents.delete(documentId);
      removeFromRoom(state.socket, `${DOC_PREFIX}${documentId}`);
      return;
    }
    if (candidate.type === "RELEASE_DOCUMENT") { releaseClaim(state, documentId); return; }
    if (candidate.type !== "SUBSCRIBE_DOCUMENT" && candidate.type !== "CLAIM_DOCUMENT") return;

    let authorized = false;
    try { authorized = await options.authorizeDocument(state.user, documentId); } catch { authorized = false; }
    if (!authorized) {
      send(state.socket, event("SUBSCRIPTION_REJECTED", documentId, undefined, { reason: "Document access denied" }));
      return;
    }

    const room = `${DOC_PREFIX}${documentId}`;
    if (!state.documents.has(documentId)) {
      state.documents.add(documentId);
      addToRoom(state.socket, room);
      send(state.socket, event("SUBSCRIBED", documentId));
    }
    if (candidate.type === "SUBSCRIBE_DOCUMENT") {
      const currentWorkers = await options.getDocumentWorkers(documentId);
      send(state.socket, event("DOCUMENT_PRESENCE", documentId, undefined, {
        users: currentWorkers,
      }));
      return;
    }
    if (state.claimedDocuments.has(documentId)) return;
    try { await options.claimDocument(state.user, documentId); }
    catch (error) {
      send(state.socket, event("SUBSCRIPTION_REJECTED", documentId, undefined, { reason: error instanceof Error ? error.message : "Document is already claimed" }));
      return;
    }
    state.claimedDocuments.add(documentId);
    const documentClaims = claimSockets.get(documentId) ?? new Map<number, Set<WebSocket>>();
    const userSockets = documentClaims.get(state.user.id) ?? new Set<WebSocket>();
    userSockets.add(state.socket);
    documentClaims.set(state.user.id, userSockets);
    claimSockets.set(documentId, documentClaims);
    const documentWorkers = await options.getDocumentWorkers(documentId);

    send(state.socket, event("DOCUMENT_PRESENCE", documentId, undefined, {
      users: documentWorkers,
    }));
    const payload = { userName: state.user.name };
    emit(room, event("DOCUMENT_OPENED", documentId, state.user.id, payload));
    emit(room, event("DOCUMENT_CLAIMED", documentId, state.user.id, payload));
  }

  wss.on("connection", (socket: WebSocket, request: IncomingMessage, user: RealtimeUser) => {
    const state: ClientState = { socket, user, documents: new Set(), claimedDocuments: new Set(), availableRoom: user.role !== "ADMIN", isAlive: true };
    clients.set(socket, state);
    if (state.availableRoom) addToRoom(socket, "available");
    send(socket, event("CONNECTED", undefined, undefined, { userId: user.id }));
    socket.on("message", (raw) => { void handleMessage(state, raw); });
    socket.on("pong", () => { state.isAlive = true; });
    socket.on("close", () => cleanup(state));
    socket.on("error", () => cleanup(state));
  });

  function cleanup(state: ClientState) {
    if (!clients.delete(state.socket)) return;
    if (state.availableRoom) removeFromRoom(state.socket, "available");
    for (const documentId of [...state.documents]) releaseDocument(state, documentId);
  }

  function attach(server: Server) {
    const onUpgrade = (request: IncomingMessage, socket: import("node:stream").Duplex, head: Buffer) => {
      const url = new URL(request.url ?? "/", "http://localhost");
      if (url.pathname !== "/ws") return;
      const origin = request.headers.origin;
      if (!origin || !origins.has(origin)) {
        socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
        socket.destroy();
        return;
      }
      void options.authenticate(request).then((user) => {
        if (!user) {
          socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
          socket.destroy();
          return;
        }
        wss.handleUpgrade(request, socket, head, (ws) => wss.emit("connection", ws, request, user));
      }).catch(() => {
        socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
        socket.destroy();
      });
    };
    server.on("upgrade", onUpgrade);
    return () => server.off("upgrade", onUpgrade);
  }

  function publish(target: "available" | `document:${number}`, notification: RealtimeEvent) {
    emit(target, notification);
    if (notification.type === "DOCUMENT_DELETED" && notification.documentId) {
      const documentId = notification.documentId;
      const members = [...(rooms.get(`${DOC_PREFIX}${documentId}`) ?? [])];
      for (const socket of members) {
        const state = clients.get(socket);
        if (state) releaseDocument(state, documentId);
      }
      rooms.delete(`${DOC_PREFIX}${documentId}`);
    }
  }

  return {
    attach,
    publish,
    forgetUserClaim,
    close: () => new Promise<void>((resolve) => {
      clearInterval(heartbeat);
      for (const state of clients.values()) {
        state.socket.close(1001, "Server restarting");
        cleanup(state);
      }
      wss.close(() => resolve());
    }),
    getClientCount: () => clients.size,
    getRoomSize: (room: string) => rooms.get(room)?.size ?? 0,
  };
}
