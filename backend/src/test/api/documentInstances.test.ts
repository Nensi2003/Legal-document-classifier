import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUserMock, getAccessibleDocumentMock, documentWhereMock, instancesAllMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  getAccessibleDocumentMock: vi.fn(),
  documentWhereMock: vi.fn(),
  instancesAllMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/services/documentAccessService", () => ({ getAccessibleDocumentById: getAccessibleDocumentMock }));
vi.mock("@/prisma/db", () => ({
  db: { orm: { public: { DocumentInstance: { where: documentWhereMock } } } },
}));

import { NextRequest } from "next/server";
import { GET } from "../../app/api/documents/[id]/instances/route";

describe("GET /api/documents/:id/instances", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({ id: 5, role: "USER" });
    getAccessibleDocumentMock.mockResolvedValue({ id: 11, userId: 2, status: "REVIEW" });
    documentWhereMock.mockReturnValue({ all: instancesAllMock });
    instancesAllMock.mockResolvedValue([{
      id: 17,
      documentId: 11,
      position: 1,
      startPage: 1,
      endPage: 2,
      detectionMethod: "HEURISTIC",
      detectionScore: 7,
      extractedText: "Contract text",
      status: "DRAFT",
      draftData: null,
      generatedJSON: null,
    }]);
  });

  it("returns boundary instances for a document the user is allowed to work on", async () => {
    const response = await GET(new NextRequest("http://localhost/api/documents/11/instances"), {
      params: Promise.resolve({ id: "11" }),
    });

    expect(response.status).toBe(200);
    expect(documentWhereMock).toHaveBeenCalledWith({ documentId: 11 });
    expect(await response.json()).toMatchObject({
      instances: [{ id: 17, documentId: 11, startPage: 1, endPage: 2, status: "DRAFT" }],
    });
  });

  it("does not query instances for a document the user cannot access", async () => {
    getAccessibleDocumentMock.mockResolvedValue(null);

    const response = await GET(new NextRequest("http://localhost/api/documents/11/instances"), {
      params: Promise.resolve({ id: "11" }),
    });

    expect(response.status).toBe(404);
    expect(instancesAllMock).not.toHaveBeenCalled();
  });
});
