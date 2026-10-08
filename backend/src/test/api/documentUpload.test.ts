import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUserMock, createDocumentMock, mkdirMock, writeFileMock, typeVersionWhereMock, typeVersionFirstMock, publishAvailableMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  createDocumentMock: vi.fn(),
  mkdirMock: vi.fn(),
  writeFileMock: vi.fn(),
  typeVersionWhereMock: vi.fn(),
  typeVersionFirstMock: vi.fn(),
  publishAvailableMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/services/documentService", () => ({ createDocument: createDocumentMock }));
vi.mock("@/realtime/publisher", () => ({ publishAvailableEvent: publishAvailableMock }));
vi.mock("node:fs/promises", () => ({ mkdir: mkdirMock, writeFile: writeFileMock }));
vi.mock("@/prisma/db", () => ({
  db: { orm: { public: { DocumentTypeVersion: { where: typeVersionWhereMock } } } },
}));

import { NextRequest } from "next/server";
import { POST } from "../../app/api/documents/route";

describe("POST /api/documents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);
    createDocumentMock.mockImplementation(async (data) => ({ id: 44, ...data, status: data.status, createdAt: "now" }));
    typeVersionWhereMock.mockReturnValue({ first: typeVersionFirstMock });
  });

  it.each([
    [{ id: 1, role: "USER" }, "regular user"],
    [{ id: 2, role: "ADMIN" }, "admin"],
  ])("allows a %s to upload through the shared storage pipeline", async (user) => {
    getCurrentUserMock.mockResolvedValue(user);
    const form = new FormData();
    form.set("file", new File(["pdf"], "contract.pdf", { type: "application/pdf" }));
    const response = await POST(new NextRequest("http://localhost/api/documents", { method: "POST", body: form }));

    expect(response.status).toBe(201);
    expect(createDocumentMock).toHaveBeenCalledWith(expect.objectContaining({
      fileName: "contract.pdf",
      userId: user.id,
      status: "AVAILABLE",
    }));
    expect(publishAvailableMock).toHaveBeenCalledTimes(1);
    expect(publishAvailableMock).toHaveBeenCalledWith(44, user.id, expect.objectContaining({ status: "AVAILABLE" }));
  });

  it("pins an optional upload selection to the active template version", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 2, role: "ADMIN" });
    typeVersionFirstMock.mockResolvedValue({ id: 27, documentTypeId: 9, status: "ACTIVE" });
    const form = new FormData();
    form.set("file", new File(["pdf"], "contract.pdf", { type: "application/pdf" }));
    form.set("documentTypeId", "9");

    const response = await POST(new NextRequest("http://localhost/api/documents", { method: "POST", body: form }));

    expect(response.status).toBe(201);
    expect(typeVersionWhereMock).toHaveBeenCalledWith({ documentTypeId: 9, status: "ACTIVE" });
    expect(createDocumentMock).toHaveBeenCalledWith(expect.objectContaining({ documentTypeId: 9, documentTypeVersionId: 27 }));
  });
});
