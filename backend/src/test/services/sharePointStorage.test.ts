import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnvironment = { ...process.env };

describe("SharePoint storage adapter", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("SHAREPOINT_ENABLED", "true");
    vi.stubEnv("SHAREPOINT_TENANT_ID", "tenant-test");
    vi.stubEnv("SHAREPOINT_CLIENT_ID", "client-test");
    vi.stubEnv("SHAREPOINT_CLIENT_SECRET", "secret-test");
    vi.stubEnv("SHAREPOINT_DRIVE_ID", "drive-test");
    vi.stubEnv("SHAREPOINT_INBOX_FOLDER_ID", "folder-test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    process.env = { ...originalEnvironment };
  });

  it("lists inbox items using a client-credentials token and follows Graph pagination", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "test-token", expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        value: [{ id: "item-1", name: "contract.pdf", file: { mimeType: "application/pdf" } }],
        "@odata.nextLink": "https://graph.microsoft.com/v1.0/next-page",
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ value: [{ id: "item-2", name: "form.docx", file: {} }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const storage = await import("@/lib/sharePointStorage");
    const items = await storage.listSharePointInboxFiles();

    expect(items.map((item) => item.id)).toEqual(["item-1", "item-2"]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/drives/drive-test/items/folder-test/children?");
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ headers: { Authorization: "Bearer test-token" } });
    expect(fetchMock.mock.calls[2]?.[0]).toBe("https://graph.microsoft.com/v1.0/next-page");
  });

  it("reads the SharePoint source bytes and rejects a source changed after it was queued", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "test-token", expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ cTag: "tag-original" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ cTag: "tag-updated" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const storage = await import("@/lib/sharePointStorage");
    const filePath = storage.encodeSharePointFileReference({
      driveId: "drive-test",
      itemId: "item-1",
      contentTag: "tag-original",
    });

    await expect(storage.readSharePointFile(filePath)).resolves.toEqual(Buffer.from([1, 2, 3]));
    await expect(storage.readSharePointFile(filePath)).rejects.toThrow(/file has changed/);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[2]?.[0]).toContain("/items/item-1/content");
  });

  it("keeps local paths separate from SharePoint references", async () => {
    const storage = await import("@/lib/sharePointStorage");
    const reference = storage.encodeSharePointFileReference({ driveId: "drive-test", itemId: "item-1", contentTag: null });

    expect(storage.isSharePointFileReference(reference)).toBe(true);
    expect(storage.getSharePointIdentity(reference)).toBe("drive-test:item-1");
    expect(storage.decodeSharePointFileReference("uploads/local.pdf")).toBeNull();
    expect(storage.isSharePointFileReference("sharepoint:v1:invalid-json")).toBe(false);
  });
});
