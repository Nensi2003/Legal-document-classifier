import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUserMock, batchCreateMock, createDocumentMock, mkdirMock, writeFileMock, parseDocumentMock, classifyMock, publishAvailableMock, documentWhereMock, documentUpdateMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  batchCreateMock: vi.fn(),
  createDocumentMock: vi.fn(),
  mkdirMock: vi.fn(),
  writeFileMock: vi.fn(),
  parseDocumentMock: vi.fn(),
  classifyMock: vi.fn(),
  publishAvailableMock: vi.fn(),
  documentWhereMock: vi.fn(),
  documentUpdateMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/services/documentService", () => ({ createDocument: createDocumentMock }));
vi.mock("@/parsers/documentParser", () => ({ parseDocument: parseDocumentMock }));
vi.mock("@/services/classificationService", () => ({ classifyAndMatchDocument: classifyMock }));
vi.mock("@/realtime/publisher", () => ({ publishAvailableEvent: publishAvailableMock }));
vi.mock("fs/promises", () => ({ mkdir: mkdirMock, writeFile: writeFileMock }));
vi.mock("@/prisma/db", () => ({ db: { orm: { public: { Batch: { create: batchCreateMock }, Document: { where: documentWhereMock }, DocumentTypeVersion: { where: vi.fn() } } } } }));

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
    parseDocumentMock.mockResolvedValue({ text: "contract text" });
    classifyMock.mockResolvedValue([]);
    documentWhereMock.mockReturnValue({ update: documentUpdateMock });
    documentUpdateMock.mockResolvedValue({ id: 90 });
  });

  it("publishes every valid batch file without parsing or classifying it", async () => {
    const body = new FormData();
    body.append("files", new File(["pdf-one"], "employment.pdf", { type: "application/pdf" }));
    body.append("files", new File(["pdf-two"], "policy.pdf", { type: "application/pdf" }));

    const response = await POST(new NextRequest("http://localhost/api/documents/batch", { method: "POST", body }));
    const result = await response.json();

    expect(response.status).toBe(201);
    expect(batchCreateMock).toHaveBeenCalledWith({ userId: 2, status: "ACTIVE" });
    expect(createDocumentMock).toHaveBeenCalledTimes(2);
    expect(createDocumentMock).toHaveBeenCalledWith(expect.objectContaining({ status: "DRAFT", batchId: 19 }));
    expect(parseDocumentMock).not.toHaveBeenCalled();
    expect(classifyMock).not.toHaveBeenCalled();
    expect(publishAvailableMock).toHaveBeenCalledTimes(2);
    expect(result.results.map((item: { status: string }) => item.status)).toEqual(["DRAFT", "DRAFT"]);
  });

  it("keeps ordinary-user batch uploads as globally available drafts after parsing", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 8, role: "USER" });
    const body = new FormData();
    body.append("files", new File(["pdf"], "user-upload.pdf", { type: "application/pdf" }));

    const response = await POST(new NextRequest("http://localhost/api/documents/batch", { method: "POST", body }));
    const result = await response.json();

    expect(response.status).toBe(201);
    expect(createDocumentMock).toHaveBeenCalledWith(expect.objectContaining({ userId: 8, status: "DRAFT" }));
    expect(parseDocumentMock).toHaveBeenCalledTimes(1);
    expect(classifyMock).toHaveBeenCalledWith("contract text");
    expect(documentUpdateMock).toHaveBeenCalledWith(expect.objectContaining({ status: "DRAFT", parseStatus: "SUCCESS" }));
    expect(publishAvailableMock).toHaveBeenCalledWith(90, 8, expect.objectContaining({ status: "DRAFT" }));
    expect(result.results[0].status).toBe("DRAFT");
  });
});
