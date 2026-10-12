import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUserMock, parseDocumentMock, readStoredFileMock, getAccessibleDocumentMock, assertClaimMock, classifyMock, documentWhereMock, documentUpdateMock, instancesWhereMock, instancesAllMock, instanceCreateMock, publishMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  parseDocumentMock: vi.fn(),
  readStoredFileMock: vi.fn(),
  getAccessibleDocumentMock: vi.fn(),
  assertClaimMock: vi.fn(),
  classifyMock: vi.fn(),
  documentWhereMock: vi.fn(),
  documentUpdateMock: vi.fn(),
  instancesWhereMock: vi.fn(),
  instancesAllMock: vi.fn(),
  instanceCreateMock: vi.fn(),
  publishMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/parsers/documentParser", () => ({ parseDocument: parseDocumentMock }));
vi.mock("@/lib/fileStorage", () => ({ readStoredFile: readStoredFileMock }));
vi.mock("@/services/documentAccessService", () => ({ getAccessibleDocumentById: getAccessibleDocumentMock }));
vi.mock("@/services/documentClaimService", () => ({ assertDocumentClaim: assertClaimMock }));
vi.mock("@/services/classificationService", () => ({ classifyAndMatchDocument: classifyMock }));
vi.mock("@/realtime/publisher", () => ({ publishDocumentEvent: publishMock }));
vi.mock("@/prisma/db", () => ({ db: { orm: { public: {
  Document: { where: documentWhereMock },
  DocumentInstance: { where: instancesWhereMock, create: instanceCreateMock },
} } } }));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/documents/[id]/parse/route";

describe("POST /api/documents/:id/parse boundary detection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({ id: 7, role: "USER" });
    readStoredFileMock.mockResolvedValue(Buffer.from("pdf"));
    getAccessibleDocumentMock.mockResolvedValue({
      id: 10,
      fileName: "combined.pdf",
      filePath: "uploads/combined.pdf",
      mimeType: "application/pdf",
      status: "AVAILABLE",
    });
    assertClaimMock.mockResolvedValue({ allowed: true });
    parseDocumentMock.mockResolvedValue({
      text: "Employment contract\nEmployee: Ada\nInvoice\nInvoice No: INV-1\nDate: 2026-10-01",
      pages: [
        { pageNumber: 1, text: "Employment contract\nEmployee: Ada" },
        { pageNumber: 2, text: "Terms and conditions" },
        { pageNumber: 3, text: "Invoice\nInvoice No: INV-1\nDate: 2026-10-01" },
      ],
    });
    classifyMock.mockResolvedValue([]);
    documentWhereMock.mockReturnValue({ update: documentUpdateMock });
    documentUpdateMock.mockImplementation(async (patch) => ({ id: 10, status: patch.status ?? "AVAILABLE" }));
    instancesWhereMock.mockReturnValue({ all: instancesAllMock, delete: vi.fn() });
    instancesAllMock.mockResolvedValue([]);
    let nextInstanceId = 30;
    instanceCreateMock.mockImplementation(async (data) => ({ id: nextInstanceId++, ...data }));
  });

  it("creates page-range instances and enters REVIEW when a PDF contains multiple documents", async () => {
    const response = await POST(new NextRequest("http://localhost/api/documents/10/parse", { method: "POST" }), {
      params: Promise.resolve({ id: "10" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(instanceCreateMock).toHaveBeenCalledTimes(2);
    expect(instanceCreateMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      documentId: 10, position: 1, startPage: 1, endPage: 2,
      detectionMethod: "RULE_BASED", detectionScore: 6, extractedText: "Employment contract\nEmployee: Ada\n\nTerms and conditions",
    }));
    expect(instanceCreateMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
      documentId: 10, position: 2, startPage: 3, endPage: 3,
      detectionMethod: "RULE_BASED", detectionScore: 8, extractedText: "Invoice\nInvoice No: INV-1\nDate: 2026-10-01",
    }));
    expect(documentUpdateMock).toHaveBeenCalledWith(expect.objectContaining({ status: "REVIEW" }));
    expect(body).toMatchObject({
      analysisStatus: "SUCCESS",
      document: { status: "REVIEW" },
      instances: [
        { id: 30, startPage: 1, endPage: 2 },
        { id: 31, startPage: 3, endPage: 3 },
      ],
    });
    expect(publishMock).toHaveBeenCalledWith("DOCUMENT_STATUS_CHANGED", 10, 7, { previousStatus: "AVAILABLE", status: "REVIEW" });
  });
});
