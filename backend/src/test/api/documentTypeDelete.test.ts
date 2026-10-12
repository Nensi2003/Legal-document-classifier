import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDocumentTypeByIdMock, deleteDocumentTypeMock, DocumentTypeInUseErrorMock } = vi.hoisted(() => {
  class DocumentTypeInUseError extends Error {
    constructor() {
      super("This template is linked to existing documents and cannot be deleted.");
      this.name = "DocumentTypeInUseError";
    }
  }
  return {
    getDocumentTypeByIdMock: vi.fn(),
    deleteDocumentTypeMock: vi.fn(),
    DocumentTypeInUseErrorMock: DocumentTypeInUseError,
  };
});

vi.mock("@/services/documentTypeService", () => ({
  deleteDocumentType: deleteDocumentTypeMock,
  getDocumentTypeById: getDocumentTypeByIdMock,
  getDocumentTypeWithVersion: vi.fn(),
  updateDocumentType: vi.fn(),
  DocumentTypeInUseError: DocumentTypeInUseErrorMock,
}));

import { NextRequest } from "next/server";
import { DELETE } from "../../app/api/document-types/[id]/route";

describe("DELETE /api/document-types/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDocumentTypeByIdMock.mockResolvedValue({ id: 22 });
    deleteDocumentTypeMock.mockResolvedValue({ id: 22 });
  });

  it("returns a clear conflict instead of a server error for a referenced template", async () => {
    deleteDocumentTypeMock.mockRejectedValue(new DocumentTypeInUseErrorMock());
    const response = await DELETE(new NextRequest("http://localhost/api/document-types/22", { method: "DELETE" }), { params: Promise.resolve({ id: "22" }) });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("linked to existing documents") });
  });

  it("deletes an unused template", async () => {
    const response = await DELETE(new NextRequest("http://localhost/api/document-types/22", { method: "DELETE" }), { params: Promise.resolve({ id: "22" }) });

    expect(response.status).toBe(200);
    expect(deleteDocumentTypeMock).toHaveBeenCalledWith(22);
  });
});
