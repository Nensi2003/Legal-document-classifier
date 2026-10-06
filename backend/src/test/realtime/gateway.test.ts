import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { createRealtimeGateway, type RealtimeUser } from "../../realtime/gateway";
import type { RealtimeEvent, RealtimeEventType } from "../../realtime/protocol";
import WebSocket from "ws";
import { SignJWT } from "jose";
import { AUTH_COOKIE, verifyAuthToken } from "../../lib/auth";

const users = new Map<number, RealtimeUser>([
  [1, { id: 1, name: "Ada", role: "USER" }],
  [2, { id: 2, name: "Lin", role: "USER" }],
  [3, { id: 3, name: "Sam", role: "USER" }],
  [4, { id: 4, name: "Admin", role: "ADMIN" }],
]);
const access = new Map<number, number[]>([[1, [123]], [2, [123]], [3, [456]]]);
const claimedBy = new Map<number, RealtimeUser>();
const origin = "http://localhost:5173";

function event(type: RealtimeEventType, documentId?: number, userId?: number): RealtimeEvent {
  return { eventId: `${type}-${Math.random()}`, type, documentId, userId, timestamp: new Date().toISOString(), payload: {} };
}

describe("WebSocket collaboration gateway", () => {
  let server: Server;
  let gateway: ReturnType<typeof createRealtimeGateway>;
  let url: string;
  const sockets: WebSocket[] = [];
  const tokens = new Map<number, string>();
  const previousJwtSecret = process.env.JWT_SECRET;
  const queues = new WeakMap<WebSocket, RealtimeEvent[]>();
  const waiters = new WeakMap<WebSocket, Array<{ type: RealtimeEventType; documentId?: number; resolve: (event: RealtimeEvent) => void; reject: (error: Error) => void; timeout: ReturnType<typeof setTimeout> }>>();

  beforeEach(async () => {
    claimedBy.clear();
    process.env.JWT_SECRET = "test-only-realtime-secret-that-is-at-least-32-bytes";
    tokens.clear();
    for (const user of users.values()) {
      tokens.set(user.id, await new SignJWT({ role: "CLIENT_CLAIM_IS_IGNORED" })
        .setProtectedHeader({ alg: "HS256" }).setSubject(String(user.id)).setIssuedAt().setExpirationTime("1h")
        .sign(new TextEncoder().encode(process.env.JWT_SECRET)));
    }
    server = createServer();
    gateway = createRealtimeGateway({
      allowedOrigins: [origin],
      authenticate: async (request) => {
        const token = request.headers.cookie?.match(new RegExp(`(?:^|;\\s*)${AUTH_COOKIE}=([^;]+)`))?.[1];
        if (!token) return null;
        const claims = await verifyAuthToken(token);
        return claims ? users.get(claims.id) ?? null : null;
      },
      authorizeDocument: async (user, documentId) => access.get(user.id)?.includes(documentId) ?? false,
      claimDocument: async (user, documentId) => {
        const owner = claimedBy.get(documentId);
        if (owner && owner.id !== user.id) throw new Error(`Currently working: ${owner.name}`);
        claimedBy.set(documentId, user);
      },
      releaseDocument: async (user, documentId) => { if (claimedBy.get(documentId)?.id === user.id) claimedBy.delete(documentId); },
      renewDocumentClaim: async (user, documentId) => claimedBy.get(documentId)?.id === user.id,
      getDocumentWorkers: async (documentId) => {
        const owner = claimedBy.get(documentId);
        return owner ? [{ userId: owner.id, userName: owner.name }] : [];
      },
    });
    gateway.attach(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind a TCP port");
    url = `ws://127.0.0.1:${address.port}/ws`;
  });

  afterEach(async () => {
    for (const socket of sockets.splice(0)) socket.terminate();
    await gateway.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (previousJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousJwtSecret;
  });

  function connect(userId?: number) {
    const socket = new WebSocket(url, { headers: { origin, ...(userId ? { cookie: `${AUTH_COOKIE}=${tokens.get(userId)}` } : {}) } });
    sockets.push(socket);
    queues.set(socket, []);
    waiters.set(socket, []);
    socket.on("message", (raw) => {
      const value = JSON.parse(raw.toString()) as RealtimeEvent;
      const pending = waiters.get(socket) ?? [];
      const index = pending.findIndex((item) => item.type === value.type && (item.documentId === undefined || item.documentId === value.documentId));
      if (index >= 0) {
        const [item] = pending.splice(index, 1);
        clearTimeout(item.timeout);
        item.resolve(value);
      } else {
        queues.get(socket)?.push(value);
      }
    });
    return socket;
  }

  function nextEvent(socket: WebSocket, type: RealtimeEventType, documentId?: number, timeoutMs = 1500): Promise<RealtimeEvent> {
    const queue = queues.get(socket) ?? [];
    const queuedIndex = queue.findIndex((item) => item.type === type && (documentId === undefined || item.documentId === documentId));
    if (queuedIndex >= 0) return Promise.resolve(queue.splice(queuedIndex, 1)[0]);
    return new Promise((resolve, reject) => {
      const waiter = { type, documentId, resolve, reject, timeout: setTimeout(() => {
        const pending = waiters.get(socket) ?? [];
        const index = pending.indexOf(waiter);
        if (index >= 0) pending.splice(index, 1);
        reject(new Error(`Timed out waiting for ${type}`));
      }, timeoutMs) };
      waiters.get(socket)?.push(waiter);
    });
  }

  async function connected(socket: WebSocket) {
    await new Promise<void>((resolve, reject) => {
      socket.once("open", resolve);
      socket.once("error", reject);
    });
    return nextEvent(socket, "CONNECTED");
  }

  it("rejects unauthenticated clients and unauthorized document subscriptions", async () => {
    const anonymous = connect();
    const status = await new Promise<number>((resolve, reject) => {
      anonymous.once("unexpected-response", (_request, response) => resolve(response.statusCode ?? 0));
      anonymous.once("error", reject);
    });
    expect(status).toBe(401);

    const invalidToken = new WebSocket(url, { headers: { origin, cookie: `${AUTH_COOKIE}=not-a-jwt` } });
    sockets.push(invalidToken);
    const invalidStatus = await new Promise<number>((resolve, reject) => {
      invalidToken.once("unexpected-response", (_request, response) => resolve(response.statusCode ?? 0));
      invalidToken.once("error", reject);
    });
    expect(invalidStatus).toBe(401);

    const user = connect(3);
    await connected(user);
    const rejected = nextEvent(user, "SUBSCRIPTION_REJECTED", 123);
    user.send(JSON.stringify({ type: "SUBSCRIBE_DOCUMENT", documentId: 123, userId: 1 }));
    await expect(rejected).resolves.toMatchObject({ type: "SUBSCRIPTION_REJECTED", documentId: 123 });
    expect(gateway.getRoomSize("document:123")).toBe(0);
  });

  it("delivers available, open, update, JSON and completion events only to authorized rooms", async () => {
    const ada = connect(1);
    const lin = connect(2);
    const sam = connect(3);
    const admin = connect(4);
    await Promise.all([connected(ada), connected(lin), connected(sam), connected(admin)]);
    expect(gateway.getRoomSize("available")).toBe(3);

    const availableForAda = nextEvent(ada, "DOCUMENT_AVAILABLE", 999);
    const availableForLin = nextEvent(lin, "DOCUMENT_AVAILABLE", 999);
    const availableForSam = nextEvent(sam, "DOCUMENT_AVAILABLE", 999);
    gateway.publish("available", event("DOCUMENT_AVAILABLE", 999, 9));
    await Promise.all([availableForAda, availableForLin, availableForSam]);
    await expect(nextEvent(admin, "DOCUMENT_AVAILABLE", 999, 100)).rejects.toThrow();

    const presence = nextEvent(ada, "DOCUMENT_PRESENCE", 123);
    const claimedForAda = nextEvent(ada, "DOCUMENT_CLAIMED", 123);
    ada.send(JSON.stringify({ type: "CLAIM_DOCUMENT", documentId: 123 }));
    await Promise.all([presence, claimedForAda]);
    await nextEvent(ada, "DOCUMENT_OPENED", 123);
    const duplicatePresence = nextEvent(ada, "DOCUMENT_PRESENCE", 123);
    ada.send(JSON.stringify({ type: "SUBSCRIBE_DOCUMENT", documentId: 123 }));
    await duplicatePresence;
    ada.send(JSON.stringify({ type: "CLAIM_DOCUMENT", documentId: 123 }));
    await expect(nextEvent(ada, "DOCUMENT_CLAIMED", 123, 100)).rejects.toThrow();

    const presenceForLin = nextEvent(lin, "DOCUMENT_PRESENCE", 123);
    lin.send(JSON.stringify({ type: "SUBSCRIBE_DOCUMENT", documentId: 123 }));
    const snapshot = await presenceForLin;
    expect(snapshot.payload.users).toEqual([{ userId: 1, userName: "Ada" }]);
    const rejectedClaim = nextEvent(lin, "SUBSCRIPTION_REJECTED", 123);
    lin.send(JSON.stringify({ type: "CLAIM_DOCUMENT", documentId: 123 }));
    await expect(rejectedClaim).resolves.toMatchObject({ type: "SUBSCRIPTION_REJECTED" });

    const updateAda = nextEvent(ada, "DOCUMENT_UPDATED", 123);
    const updateLin = nextEvent(lin, "DOCUMENT_UPDATED", 123);
    gateway.publish("document:123", event("DOCUMENT_UPDATED", 123, 1));
    await Promise.all([updateAda, updateLin]);
    // Subscribe before publishing to ensure the other document's event is isolated.
    sam.send(JSON.stringify({ type: "SUBSCRIBE_DOCUMENT", documentId: 456 }));
    await nextEvent(sam, "SUBSCRIBED", 456);
    const completedSam = nextEvent(sam, "DOCUMENT_COMPLETED", 456);
    gateway.publish("document:456", event("DOCUMENT_COMPLETED", 456, 3));
    await completedSam;
    await expect(nextEvent(ada, "DOCUMENT_COMPLETED", 456, 100)).rejects.toThrow();
    await expect(nextEvent(lin, "DOCUMENT_COMPLETED", 456, 100)).rejects.toThrow();
    const completed = nextEvent(sam, "DOCUMENT_JSON_UPDATED", 456);
    gateway.publish("document:456", event("DOCUMENT_JSON_UPDATED", 456, 3));
    await completed;
  });

  it("releases claims on disconnect and permits a clean reconnect", async () => {
    const ada = connect(1);
    const lin = connect(2);
    await Promise.all([connected(ada), connected(lin)]);
    const linPresence = nextEvent(lin, "DOCUMENT_PRESENCE", 123);
    lin.send(JSON.stringify({ type: "SUBSCRIBE_DOCUMENT", documentId: 123 }));
    await linPresence;
    const opened = nextEvent(lin, "DOCUMENT_OPENED", 123);
    const claimed = nextEvent(ada, "DOCUMENT_CLAIMED", 123);
    ada.send(JSON.stringify({ type: "CLAIM_DOCUMENT", documentId: 123 }));
    await Promise.all([opened, claimed]);

    const released = nextEvent(lin, "DOCUMENT_RELEASED", 123);
    ada.close();
    await released;

    const reconnected = connect(1);
    await connected(reconnected);
    const reopened = nextEvent(reconnected, "DOCUMENT_OPENED", 123);
    reconnected.send(JSON.stringify({ type: "CLAIM_DOCUMENT", documentId: 123 }));
    await reopened;
    expect(gateway.getRoomSize("document:123")).toBe(2);
  });

  it("forgets a live socket claim after an authenticated HTTP release", async () => {
    const ada = connect(1);
    await connected(ada);
    const claimed = nextEvent(ada, "DOCUMENT_CLAIMED", 123);
    ada.send(JSON.stringify({ type: "CLAIM_DOCUMENT", documentId: 123 }));
    await claimed;

    // The HTTP endpoint has already cleared the database claim before it calls this.
    claimedBy.delete(123);
    expect(gateway.forgetUserClaim(1, 123)).toBe(1);

    // A subsequent socket subscription can now acquire the document again.
    const lin = connect(2);
    await connected(lin);
    const linClaimed = nextEvent(lin, "DOCUMENT_CLAIMED", 123);
    lin.send(JSON.stringify({ type: "CLAIM_DOCUMENT", documentId: 123 }));
    await linClaimed;
    expect(claimedBy.get(123)?.id).toBe(2);
  });
});
