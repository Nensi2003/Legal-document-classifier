import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdminMock, publishMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  publishMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAdmin: requireAdminMock }));
vi.mock("@/services/documentTypeService", () => ({ publishDocumentTypeVersion: publishMock }));

import { POST } from "../../app/api/document-types/[id]/versions/[versionId]/publish/route";

describe("POST /api/document-types/:id/versions/:versionId/publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin users before publishing", async () => {
    requireAdminMock.mockResolvedValue({ user: null, error: "Admin access required" });

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "1", versionId: "2" }),
    });

    expect(response.status).toBe(403);
    expect(publishMock).not.toHaveBeenCalled();
  });

  it("allows an authenticated admin to publish the requested version", async () => {
    requireAdminMock.mockResolvedValue({ user: { id: 1, role: "ADMIN" }, error: null });
    publishMock.mockResolvedValue({ id: 2, status: "ACTIVE" });

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "1", versionId: "2" }),
    });

    expect(response.status).toBe(200);
    expect(publishMock).toHaveBeenCalledWith(1, 2);
    expect(await response.json()).toMatchObject({ id: 2, status: "ACTIVE" });
  });
});
