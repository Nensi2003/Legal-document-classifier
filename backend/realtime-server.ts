import "dotenv/config";
import { createServer } from "node:http";
import { AsyncLocalStorage } from "node:async_hooks";

// Next's CLI sets this baseline before importing the server runtime. A custom
// server must do the same, especially on Node versions without it as a global.
const runtimeGlobal = globalThis as typeof globalThis & { AsyncLocalStorage?: typeof AsyncLocalStorage };
runtimeGlobal.AsyncLocalStorage ??= AsyncLocalStorage;

const [nextModule, authModule, dbModule, accessModule, claimModule, gatewayModule, publisherModule] = await Promise.all([
  import("next"),
  import("./src/lib/auth"),
  import("./src/prisma/db"),
  import("./src/services/documentAccessService"),
  import("./src/services/documentClaimService"),
  import("./src/realtime/gateway"),
  import("./src/realtime/publisher"),
]);
const next = nextModule.default;
const { AUTH_COOKIE, verifyAuthToken } = authModule;
const { db } = dbModule;
const { getAccessibleDocumentById } = accessModule;
const { claimDocument, releaseDocumentClaim, renewDocumentClaim, getActiveDocumentClaim } = claimModule;
const { createRealtimeGateway } = gatewayModule;
const { registerRealtimePublisher } = publisherModule;

const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOST ?? "0.0.0.0";
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const allowedOrigins = (process.env.WS_ALLOWED_ORIGINS ?? "http://localhost:5173")
  .split(",").map((origin) => origin.trim()).filter(Boolean);

const gateway = createRealtimeGateway({
  allowedOrigins,
  async authenticate(request) {
    const token = request.headers.cookie?.split(";").map((part) => part.trim())
      .find((part) => part.startsWith(`${AUTH_COOKIE}=`))?.slice(AUTH_COOKIE.length + 1);
    if (!token) return null;
    const claims = await verifyAuthToken(token);
    if (!claims || !Number.isSafeInteger(claims.id)) return null;
    const user = await db.orm.public.User.where({ id: claims.id }).first();
    if (!user) return null;
    return { id: user.id, name: user.name, role: user.role };
  },
  async authorizeDocument(user, documentId) {
    if (user.role === "ADMIN") return false;
    return Boolean(await getAccessibleDocumentById(documentId, user.id));
  },
  async claimDocument(user, documentId) {
    const result = await claimDocument(documentId, user.id);
    if (!result) throw new Error("Document not found");
  },
  async releaseDocument(user, documentId) {
    await releaseDocumentClaim(documentId, user.id);
  },
  async renewDocumentClaim(user, documentId) {
    return renewDocumentClaim(documentId, user.id);
  },
  async getDocumentWorkers(documentId) {
    const worker = await getActiveDocumentClaim(documentId);
    return worker ? [worker] : [];
  },
});

await app.prepare();
const server = createServer((request, response) => handle(request, response));
const detachGateway = gateway.attach(server);
registerRealtimePublisher(gateway.publish, gateway.forgetUserClaim);
server.listen(port, hostname, () => {
  console.log(`> Next.js and realtime server listening at http://${hostname}:${port}`);
});

async function shutdown() {
  registerRealtimePublisher(null);
  detachGateway();
  await gateway.close();
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
