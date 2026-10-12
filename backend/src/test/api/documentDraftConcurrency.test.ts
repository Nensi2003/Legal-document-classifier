import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUserMock, getAccessibleDocumentMock, documentWhereMock, updateMock, publishMock, assertClaimMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  getAccessibleDocumentMock: vi.fn(),
  documentWhereMock: vi.fn(),
  updateMock: vi.fn(),
  publishMock: vi.fn(),
  assertClaimMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/services/documentAccessService", () => ({ getAccessibleDocumentById: getAccessibleDocumentMock }));
vi.mock("@/realtime/publisher", () => ({ publishDocumentEvent: publishMock }));
vi.mock("@/services/documentClaimService", () => ({ assertDocumentClaim: assertClaimMock }));
vi.mock("@/prisma/db", () => ({ db: { orm: { public: { Document: { where: documentWhereMock } } } } }));

import { NextRequest } from "next/server";
import { PATCH } from "../../app/api/documents/[id]/draft/route";

describe("PATCH /api/documents/:id/draft optimistic concurrency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({ id: 8, role: "USER" });
    getAccessibleDocumentMock.mockResolvedValue({ id: 12, status: "DRAFT", updatedAt: "revision-1" });
    documentWhereMock.mockReturnValue({ update: updateMock });
    assertClaimMock.mockResolvedValue({ allowed: true });
  });

  function request(expectedUpdatedAt: string) {
    return new NextRequest("http://localhost/api/documents/12/draft", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftData: { title: "Updated" }, expectedUpdatedAt }),
    });
  }

  it("rejects a stale revision instead of overwriting another user's draft", async () => {
    updateMock.mockResolvedValue(null);
    const response = await PATCH(request("revision-old"), { params: Promise.resolve({ id: "12" }) });

    expect(response.status).toBe(409);
    expect(documentWhereMock).toHaveBeenCalledWith({ id: 12, updatedAt: "revision-old", activeWorkerId: 8, claimExpiresAt: undefined });
    expect(publishMock).not.toHaveBeenCalled();
  });

  it("saves only against the supplied database revision and publishes after persistence", async () => {
    updateMock.mockResolvedValue({ id: 12, updatedAt: "revision-2", status: "DRAFT" });
    const response = await PATCH(request("revision-1"), { params: Promise.resolve({ id: "12" }) });

    expect(response.status).toBe(200);
    expect(publishMock).toHaveBeenCalledWith("DOCUMENT_UPDATED", 12, 8, { status: "DRAFT" });
    expect(await response.json()).toMatchObject({ updatedAt: "revision-2" });
  });

  it("rejects edits when the authenticated user does not own the active claim", async () => {
    assertClaimMock.mockResolvedValue({ allowed: false, status: 403, error: "You must claim this document before editing it" });
    const response = await PATCH(request("revision-1"), { params: Promise.resolve({ id: "12" }) });
    expect(response.status).toBe(403);
    expect(updateMock).not.toHaveBeenCalled();
    expect(publishMock).not.toHaveBeenCalled();
  });
});
