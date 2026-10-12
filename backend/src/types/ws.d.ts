declare module "ws" {
  import type { EventEmitter } from "node:events";
  import type { IncomingMessage } from "node:http";
  import type { Duplex } from "node:stream";

  class WebSocket extends EventEmitter {
    constructor(address?: string, options?: { headers?: Record<string, string> });
    static OPEN: number;
    readyState: number;
    send(data: string): void;
    close(code?: number, reason?: string): void;
    terminate(): void;
    ping(): void;
    on(event: "message", listener: (data: WebSocket.RawData) => void): this;
    on(event: "close" | "error", listener: () => void): this;
    on(event: "pong", listener: () => void): this;
  }

  namespace WebSocket {
    type RawData = Buffer | ArrayBuffer | Buffer[];
  }

  export class WebSocketServer extends EventEmitter {
    constructor(options: { noServer: true; maxPayload?: number });
    handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer, callback: (socket: WebSocket) => void): void;
    close(callback?: () => void): void;
  }

  export default WebSocket;
}
