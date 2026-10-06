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
  getFields,
  createField,
  updateField,
  deleteField,
} from "../../features/document-types/api";

describe("Document Type API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("getDocumentTypes", () => {
    it("gets document types successfully", async () => {
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

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => mockDocumentTypes,
        })
      );

      const result = await getDocumentTypes();

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/document-types",
        {
          credentials: "include",
        }
      );

      expect(result).toEqual(mockDocumentTypes);
    });

    it("throws when getting document types fails", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
        })
      );

      await expect(
        getDocumentTypes()
      ).rejects.toThrow(
        "Failed to fetch document types"
      );
    });
  });

  describe("getDocumentTypeById", () => {
    it("gets a document type successfully", async () => {
      const mockDocumentType = {
        id: 1,
        name: "Contract",
        domain: "Legal",
        description: "Legal contract",
        jsonSchema: {},
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => mockDocumentType,
        })
      );

      const result =
        await getDocumentTypeById(1);

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/document-types/1",
        {
          credentials: "include",
        }
      );

      expect(result).toEqual(mockDocumentType);
    });

    it("requests the document type schema for the document's pinned version", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 1, jsonSchema: { type: "object", properties: {} }, versionNumber: 1 }),
      }));

      await getDocumentTypeById(1, 7);

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/document-types/1?versionId=7",
        { credentials: "include" },
      );
    });

    it("throws when getting a document type fails", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
        })
      );

      await expect(
        getDocumentTypeById(1)
      ).rejects.toThrow(
        "Failed to fetch document type"
      );
    });
  });

  describe("createDocumentType", () => {
    it("creates a document type successfully", async () => {
      const mockDocumentType = {
        id: 1,
        name: "Contract",
        domain: "Legal",
        description: "Legal contract",
        jsonSchema: {
          type: "object",
        },
      };

      const data = {
        name: "Contract",
        domain: "Legal",
        description: "Legal contract",
        jsonSchema: {
          type: "object",
        },
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => mockDocumentType,
        })
      );

      const result =
        await createDocumentType(data);

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/document-types",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(data),
        }
      );

      expect(result).toEqual(mockDocumentType);
    });

    it("throws when creating a document type fails", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          json: async () => ({
            error: "Failed to create",
          }),
        })
      );

      await expect(
        createDocumentType({
          name: "Contract",
          domain: "Legal",
          jsonSchema: {},
        })
      ).rejects.toThrow("Failed to create");
    });
  });

  describe("updateDocumentType", () => {
    it("updates a document type successfully", async () => {
      const data = {
        name: "Updated Contract",
        domain: "Legal",
      };

      const mockDocumentType = {
        id: 1,
        name: "Updated Contract",
        domain: "Legal",
        description: null,
        jsonSchema: {},
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => mockDocumentType,
        })
      );

      const result =
        await updateDocumentType(1, data);

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/document-types/1",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(data),
        }
      );

      expect(result).toEqual(mockDocumentType);
    });

    it("throws when updating a document type fails", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          json: async () => ({
            error: "Failed to update",
          }),
        })
      );

      await expect(
        updateDocumentType(1, {
          name: "Updated Contract",
        })
      ).rejects.toThrow("Failed to update");
    });
  });

  describe("deleteDocumentType", () => {
    it("deletes a document type successfully", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({}),
        })
      );

      await expect(
        deleteDocumentType(1)
      ).resolves.toBeUndefined();

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/document-types/1",
        {
          method: "DELETE",
          credentials: "include",
        }
      );
    });

    it("throws when deleting a document type fails", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          json: async () => ({
            error: "Failed to delete",
          }),
        })
      );

      await expect(
        deleteDocumentType(1)
      ).rejects.toThrow("Failed to delete");
    });
  });

  describe("getFields", () => {
    it("gets fields successfully", async () => {
      const mockFields = [
        {
          id: 1,
          name: "Contract Number",
          type: "string",
          required: true,
          validationRule: null,
          documentTypeId: 1,
        },
      ];

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => mockFields,
        })
      );

      const result = await getFields(1);

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/document-types/1/fields",
        {
          credentials: "include",
        }
      );

      expect(result).toEqual(mockFields);
    });

    it("throws when getting fields fails", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          json: async () => ({
            error: "Failed to load fields",
          }),
        })
      );

      await expect(
        getFields(1)
      ).rejects.toThrow(
        "Failed to load fields"
      );
    });
  });

  describe("createField", () => {
    it("creates a field successfully", async () => {
      const data = {
        name: "Contract Number",
        type: "string",
        required: true,
        validationRule: "^[A-Z0-9]+$",
        documentTypeId: 1,
      };

      const mockField = {
        id: 1,
        ...data,
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => mockField,
        })
      );

      const result = await createField(data);

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/document-types/1/fields",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(data),
        }
      );

      expect(result).toEqual(mockField);
    });

    it("throws when creating a field fails", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          json: async () => ({
            error: "Failed to create field",
          }),
        })
      );

      await expect(
        createField({
          name: "Contract Number",
          type: "string",
          documentTypeId: 1,
        })
      ).rejects.toThrow(
        "Failed to create field"
      );
    });
  });

  describe("updateField", () => {
    it("updates a field successfully", async () => {
      const data = {
        name: "Updated Field",
        type: "string",
        required: false,
      };

      const mockField = {
        id: 1,
        name: "Updated Field",
        type: "string",
        required: false,
        validationRule: null,
        documentTypeId: 1,
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => mockField,
        })
      );

      const result = await updateField(1, data);

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/fields/1",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(data),
        }
      );

      expect(result).toEqual(mockField);
    });

    it("throws when updating a field fails", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          json: async () => ({
            error: "Failed to update field",
          }),
        })
      );

      await expect(
        updateField(1, {
          name: "Updated Field",
        })
      ).rejects.toThrow(
        "Failed to update field"
      );
    });
  });

  describe("deleteField", () => {
    it("deletes a field successfully", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({}),
        })
      );

      await expect(
        deleteField(1)
      ).resolves.toBeUndefined();

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/fields/1",
        {
          method: "DELETE",
          credentials: "include",
        }
      );
    });

    it("throws when deleting a field fails", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          json: async () => ({
            error: "Failed to delete field",
          }),
        })
      );

      await expect(
        deleteField(1)
      ).rejects.toThrow(
        "Failed to delete field"
      );
    });
  });
});
