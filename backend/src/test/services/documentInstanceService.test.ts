import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAccessibleDocumentMock, assertDocumentClaimMock, readStoredFileMock, parseDocumentMock, instanceWhereMock, instanceCreateMock } = vi.hoisted(() => ({
  getAccessibleDocumentMock: vi.fn(),
  assertDocumentClaimMock: vi.fn(),
  readStoredFileMock: vi.fn(),
  parseDocumentMock: vi.fn(),
  instanceWhereMock: vi.fn(),
  instanceCreateMock: vi.fn(),
}));

vi.mock("@/prisma/db", () => ({ db: { orm: { public: { DocumentInstance: { where: instanceWhereMock, create: instanceCreateMock } } } } }));
vi.mock("@/parsers/documentParser", () => ({ parseDocument: parseDocumentMock }));
vi.mock("@/services/documentAccessService", () => ({ getAccessibleDocumentById: getAccessibleDocumentMock }));
vi.mock("@/services/documentClaimService", () => ({ assertDocumentClaim: assertDocumentClaimMock }));
vi.mock("@/lib/fileStorage", () => ({ readStoredFile: readStoredFileMock }));

import {
  mergeDocumentInstances,
  splitDocumentInstance,
  updateDocumentInstanceBoundary,
} from "@/services/documentInstanceService";

type InstanceRow = {
  id: number;
  documentId: number;
  position: number;
  startPage: number;
  endPage: number;
  detectionMethod: string;
  detectionScore: number | null;
  extractedText: string;
  status: string;
  draftData?: unknown;
  generatedJSON?: unknown;
};

describe("document instance boundary operations", () => {
  let rows: InstanceRow[];
  let nextId: number;

  beforeEach(() => {
    vi.clearAllMocks();
    rows = [
      { id: 1, documentId: 10, position: 1, startPage: 1, endPage: 4, detectionMethod: "RULE_BASED", detectionScore: 4, extractedText: "old text", status: "DRAFT" },
      { id: 2, documentId: 10, position: 2, startPage: 5, endPage: 6, detectionMethod: "RULE_BASED", detectionScore: 4, extractedText: "old text", status: "DRAFT" },
    ];
    nextId = 3;
    getAccessibleDocumentMock.mockResolvedValue({ id: 10, filePath: "uploads/test.pdf", mimeType: "application/pdf", status: "REVIEW" });
    assertDocumentClaimMock.mockResolvedValue({ allowed: true });
    readStoredFileMock.mockResolvedValue(Buffer.from("pdf"));
    parseDocumentMock.mockResolvedValue({ pages: Array.from({ length: 6 }, (_, index) => ({ pageNumber: index + 1, text: `Page ${index + 1}` })) });
    instanceWhereMock.mockImplementation((query: Record<string, number>) => ({
      first: async () => rows.find((row) => row.id === query.id && row.documentId === query.documentId) ?? null,
      all: async () => rows.filter((row) => row.documentId === query.documentId),
      update: async (patch: Partial<InstanceRow>) => {
        const row = rows.find((candidate) => candidate.id === query.id && candidate.documentId === query.documentId);
        if (!row) return null;
        Object.assign(row, patch);
        return { ...row };
      },
      delete: async () => {
        rows = rows.filter((row) => !(row.id === query.id && row.documentId === query.documentId));
        return { count: 1 };
      },
    }));
    instanceCreateMock.mockImplementation(async (data: Omit<InstanceRow, "id">) => {
      const row = { id: nextId++, ...data };
      rows.push(row);
      return { ...row };
    });
  });

  it("updates a reviewed page range and recomputes only that range's text", async () => {
    const updated = await updateDocumentInstanceBoundary(10, 1, 7, 2, 3);

    expect(updated).toMatchObject({ startPage: 2, endPage: 3, extractedText: "Page 2\n\nPage 3" });
    expect(parseDocumentMock).toHaveBeenCalledWith(Buffer.from("pdf"), "application/pdf");
  });

  it("splits an instance, preserves the original ID, and renumbers by page order", async () => {
    const result = await splitDocumentInstance(10, 1, 7, 3);

    expect(result.firstInstance).toMatchObject({ id: 1, startPage: 1, endPage: 2, extractedText: "Page 1\n\nPage 2" });
    expect(result.secondInstance).toMatchObject({ id: 3, startPage: 3, endPage: 4, extractedText: "Page 3\n\nPage 4", detectionMethod: "MANUAL_SPLIT" });
    expect([...rows].sort((a, b) => a.position - b.position).map(({ id, position, startPage, endPage }) => ({ id, position, startPage, endPage }))).toEqual([
      { id: 1, position: 1, startPage: 1, endPage: 2 },
      { id: 3, position: 2, startPage: 3, endPage: 4 },
      { id: 2, position: 3, startPage: 5, endPage: 6 },
    ]);
  });

  it("merges only adjacent instances, preserves the earlier instance ID, and renumbers", async () => {
    rows = [
      { id: 1, documentId: 10, position: 1, startPage: 1, endPage: 2, detectionMethod: "RULE_BASED", detectionScore: 4, extractedText: "old", status: "DRAFT" },
      { id: 2, documentId: 10, position: 2, startPage: 3, endPage: 4, detectionMethod: "RULE_BASED", detectionScore: 4, extractedText: "old", status: "DRAFT" },
      { id: 4, documentId: 10, position: 3, startPage: 5, endPage: 6, detectionMethod: "RULE_BASED", detectionScore: 4, extractedText: "old", status: "DRAFT" },
    ];

    const result = await mergeDocumentInstances(10, 2, 1, 7);

    expect(result.instance).toMatchObject({ id: 1, startPage: 1, endPage: 4, extractedText: "Page 1\n\nPage 2\n\nPage 3\n\nPage 4" });
    expect(rows.map(({ id, position }) => ({ id, position }))).toEqual([{ id: 1, position: 1 }, { id: 4, position: 2 }]);
  });

  it("rejects non-adjacent instances without reading or mutating the source", async () => {
    rows[1].startPage = 6;

    await expect(mergeDocumentInstances(10, 1, 2, 7)).rejects.toThrow("Only adjacent document instances can be merged");
    expect(parseDocumentMock).not.toHaveBeenCalled();
    expect(rows).toHaveLength(2);
  });

  it("does not change instance boundaries after review has ended", async () => {
    getAccessibleDocumentMock.mockResolvedValue({ id: 10, filePath: "uploads/test.pdf", mimeType: "application/pdf", status: "AVAILABLE" });

    await expect(updateDocumentInstanceBoundary(10, 1, 7, 2, 3)).rejects.toThrow("Document boundaries can only be edited during review");
    expect(instanceWhereMock).not.toHaveBeenCalled();
  });
});
