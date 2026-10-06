import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUserMock, batchCreateMock, createDocumentMock, mkdirMock, writeFileMock, parseDocumentMock, classifyMock, publishAvailableMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  batchCreateMock: vi.fn(),
  createDocumentMock: vi.fn(),
  mkdirMock: vi.fn(),
  writeFileMock: vi.fn(),
  parseDocumentMock: vi.fn(),
  classifyMock: vi.fn(),
  publishAvailableMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/services/documentService", () => ({ createDocument: createDocumentMock }));
vi.mock("@/parsers/documentParser", () => ({ parseDocument: parseDocumentMock }));
vi.mock("@/services/classificationService", () => ({ classifyAndMatchDocument: classifyMock }));
vi.mock("@/realtime/publisher", () => ({ publishAvailableEvent: publishAvailableMock }));
vi.mock("fs/promises", () => ({ mkdir: mkdirMock, writeFile: writeFileMock }));
vi.mock("@/prisma/db", () => ({ db: { orm: { public: { Batch: { create: batchCreateMock }, DocumentTypeVersion: { where: vi.fn() } } } } }));

import { NextRequest } from "next/server";
import { POST } from "../../app/api/documents/batch/route";

describe("POST /api/documents/batch admin publishing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({ id: 2, role: "ADMIN" });
    batchCreateMock.mockResolvedValue({ id: 19 });
    createDocumentMock.mockImplementation(async (data) => ({ id: 90, ...data, parseStatus: "PENDING" }));
    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);
  });

  it("publishes every valid batch file without parsing or classifying it", async () => {
    const body = new FormData();
    body.append("files", new File(["pdf-one"], "employment.pdf", { type: "application/pdf" }));
    body.append("files", new File(["pdf-two"], "policy.pdf", { type: "application/pdf" }));

    const response = await POST(new NextRequest("http://localhost/api/documents/batch", { method: "POST", body }));
    const result = await response.json();

    expect(response.status).toBe(201);
    expect(batchCreateMock).toHaveBeenCalledWith({ userId: 2, status: "AVAILABLE" });
    expect(createDocumentMock).toHaveBeenCalledTimes(2);
    expect(createDocumentMock).toHaveBeenCalledWith(expect.objectContaining({ status: "AVAILABLE", batchId: 19 }));
    expect(parseDocumentMock).not.toHaveBeenCalled();
    expect(classifyMock).not.toHaveBeenCalled();
    expect(publishAvailableMock).toHaveBeenCalledTimes(2);
    expect(result.results.map((item: { status: string }) => item.status)).toEqual(["AVAILABLE", "AVAILABLE"]);
  });
});
