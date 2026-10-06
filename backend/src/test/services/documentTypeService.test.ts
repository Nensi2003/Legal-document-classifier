import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  getDocumentTypes,
  getDocumentTypeById,
  createDocumentType,
  updateDocumentType,
  deleteDocumentType,
  DocumentTypeInUseError,
  createDocumentTypeDraft,
  publishDocumentTypeVersion,
} from "../../services/documentTypeService";

import { db } from "../../prisma/db";

describe("documentTypeService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("getDocumentTypes", () => {
    it("gets all document types ordered by id", async () => {
      const mockDocumentTypes = [
        {
          id: 1,
          name: "Contract",
          domain: "Legal",
          description: "Legal contract",
          jsonSchema: {},
        },
        {
          id: 2,
          name: "Invoice",
          domain: "Finance",
          description: "Financial invoice",
          jsonSchema: {},
        },
      ];

      const allMock = vi
        .spyOn(db.orm.public.DocumentType, "all")
        .mockResolvedValue(
  mockDocumentTypes as unknown as never
);

      const orderByMock = vi
        .spyOn(db.orm.public.DocumentType, "orderBy")
        .mockReturnValue(
          db.orm.public.DocumentType
        );

      const result = await getDocumentTypes();

      expect(orderByMock).toHaveBeenCalled();
      expect(allMock).toHaveBeenCalled();
      expect(result).toEqual(mockDocumentTypes);
    });
  });

  describe("getDocumentTypeById", () => {
    it("gets a document type by id", async () => {
      const mockDocumentType = {
        id: 1,
        name: "Contract",
        domain: "Legal",
        description: "Legal contract",
        jsonSchema: {},
      };

      vi.spyOn(
        db.orm.public.DocumentType,
        "first"
      ).mockResolvedValue(
  mockDocumentType as unknown as never
);

      const whereMock = vi
        .spyOn(db.orm.public.DocumentType, "where")
        .mockReturnValue(
          db.orm.public.DocumentType
        );

      const result =
        await getDocumentTypeById(1);

      expect(whereMock).toHaveBeenCalledWith({
        id: 1,
      });

      expect(result).toEqual(
        mockDocumentType
      );
    });

    it("returns null when document type does not exist", async () => {
      vi.spyOn(
        db.orm.public.DocumentType,
        "first"
      ).mockResolvedValue(null);

      vi.spyOn(
        db.orm.public.DocumentType,
        "where"
      ).mockReturnValue(
        db.orm.public.DocumentType
      );

      const result =
        await getDocumentTypeById(999);

      expect(result).toBeNull();
    });
  });

  describe("createDocumentType", () => {
    it("creates a document type", async () => {
      const data = {
        name: "Contract",
        domain: "Legal",
        description: "Legal contract",
        jsonSchema: {
          type: "object",
        },
      };

      const mockCreated = {
        id: 1,
        ...data,
      };

      const createMock = vi
        .spyOn(
          db.orm.public.DocumentType,
          "create"
        )
        .mockResolvedValue(
  mockCreated as unknown as never
);
      const versionMock = vi.spyOn(db.orm.public.DocumentTypeVersion, "create")
        .mockResolvedValue({ id: 1, documentTypeId: 1, versionNumber: 1, jsonSchema: data.jsonSchema, status: "ACTIVE" } as unknown as never);

      const result =
        await createDocumentType(data);

      expect(createMock).toHaveBeenCalledWith({
        name: data.name,
        domain: data.domain,
        description: data.description,
      });
      expect(versionMock).toHaveBeenCalledWith(expect.objectContaining({ documentTypeId: 1, versionNumber: 1, jsonSchema: data.jsonSchema, status: "ACTIVE" }));

      expect(result).toEqual({ ...mockCreated, activeVersion: expect.objectContaining({ versionNumber: 1, status: "ACTIVE" }) });
    });

    it("creates API templates as an unpublished draft when requested", async () => {
      vi.spyOn(db.orm.public.DocumentType, "create").mockResolvedValue({ id: 7, name: "New type" } as unknown as never);
      const versionMock = vi.spyOn(db.orm.public.DocumentTypeVersion, "create").mockResolvedValue({ id: 11, versionNumber: 1, status: "DRAFT" } as unknown as never);

      const result = await createDocumentType({
        name: "New type",
        domain: "Legal",
        jsonSchema: { type: "object", properties: {} },
        status: "DRAFT",
      });

      expect(versionMock).toHaveBeenCalledWith(expect.objectContaining({ documentTypeId: 7, versionNumber: 1, status: "DRAFT" }));
      expect(versionMock).not.toHaveBeenCalledWith(expect.objectContaining({ publishedAt: expect.anything() }));
      expect(result).toHaveProperty("draftVersion");
      expect(result).not.toHaveProperty("activeVersion");
    });
  });

  describe("updateDocumentType", () => {
    it("updates a document type", async () => {
      const data = {
        name: "Updated Contract",
        domain: "Legal",
      };

      const mockUpdated = {
        id: 1,
        name: "Updated Contract",
        domain: "Legal",
        description: "Legal contract",
        jsonSchema: {},
      };

      vi.spyOn(
        db.orm.public.DocumentType,
        "where"
      ).mockReturnValue(
        db.orm.public.DocumentType
      );

      const updateMock = vi
        .spyOn(
          db.orm.public.DocumentType,
          "update"
        )
        .mockResolvedValue(
  mockUpdated as unknown as never
);

      const result =
        await updateDocumentType(1, data);

      expect(updateMock).toHaveBeenCalledWith(
        data
      );

      expect(result).toEqual(mockUpdated);
    });
  });

  describe("version lifecycle", () => {
    it("creates the next draft by copying the prior schema and fields", async () => {
      const previous = { id: 4, versionNumber: 2, jsonSchema: { type: "object" } };
      vi.spyOn(db.orm.public.DocumentTypeVersion, "where").mockReturnValue(db.orm.public.DocumentTypeVersion);
      vi.spyOn(db.orm.public.DocumentTypeVersion, "orderBy").mockReturnValue(db.orm.public.DocumentTypeVersion);
      vi.spyOn(db.orm.public.DocumentTypeVersion, "all").mockResolvedValue([previous] as unknown as never);
      vi.spyOn(db.orm.public.DocumentTypeVersion, "create").mockResolvedValue({ id: 5 } as unknown as never);
      vi.spyOn(db.orm.public.Field, "where").mockReturnValue(db.orm.public.Field);
      vi.spyOn(db.orm.public.Field, "all").mockResolvedValue([{ name: "Employer", type: "string", required: true, validationRule: null }] as unknown as never);
      const fieldCreate = vi.spyOn(db.orm.public.Field, "create").mockResolvedValue({} as unknown as never);

      await createDocumentTypeDraft(1);

      expect(db.orm.public.DocumentTypeVersion.create).toHaveBeenCalledWith(expect.objectContaining({ documentTypeId: 1, versionNumber: 3, jsonSchema: previous.jsonSchema, status: "DRAFT" }));
      expect(fieldCreate).toHaveBeenCalledWith(expect.objectContaining({ name: "Employer", documentTypeVersionId: 5 }));
    });

    it("archives the previous active version when publishing a draft", async () => {
      vi.spyOn(db.orm.public.DocumentTypeVersion, "where").mockReturnValue(db.orm.public.DocumentTypeVersion);
      vi.spyOn(db.orm.public.DocumentTypeVersion, "first")
        .mockResolvedValueOnce({ id: 2, status: "DRAFT" } as unknown as never)
        .mockResolvedValueOnce({ id: 1, status: "ACTIVE" } as unknown as never);
      vi.spyOn(db.orm.public.DocumentTypeVersion, "update").mockResolvedValue({} as unknown as never);

      await publishDocumentTypeVersion(1, 2);

      expect(db.orm.public.DocumentTypeVersion.update).toHaveBeenNthCalledWith(1, { status: "ARCHIVED" });
      expect(db.orm.public.DocumentTypeVersion.update).toHaveBeenNthCalledWith(2, expect.objectContaining({ status: "ACTIVE" }));
    });
  });

  describe("deleteDocumentType", () => {
    function mockDeletionTransaction(documents: unknown[]) {
      const versionWhere = vi.fn().mockReturnThis();
      const fieldWhere = vi.fn().mockReturnThis();
      const typeWhere = vi.fn().mockReturnThis();
      const versionDelete = vi.fn().mockResolvedValue({ count: 1 });
      const fieldDelete = vi.fn().mockResolvedValue({ count: 2 });
      const typeDelete = vi.fn().mockResolvedValue({ id: 1 });
      const tx = {
        orm: { public: {
          DocumentTypeVersion: { where: versionWhere, all: vi.fn().mockResolvedValue([{ id: 10 }, { id: 11 }]), delete: versionDelete },
          Document: { all: vi.fn().mockResolvedValue(documents) },
          Field: { where: fieldWhere, delete: fieldDelete },
          DocumentType: { where: typeWhere, delete: typeDelete },
        } },
      };
      vi.spyOn(db, "transaction").mockImplementation((async (callback: (context: unknown) => Promise<unknown>) => callback(tx)) as never);
      return { versionWhere, fieldWhere, typeWhere, versionDelete, fieldDelete, typeDelete };
    }

    it("deletes fields, versions, and an unused document type atomically", async () => {
      const mocks = mockDeletionTransaction([]);

      await deleteDocumentType(1);

      expect(mocks.fieldWhere).toHaveBeenCalledWith({ documentTypeVersionId: 10 });
      expect(mocks.fieldWhere).toHaveBeenCalledWith({ documentTypeVersionId: 11 });
      expect(mocks.versionWhere).toHaveBeenCalledWith({ id: 10 });
      expect(mocks.versionWhere).toHaveBeenCalledWith({ id: 11 });
      expect(mocks.typeWhere).toHaveBeenCalledWith({ id: 1 });
      expect(mocks.fieldDelete).toHaveBeenCalledTimes(2);
      expect(mocks.versionDelete).toHaveBeenCalledTimes(2);
      expect(mocks.typeDelete).toHaveBeenCalledTimes(1);
    });

    it("preserves a document linked to a template version and rejects deletion", async () => {
      const mocks = mockDeletionTransaction([{ id: 42, documentTypeId: null, documentTypeVersionId: 11 }]);

      await expect(deleteDocumentType(1)).rejects.toBeInstanceOf(DocumentTypeInUseError);

      expect(mocks.fieldDelete).not.toHaveBeenCalled();
      expect(mocks.versionDelete).not.toHaveBeenCalled();
      expect(mocks.typeDelete).not.toHaveBeenCalled();
    });

    it("preserves a document linked directly to the template and rejects deletion", async () => {
      const mocks = mockDeletionTransaction([{ id: 43, documentTypeId: 1, documentTypeVersionId: null }]);

      await expect(deleteDocumentType(1)).rejects.toBeInstanceOf(DocumentTypeInUseError);

      expect(mocks.fieldDelete).not.toHaveBeenCalled();
      expect(mocks.versionDelete).not.toHaveBeenCalled();
      expect(mocks.typeDelete).not.toHaveBeenCalled();
    });
  });
});
