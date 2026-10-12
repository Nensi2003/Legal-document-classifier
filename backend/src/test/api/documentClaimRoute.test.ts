import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUserMock, getAccessibleDocumentByIdMock, claimDocumentMock, releaseDocumentClaimMock, publishDocumentEventMock, forgetRealtimeUserClaimMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  getAccessibleDocumentByIdMock: vi.fn(),
  claimDocumentMock: vi.fn(),
  releaseDocumentClaimMock: vi.fn(),
  publishDocumentEventMock: vi.fn(),
  forgetRealtimeUserClaimMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/services/documentAccessService", () => ({ getAccessibleDocumentById: getAccessibleDocumentByIdMock }));
vi.mock("@/services/documentClaimService", () => ({
  claimDocument: claimDocumentMock,
  releaseDocumentClaim: releaseDocumentClaimMock,
  DocumentClaimConflictError: class DocumentClaimConflictError extends Error {},
}));
vi.mock("@/realtime/publisher", () => ({
  publishDocumentEvent: publishDocumentEventMock,
  forgetRealtimeUserClaim: forgetRealtimeUserClaimMock,
}));

import { DELETE } from "../../app/api/documents/[id]/claim/route";

describe("DELETE /api/documents/:id/claim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({ id: 7, name: "Ada", role: "USER" });
    releaseDocumentClaimMock.mockResolvedValue({ id: 38 });
  });

  it("clears the database and socket claim state, then broadcasts release", async () => {
    const response = await DELETE(new Request("http://localhost/api/documents/38/claim"), {
      params: Promise.resolve({ id: "38" }),
    });

    expect(response.status).toBe(200);
    expect(releaseDocumentClaimMock).toHaveBeenCalledWith(38, 7);
    expect(forgetRealtimeUserClaimMock).toHaveBeenCalledWith(7, 38);
    expect(publishDocumentEventMock).toHaveBeenCalledWith("DOCUMENT_RELEASED", 38, 7, { userName: "Ada" });
    expect(forgetRealtimeUserClaimMock.mock.invocationCallOrder[0]).toBeLessThan(publishDocumentEventMock.mock.invocationCallOrder[0]);
  });

  it("does not clear another user's claim when no matching database claim was released", async () => {
    releaseDocumentClaimMock.mockResolvedValue(null);
    const response = await DELETE(new Request("http://localhost/api/documents/38/claim"), {
      params: Promise.resolve({ id: "38" }),
    });

    expect(response.status).toBe(200);
    expect(forgetRealtimeUserClaimMock).not.toHaveBeenCalled();
    expect(publishDocumentEventMock).not.toHaveBeenCalled();
  });
});
