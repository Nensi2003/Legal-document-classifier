import { afterEach, describe, expect, it, vi } from "vitest";
import { RealtimeClient } from "../../features/realtime/realtimeClient";

class MockWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  readyState = MockWebSocket.CONNECTING;
  sent: string[] = [];
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readonly url: string;
  constructor(url: string) { this.url = url; }
  send(message: string) { this.sent.push(message); }
  close() { this.readyState = 3; }
}

describe("RealtimeClient", () => {
  const originalWebSocket = globalThis.WebSocket;
  afterEach(() => {
    globalThis.WebSocket = originalWebSocket;
    vi.useRealTimers();
  });

  it("reconnects and resubscribes to active document rooms", async () => {
    vi.useFakeTimers();
    const sockets: MockWebSocket[] = [];
    globalThis.WebSocket = class extends MockWebSocket {
      constructor(url: string) { super(url); sockets.push(this); }
    } as unknown as typeof WebSocket;

    const client = new RealtimeClient();
    const stop = client.connect();
    const first = sockets[0];
    first.readyState = MockWebSocket.OPEN;
    first.onopen?.(new Event("open"));
    client.claimDocument(123);
    expect(first.sent.map((message) => JSON.parse(message).type)).toEqual(["CLAIM_DOCUMENT"]);

    first.onclose?.(new CloseEvent("close"));
    await vi.advanceTimersByTimeAsync(500);
    expect(sockets).toHaveLength(2);
    const reconnected = sockets[1];
    reconnected.readyState = MockWebSocket.OPEN;
    reconnected.onopen?.(new Event("open"));
    expect(reconnected.sent.map((message) => JSON.parse(message).type)).toEqual(["SUBSCRIBE_DOCUMENT", "CLAIM_DOCUMENT"]);
    stop();
  });
});
