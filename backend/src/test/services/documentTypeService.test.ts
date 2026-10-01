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

      const result =
        await createDocumentType(data);

      expect(createMock).toHaveBeenCalledWith({
        name: data.name,
        domain: data.domain,
        description: data.description,
        jsonSchema: data.jsonSchema,
      });

      expect(result).toEqual(mockCreated);
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

  describe("deleteDocumentType", () => {
    it("deletes a document type", async () => {
      const mockDeleted = {
        id: 1,
      };

      vi.spyOn(
        db.orm.public.DocumentType,
        "where"
      ).mockReturnValue(
        db.orm.public.DocumentType
      );

      const deleteMock = vi
        .spyOn(
          db.orm.public.DocumentType,
          "delete"
        )
        .mockResolvedValue(
  mockDeleted as unknown as never
);

      const result =
        await deleteDocumentType(1);

      expect(deleteMock).toHaveBeenCalled();
      expect(result).toEqual(mockDeleted);
    });
  });
});