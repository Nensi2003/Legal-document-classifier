import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUserMock, publishMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  publishMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/services/documentTypeService", () => ({ publishDocumentTypeVersion: publishMock }));

import { POST } from "../../app/api/document-types/[id]/versions/[versionId]/publish/route";

describe("POST /api/document-types/:id/versions/:versionId/publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated users before publishing", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "1", versionId: "2" }),
    });

    expect(response.status).toBe(401);
    expect(publishMock).not.toHaveBeenCalled();
  });

  it("allows an authenticated ordinary user to publish the requested version", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 7, role: "USER" });
    publishMock.mockResolvedValue({ id: 2, status: "ACTIVE" });

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "1", versionId: "2" }),
    });

    expect(response.status).toBe(200);
    expect(publishMock).toHaveBeenCalledWith(1, 2);
    expect(await response.json()).toMatchObject({ id: 2, status: "ACTIVE" });
  });
});
