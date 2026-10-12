import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUserMock, getDocumentsAccessibleToUserMock, documentTypesAllMock, importSharePointInboxDocumentsMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  getDocumentsAccessibleToUserMock: vi.fn(),
  documentTypesAllMock: vi.fn(),
  importSharePointInboxDocumentsMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/services/documentAccessService", () => ({ getDocumentsAccessibleToUser: getDocumentsAccessibleToUserMock }));
vi.mock("@/services/sharePointImportService", () => ({ importSharePointInboxDocuments: importSharePointInboxDocumentsMock }));
vi.mock("@/prisma/db", () => ({ db: { orm: { public: { DocumentType: { all: documentTypesAllMock } } } } }));

import { GET } from "@/app/api/documents/route";

describe("GET /api/documents SharePoint synchronization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({ id: 12, role: "USER" });
    getDocumentsAccessibleToUserMock.mockResolvedValue([{ id: 88, fileName: "contract.pdf", documentTypeId: null }]);
    documentTypesAllMock.mockResolvedValue([]);
    importSharePointInboxDocumentsMock.mockResolvedValue(1);
  });

  it("syncs SharePoint inbox files before returning the normal document list", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(importSharePointInboxDocumentsMock).toHaveBeenCalledOnce();
    expect(getDocumentsAccessibleToUserMock).toHaveBeenCalledWith(12);
    await expect(response.json()).resolves.toEqual({
      documents: [{ id: 88, fileName: "contract.pdf", documentTypeId: null, documentTypeName: null }],
    });
  });

  it("still returns app documents when SharePoint sync fails", async () => {
    importSharePointInboxDocumentsMock.mockRejectedValue(new Error("Graph unavailable"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toHaveProperty("documents");
    expect(getDocumentsAccessibleToUserMock).toHaveBeenCalledOnce();
    errorSpy.mockRestore();
  });
});
