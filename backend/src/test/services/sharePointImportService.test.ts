import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  isSharePointConfiguredMock,
  getConfiguredSharePointDriveIdMock,
  listSharePointInboxFilesMock,
  createSharePointReferenceForItemMock,
  getSharePointIdentityMock,
  allDocumentsMock,
  userWhereMock,
  userFirstMock,
  createDocumentMock,
  publishAvailableEventMock,
} = vi.hoisted(() => ({
  isSharePointConfiguredMock: vi.fn(),
  getConfiguredSharePointDriveIdMock: vi.fn(),
  listSharePointInboxFilesMock: vi.fn(),
  createSharePointReferenceForItemMock: vi.fn(),
  getSharePointIdentityMock: vi.fn(),
  allDocumentsMock: vi.fn(),
  userWhereMock: vi.fn(),
  userFirstMock: vi.fn(),
  createDocumentMock: vi.fn(),
  publishAvailableEventMock: vi.fn(),
}));

vi.mock("@/lib/sharePointStorage", () => ({
  isSharePointConfigured: isSharePointConfiguredMock,
  getConfiguredSharePointDriveId: getConfiguredSharePointDriveIdMock,
  listSharePointInboxFiles: listSharePointInboxFilesMock,
  createSharePointReferenceForItem: createSharePointReferenceForItemMock,
  getSharePointIdentity: getSharePointIdentityMock,
}));
vi.mock("@/prisma/db", () => ({
  db: { orm: { public: { Document: { all: allDocumentsMock }, User: { where: userWhereMock } } } },
}));
vi.mock("@/services/documentService", () => ({ createDocument: createDocumentMock }));
vi.mock("@/realtime/publisher", () => ({ publishAvailableEvent: publishAvailableEventMock }));

import { importSharePointInboxDocuments } from "@/services/sharePointImportService";

describe("SharePoint inbox import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("SHAREPOINT_USER_MAP", "{}");
    isSharePointConfiguredMock.mockReturnValue(true);
    getConfiguredSharePointDriveIdMock.mockReturnValue("drive-1");
    listSharePointInboxFilesMock.mockResolvedValue([]);
    allDocumentsMock.mockResolvedValue([]);
    userWhereMock.mockReturnValue({ first: userFirstMock });
    userFirstMock.mockResolvedValue({ id: 7, email: "uploader@example.com" });
    createSharePointReferenceForItemMock.mockImplementation((_driveId, item) => `sharepoint:v1:${item.id}`);
    getSharePointIdentityMock.mockImplementation((path: string) => path.startsWith("sharepoint:v1:") ? `drive-1:${path.slice("sharepoint:v1:".length)}` : null);
    createDocumentMock.mockImplementation(async (data) => ({ id: 41, ...data, createdAt: data.createdAt ?? "now" }));
  });

  it("does nothing when the SharePoint connector is disabled", async () => {
    isSharePointConfiguredMock.mockReturnValue(false);

    await expect(importSharePointInboxDocuments()).resolves.toBe(0);
    expect(listSharePointInboxFilesMock).not.toHaveBeenCalled();
    expect(allDocumentsMock).not.toHaveBeenCalled();
  });

  it("imports supported files as AVAILABLE and publishes the existing availability event", async () => {
    listSharePointInboxFilesMock.mockResolvedValue([{
      id: "item-1",
      name: "Contract.pdf",
      size: 1234,
      createdDateTime: "2026-10-08T09:00:00Z",
      file: { mimeType: "application/pdf" },
      createdBy: { user: { email: " Uploader@Example.com " } },
    }]);

    await expect(importSharePointInboxDocuments()).resolves.toBe(1);

    expect(userWhereMock).toHaveBeenCalledWith({ email: "uploader@example.com" });
    expect(createDocumentMock).toHaveBeenCalledWith({
      fileName: "Contract.pdf",
      filePath: "sharepoint:v1:item-1",
      mimeType: "application/pdf",
      userId: 7,
      status: "AVAILABLE",
      createdAt: "2026-10-08T09:00:00Z",
    });
    expect(publishAvailableEventMock).toHaveBeenCalledWith(41, 7, expect.objectContaining({
      fileName: "Contract.pdf",
      status: "AVAILABLE",
      createdAt: "2026-10-08T09:00:00Z",
    }));
  });

  it("does not reimport an item already represented in the app database", async () => {
    allDocumentsMock.mockResolvedValue([{ filePath: "sharepoint:v1:item-1" }]);
    listSharePointInboxFilesMock.mockResolvedValue([{
      id: "item-1", name: "Contract.pdf", file: { mimeType: "application/pdf" },
      createdBy: { user: { email: "uploader@example.com" } },
    }]);

    await expect(importSharePointInboxDocuments()).resolves.toBe(0);
    expect(createDocumentMock).not.toHaveBeenCalled();
    expect(publishAvailableEventMock).not.toHaveBeenCalled();
  });

  it("skips unsupported, oversized, and unmapped-user files", async () => {
    listSharePointInboxFilesMock.mockResolvedValue([
      { id: "bad-type", name: "archive.zip", file: { mimeType: "application/zip" }, createdBy: { user: { email: "uploader@example.com" } } },
      { id: "too-large", name: "large.pdf", size: 10 * 1024 * 1024 + 1, file: { mimeType: "application/pdf" }, createdBy: { user: { email: "uploader@example.com" } } },
      { id: "no-user", name: "unknown.pdf", file: { mimeType: "application/pdf" }, createdBy: { user: { id: "entra-id" } } },
    ]);
    userFirstMock.mockResolvedValue(null);
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(importSharePointInboxDocuments()).resolves.toBe(0);

    expect(createDocumentMock).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledWith("SharePoint inbox files skipped:", expect.arrayContaining([
      "archive.zip (unsupported file type)",
      "large.pdf (larger than 10 MB)",
      "unknown.pdf (SharePoint did not provide the uploader's email)",
    ]));
    warning.mockRestore();
  });

  it("maps a SharePoint uploader object ID to an app account email", async () => {
    vi.stubEnv("SHAREPOINT_USER_MAP", JSON.stringify({ "entra-id": "Uploader@Example.com" }));
    listSharePointInboxFilesMock.mockResolvedValue([{
      id: "item-1", name: "Contract.pdf", file: { mimeType: "application/pdf" },
      createdBy: { user: { id: "entra-id" } },
    }]);

    await expect(importSharePointInboxDocuments()).resolves.toBe(1);
    expect(userWhereMock).toHaveBeenCalledWith({ email: "uploader@example.com" });
  });

  it("shares one in-flight import between simultaneous document-list requests", async () => {
    let finishListing!: (items: unknown[]) => void;
    listSharePointInboxFilesMock.mockReturnValue(new Promise((resolve) => { finishListing = resolve; }));
    const item = {
      id: "item-1", name: "Contract.pdf", file: { mimeType: "application/pdf" },
      createdBy: { user: { email: "uploader@example.com" } },
    };

    const firstImport = importSharePointInboxDocuments();
    const secondImport = importSharePointInboxDocuments();
    expect(listSharePointInboxFilesMock).toHaveBeenCalledOnce();
    finishListing([item]);

    await expect(Promise.all([firstImport, secondImport])).resolves.toEqual([1, 1]);
    expect(createDocumentMock).toHaveBeenCalledOnce();
  });
});
