import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAccessibleDocumentMock, assertClaimMock, instancesWhereMock, instancesAllMock, versionWhereMock, versionFirstMock, generatedWhereMock, generatedFirstMock, generatedCreateMock, documentWhereMock, documentUpdateMock, validateJSONMock, publishMock } = vi.hoisted(() => ({
  getAccessibleDocumentMock: vi.fn(),
  assertClaimMock: vi.fn(),
  instancesWhereMock: vi.fn(),
  instancesAllMock: vi.fn(),
  versionWhereMock: vi.fn(),
  versionFirstMock: vi.fn(),
  generatedWhereMock: vi.fn(),
  generatedFirstMock: vi.fn(),
  generatedCreateMock: vi.fn(),
  documentWhereMock: vi.fn(),
  documentUpdateMock: vi.fn(),
  validateJSONMock: vi.fn(),
  publishMock: vi.fn(),
}));

vi.mock("@/prisma/db", () => ({ db: { orm: { public: {
  DocumentInstance: { where: instancesWhereMock },
  DocumentTypeVersion: { where: versionWhereMock },
  GeneratedJSON: { where: generatedWhereMock, create: generatedCreateMock },
  Document: { where: documentWhereMock },
} } } }));
vi.mock("@/services/documentAccessService", () => ({ getAccessibleDocumentById: getAccessibleDocumentMock }));
vi.mock("@/services/documentClaimService", () => ({ assertDocumentClaim: assertClaimMock }));
vi.mock("@/services/jsonValidationService", () => ({ validateJSON: validateJSONMock }));
vi.mock("@/realtime/publisher", () => ({ publishDocumentEvent: publishMock }));

import { generateDocumentJSON } from "@/services/jsonService";

describe("JSON generation uses the document's pinned template version", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAccessibleDocumentMock.mockResolvedValue({
      id: 10,
      documentTypeId: 3,
      documentTypeVersionId: 21,
      draftData: { employer: "Example Ltd" },
    });
    assertClaimMock.mockResolvedValue({ allowed: true });
    instancesWhereMock.mockReturnValue({ all: instancesAllMock });
    instancesAllMock.mockResolvedValue([]);
    versionWhereMock.mockReturnValue({ first: versionFirstMock });
    versionFirstMock.mockResolvedValue({ id: 21, documentTypeId: 3, versionNumber: 1, status: "ARCHIVED", jsonSchema: { properties: { employer: { type: "string" } } } });
    generatedWhereMock.mockReturnValue({ first: generatedFirstMock });
    generatedFirstMock.mockResolvedValue(null);
    generatedCreateMock.mockResolvedValue({ id: 41, documentId: 10, data: { employer: "Example Ltd" }, isValid: true });
    documentWhereMock.mockReturnValue({ update: documentUpdateMock });
    documentUpdateMock.mockResolvedValue({ id: 10, status: "COMPLETED" });
    validateJSONMock.mockReturnValue({ valid: true, errors: [] });
  });

  it("validates and stores output against the saved version even if that version is archived", async () => {
    const result = await generateDocumentJSON(10, 7);

    expect(versionWhereMock).toHaveBeenCalledWith({ id: 21 });
    expect(validateJSONMock).toHaveBeenCalledWith(
      { employer: "Example Ltd" },
      { properties: { employer: { type: "string" } } },
    );
    expect(generatedCreateMock).toHaveBeenCalledWith({ data: { employer: "Example Ltd" }, isValid: true, documentId: 10 });
    expect(documentUpdateMock).toHaveBeenCalledWith({ status: "COMPLETED", activeWorkerId: null, claimExpiresAt: null });
    expect(result).toMatchObject({ valid: true, generatedJSON: { id: 41 } });
  });

  it("does not complete or persist JSON when version validation fails", async () => {
    validateJSONMock.mockReturnValue({ valid: false, errors: [{ message: "missing employer" }] });

    const result = await generateDocumentJSON(10, 7);

    expect(result).toMatchObject({ valid: false });
    expect(generatedCreateMock).not.toHaveBeenCalled();
    expect(documentUpdateMock).not.toHaveBeenCalled();
    expect(publishMock).not.toHaveBeenCalled();
  });
});
