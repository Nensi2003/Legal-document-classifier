interface SharePointConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  driveId: string;
  inboxFolderId: string;
}

export interface SharePointFileReference {
  driveId: string;
  itemId: string;
  contentTag: string | null;
}

interface SharePointDriveItem {
  id: string;
  name: string;
  eTag?: string;
  cTag?: string;
  size?: number;
  createdDateTime?: string;
  file?: { mimeType?: string };
  createdBy?: { user?: { id?: string; displayName?: string; email?: string } };
}

const SHAREPOINT_PATH_PREFIX = "sharepoint:v1:";
const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";
const ACCESS_TOKEN_REFRESH_MARGIN_MS = 60_000;
let accessToken: { value: string; expiresAt: number } | null = null;

function getConfig(): SharePointConfig | null {
  const names = [
    "SHAREPOINT_TENANT_ID",
    "SHAREPOINT_CLIENT_ID",
    "SHAREPOINT_CLIENT_SECRET",
    "SHAREPOINT_DRIVE_ID",
    "SHAREPOINT_INBOX_FOLDER_ID",
  ] as const;
  const values = names.map((name) => process.env[name]?.trim());
  if (process.env.SHAREPOINT_ENABLED === "false") return null;
  if (values.every((value) => !value)) {
    if (process.env.SHAREPOINT_ENABLED === "true") {
      throw new Error(`SharePoint is enabled but is missing configuration: ${names.join(", ")}`);
    }
    return null;
  }
  if (values.some((value) => !value)) {
    throw new Error(`SharePoint configuration is incomplete. Set: ${names.join(", ")}`);
  }
  const [tenantId, clientId, clientSecret, driveId, inboxFolderId] = values as [string, string, string, string, string];
  return { tenantId, clientId, clientSecret, driveId, inboxFolderId };
}

export function isSharePointConfigured(): boolean {
  return getConfig() !== null;
}

export function getConfiguredSharePointDriveId(): string | null {
  return getConfig()?.driveId ?? null;
}

export function encodeSharePointFileReference(reference: SharePointFileReference): string {
  return SHAREPOINT_PATH_PREFIX + Buffer.from(JSON.stringify(reference)).toString("base64url");
}

export function decodeSharePointFileReference(filePath: string): SharePointFileReference | null {
  if (!filePath.startsWith(SHAREPOINT_PATH_PREFIX)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(filePath.slice(SHAREPOINT_PATH_PREFIX.length), "base64url").toString("utf8")) as Partial<SharePointFileReference>;
    if (typeof decoded.driveId !== "string" || typeof decoded.itemId !== "string") return null;
    return { driveId: decoded.driveId, itemId: decoded.itemId, contentTag: typeof decoded.contentTag === "string" ? decoded.contentTag : null };
  } catch {
    return null;
  }
}

async function getAccessToken(config: SharePointConfig): Promise<string> {
  if (accessToken && accessToken.expiresAt > Date.now() + ACCESS_TOKEN_REFRESH_MARGIN_MS) {
    return accessToken.value;
  }
  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Could not authenticate to Microsoft Graph (${response.status})`);
  const payload = await response.json() as { access_token?: string; expires_in?: number };
  if (!payload.access_token) throw new Error("Microsoft Graph did not return an access token");
  accessToken = { value: payload.access_token, expiresAt: Date.now() + Number(payload.expires_in ?? 3600) * 1000 };
  return accessToken.value;
}

async function graphRequest<T>(config: SharePointConfig, pathOrUrl: string): Promise<T> {
  const response = await fetch(pathOrUrl.startsWith("https://") ? pathOrUrl : `${GRAPH_BASE_URL}${pathOrUrl}`, {
    headers: { Authorization: `Bearer ${await getAccessToken(config)}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Microsoft Graph request failed (${response.status})`);
  return response.json() as Promise<T>;
}

export async function listSharePointInboxFiles(): Promise<SharePointDriveItem[]> {
  const config = getConfig();
  if (!config) return [];
  const query = new URLSearchParams({
    "$select": "id,name,eTag,cTag,size,createdDateTime,file,createdBy",
    "$top": "200",
  });
  let nextUrl: string | undefined = `${GRAPH_BASE_URL}/drives/${encodeURIComponent(config.driveId)}/items/${encodeURIComponent(config.inboxFolderId)}/children?${query}`;
  const items: SharePointDriveItem[] = [];
  while (nextUrl) {
    const page: { value?: SharePointDriveItem[]; "@odata.nextLink"?: string } = await graphRequest(config, nextUrl);
    items.push(...(page.value ?? []));
    nextUrl = page["@odata.nextLink"];
  }
  return items;
}

export function createSharePointReferenceForItem(driveId: string, item: SharePointDriveItem) {
  return encodeSharePointFileReference({ driveId, itemId: item.id, contentTag: item.cTag ?? null });
}

export function getSharePointIdentity(filePath: string): string | null {
  const reference = decodeSharePointFileReference(filePath);
  return reference ? `${reference.driveId}:${reference.itemId}` : null;
}

export async function readSharePointFile(filePath: string): Promise<Buffer> {
  const config = getConfig();
  const reference = decodeSharePointFileReference(filePath);
  if (!config || !reference) throw new Error("SharePoint file reference is invalid or SharePoint is not configured");

  const item = await graphRequest<{ cTag?: string }>(config,
    `/drives/${encodeURIComponent(reference.driveId)}/items/${encodeURIComponent(reference.itemId)}?$select=id,cTag`);
  if (reference.contentTag && item.cTag !== reference.contentTag) {
    throw new Error("This SharePoint file has changed since it was added to the processing queue. Upload it as a new file to preserve the original processing source.");
  }

  const response = await fetch(`${GRAPH_BASE_URL}/drives/${encodeURIComponent(reference.driveId)}/items/${encodeURIComponent(reference.itemId)}/content`, {
    headers: { Authorization: `Bearer ${await getAccessToken(config)}` },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`Could not read the SharePoint file (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}

export function isSharePointFileReference(filePath: string): boolean {
  return decodeSharePointFileReference(filePath) !== null;
}
