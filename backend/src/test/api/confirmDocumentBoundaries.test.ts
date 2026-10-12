import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUserMock, getAccessibleDocumentMock, assertClaimMock, instancesWhereMock, instancesAllMock, documentWhereMock, documentUpdateMock, publishMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  getAccessibleDocumentMock: vi.fn(),
  assertClaimMock: vi.fn(),
  instancesWhereMock: vi.fn(),
  instancesAllMock: vi.fn(),
  documentWhereMock: vi.fn(),
  documentUpdateMock: vi.fn(),
  publishMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/services/documentAccessService", () => ({ getAccessibleDocumentById: getAccessibleDocumentMock }));
vi.mock("@/services/documentClaimService", () => ({ assertDocumentClaim: assertClaimMock }));
vi.mock("@/realtime/publisher", () => ({ publishDocumentEvent: publishMock }));
vi.mock("@/prisma/db", () => ({ db: { orm: { public: {
  DocumentInstance: { where: instancesWhereMock },
  Document: { where: documentWhereMock },
} } } }));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/documents/[id]/confirm-boundaries/route";

describe("POST /api/documents/:id/confirm-boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({ id: 7, role: "USER" });
    getAccessibleDocumentMock.mockResolvedValue({ id: 10, status: "REVIEW" });
    assertClaimMock.mockResolvedValue({ allowed: true });
    instancesWhereMock.mockReturnValue({ all: instancesAllMock });
    instancesAllMock.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    documentWhereMock.mockReturnValue({ update: documentUpdateMock });
    documentUpdateMock.mockResolvedValue({ id: 10, status: "AVAILABLE" });
  });

  function request() {
    return POST(new NextRequest("http://localhost/api/documents/10/confirm-boundaries", { method: "POST" }), {
      params: Promise.resolve({ id: "10" }),
    });
  }

  it("returns to AVAILABLE only after an authorized worker confirms multiple instances", async () => {
    const response = await request();

    expect(response.status).toBe(200);
    expect(documentWhereMock).toHaveBeenCalledWith({ id: 10 });
    expect(documentUpdateMock).toHaveBeenCalledWith({ status: "AVAILABLE" });
    expect(publishMock).toHaveBeenCalledWith("DOCUMENT_STATUS_CHANGED", 10, 7, { previousStatus: "REVIEW", status: "AVAILABLE" });
    await expect(response.json()).resolves.toMatchObject({ document: { id: 10, status: "AVAILABLE" }, instances: [{ id: 1 }, { id: 2 }] });
  });

  it("requires more than one detected instance", async () => {
    instancesAllMock.mockResolvedValue([{ id: 1 }]);

    const response = await request();

    expect(response.status).toBe(400);
    expect(documentUpdateMock).not.toHaveBeenCalled();
    expect(publishMock).not.toHaveBeenCalled();
  });

  it("rejects a user who does not own the active document claim", async () => {
    assertClaimMock.mockResolvedValue({ allowed: false, status: 403, error: "You must claim this document before editing it" });

    const response = await request();

    expect(response.status).toBe(403);
    expect(instancesAllMock).not.toHaveBeenCalled();
    expect(documentUpdateMock).not.toHaveBeenCalled();
  });
});
