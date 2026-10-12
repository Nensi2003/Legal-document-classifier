import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  getFieldsByVersion,
  createField,
  getFieldById,
  updateField,
  deleteField,
} from "../../services/fieldService";

import { db } from "../../prisma/db";

describe("fieldService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(db.orm.public.DocumentTypeVersion, "where").mockReturnValue(db.orm.public.DocumentTypeVersion);
    vi.spyOn(db.orm.public.DocumentTypeVersion, "first").mockResolvedValue({ id: 1, status: "DRAFT" } as unknown as never);
  });

  describe("getFieldsByVersion", () => {
    it("gets all fields for a document type", async () => {
      const mockFields = [
        {
          id: 1,
          name: "Client Name",
          type: "string",
          required: true,
          validationRule: null,
          documentTypeVersionId: 1,
        },
        {
          id: 2,
          name: "Contract Date",
          type: "date",
          required: true,
          validationRule: null,
          documentTypeVersionId: 1,
        },
      ];

      vi.spyOn(db.orm.public.Field, "where")
        .mockReturnValue(
          db.orm.public.Field
        );
      vi.spyOn(db.orm.public.Field, "all")
        .mockResolvedValue(
          mockFields as unknown as never
        );

      const result =
        await getFieldsByVersion(1);

      expect(result).toEqual(mockFields);
    });
  });

  describe("createField", () => {
    it("does not allow fields to be added to a published version", async () => {
      vi.spyOn(db.orm.public.DocumentTypeVersion, "first").mockResolvedValue({ id: 1, status: "ACTIVE" } as unknown as never);
      const createMock = vi.spyOn(db.orm.public.Field, "create");

      await expect(createField({ name: "New field", type: "string", documentTypeVersionId: 1 }))
        .rejects.toThrow("Fields can only be changed on a draft version");

      expect(createMock).not.toHaveBeenCalled();
    });

    it("creates a field with normalized input", async () => {
      vi.spyOn(db.orm.public.Field, "where")
        .mockReturnValue(
          db.orm.public.Field
        );

      vi.spyOn(db.orm.public.Field, "all")
        .mockResolvedValue(
          [] as unknown as never
        );

      const mockCreatedField = {
        id: 1,
        name: "Client Name",
        type: "string",
        required: true,
        validationRule: "required",
        documentTypeVersionId: 1,
      };

      const createMock = vi
        .spyOn(db.orm.public.Field, "create")
        .mockResolvedValue(
          mockCreatedField as unknown as never
        );

      const result = await createField({
        name: "  Client Name  ",
        type: "string",
        required: true,
        validationRule: "required",
        documentTypeVersionId: 1,
      });

      expect(createMock).toHaveBeenCalledWith({
        name: "Client Name",
        type: "string",
        required: true,
        validationRule: "required",
        documentTypeVersionId: 1,
      });

      expect(result).toEqual(
        mockCreatedField
      );
    });

    it("uses false when required is not provided", async () => {
      vi.spyOn(db.orm.public.Field, "where")
        .mockReturnValue(
          db.orm.public.Field
        );

      vi.spyOn(db.orm.public.Field, "all")
        .mockResolvedValue(
          [] as unknown as never
        );

      const createMock = vi
        .spyOn(db.orm.public.Field, "create")
        .mockResolvedValue(
          {} as unknown as never
        );

      await createField({
        name: "Client Name",
        type: "string",
        documentTypeVersionId: 1,
      });

      expect(createMock).toHaveBeenCalledWith({
        name: "Client Name",
        type: "string",
        required: false,
        validationRule: undefined,
        documentTypeVersionId: 1,
      });
    });

    it("rejects a duplicate field name case-insensitively", async () => {
  const existingFields = [
    {
      id: 1,
      name: "Client Name",
      type: "string",
      required: true,
      validationRule: null,
      documentTypeVersionId: 1,
    },
  ];

  vi.spyOn(db.orm.public.Field, "where")
    .mockReturnValue(
      db.orm.public.Field
    );

  vi.spyOn(db.orm.public.Field, "all")
    .mockResolvedValue(
      existingFields as unknown as never
    );

  const createMock = vi.spyOn(
    db.orm.public.Field,
    "create"
  );

  await expect(
    createField({
      name: "CLIENT NAME",
      type: "string",
      documentTypeVersionId: 1,
    })
  ).rejects.toThrow(
    "A field with this name already exists in this template"
  );

  expect(createMock).not.toHaveBeenCalled();
});
    it("allows the same field name in a different document type", async () => {
      vi.spyOn(db.orm.public.Field, "where")
        .mockReturnValue(
          db.orm.public.Field
        );

      vi.spyOn(db.orm.public.Field, "all")
        .mockResolvedValue(
          [] as unknown as never
        );

      const createMock = vi
        .spyOn(db.orm.public.Field, "create")
        .mockResolvedValue(
          {} as unknown as never
        );

      await createField({
        name: "Client Name",
        type: "string",
        documentTypeVersionId: 2,
      });

      expect(createMock).toHaveBeenCalled();
    });
  });

  describe("getFieldById", () => {
    it("gets a field by id", async () => {
      const mockField = {
        id: 1,
        name: "Client Name",
        type: "string",
        required: true,
        validationRule: null,
        documentTypeVersionId: 1,
      };

      vi.spyOn(db.orm.public.Field, "where")
        .mockReturnValue(
          db.orm.public.Field
        );

      vi.spyOn(db.orm.public.Field, "first")
        .mockResolvedValue(
          mockField as unknown as never
        );

      const result =
        await getFieldById(1);

      expect(result).toEqual(mockField);
    });

    it("returns null when the field does not exist", async () => {
      vi.spyOn(db.orm.public.Field, "where")
        .mockReturnValue(
          db.orm.public.Field
        );

      vi.spyOn(db.orm.public.Field, "first")
        .mockResolvedValue(null);

      const result =
        await getFieldById(999);

      expect(result).toBeNull();
    });
  });

  describe("updateField", () => {
    it("throws when the field does not exist", async () => {
      vi.spyOn(db.orm.public.Field, "where")
        .mockReturnValue(
          db.orm.public.Field
        );

      vi.spyOn(db.orm.public.Field, "first")
        .mockResolvedValue(null);

      await expect(
        updateField(999, {
          name: "Updated Name",
        })
      ).rejects.toThrow("Field not found");
    });

    it("updates a field and trims its name", async () => {
      const existingField = {
        id: 1,
        name: "Client Name",
        type: "string",
        required: true,
        validationRule: null,
        documentTypeVersionId: 1,
      };

      vi.spyOn(db.orm.public.Field, "where")
        .mockReturnValue(
          db.orm.public.Field
        );

      vi.spyOn(db.orm.public.Field, "first")
        .mockResolvedValue(
          existingField as unknown as never
        );

      vi.spyOn(db.orm.public.Field, "all")
        .mockResolvedValue(
          [existingField] as unknown as never
        );

      const updateMock = vi
        .spyOn(db.orm.public.Field, "update")
        .mockResolvedValue(
          {
            ...existingField,
            name: "Updated Name",
          } as unknown as never
        );

      const result = await updateField(1, {
        name: "  Updated Name  ",
      });

      expect(updateMock).toHaveBeenCalledWith({
        name: "Updated Name",
      });

      expect(result).toEqual({
        ...existingField,
        name: "Updated Name",
      });
    });

    it("rejects a duplicate name when updating a field", async () => {
      const existingField = {
        id: 1,
        name: "Client Name",
        type: "string",
        required: true,
        validationRule: null,
        documentTypeVersionId: 1,
      };

      const anotherField = {
        id: 2,
        name: "Contract Number",
        type: "string",
        required: false,
        validationRule: null,
        documentTypeVersionId: 1,
      };

      vi.spyOn(db.orm.public.Field, "where")
        .mockReturnValue(
          db.orm.public.Field
        );

      vi.spyOn(db.orm.public.Field, "first")
        .mockResolvedValue(
          existingField as unknown as never
        );

      vi.spyOn(db.orm.public.Field, "all")
        .mockResolvedValue(
          [
            existingField,
            anotherField,
          ] as unknown as never
        );

      await expect(
        updateField(1, {
          name: "contract number",
        })
      ).rejects.toThrow(
        "A field with this name already exists in this template"
      );
    });

    it("allows keeping the same name when updating the same field", async () => {
      const existingField = {
        id: 1,
        name: "Client Name",
        type: "string",
        required: true,
        validationRule: null,
        documentTypeVersionId: 1,
      };

      vi.spyOn(db.orm.public.Field, "where")
        .mockReturnValue(
          db.orm.public.Field
        );

      vi.spyOn(db.orm.public.Field, "first")
        .mockResolvedValue(
          existingField as unknown as never
        );

      vi.spyOn(db.orm.public.Field, "all")
        .mockResolvedValue(
          [existingField] as unknown as never
        );

      const updateMock = vi
        .spyOn(db.orm.public.Field, "update")
        .mockResolvedValue(
          existingField as unknown as never
        );

      await updateField(1, {
        name: "Client Name",
      });

      expect(updateMock).toHaveBeenCalledWith({
        name: "Client Name",
      });
    });
  });

  describe("deleteField", () => {
    it("deletes a field", async () => {
      const mockDeletedField = {
        id: 1,
      };

      vi.spyOn(db.orm.public.Field, "where")
        .mockReturnValue(
          db.orm.public.Field
        );

      vi.spyOn(db.orm.public.Field, "first").mockResolvedValue({
        id: 1, documentTypeVersionId: 1,
      } as unknown as never);

      const deleteMock = vi
        .spyOn(db.orm.public.Field, "delete")
        .mockResolvedValue(
          mockDeletedField as unknown as never
        );

      const result =
        await deleteField(1);

      expect(deleteMock).toHaveBeenCalled();
      expect(result).toEqual(
        mockDeletedField
      );
    });
  });
});
