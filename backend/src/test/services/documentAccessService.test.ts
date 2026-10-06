import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../prisma/db";
import { getAccessibleDocumentById, getDocumentsAccessibleToUser } from "../../services/documentAccessService";

describe("document access policy", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("allows a user to access a document uploaded by an admin without changing its uploader", async () => {
    const adminUpload = { id: 12, userId: 3, fileName: "shared.pdf" };
    vi.spyOn(db.orm.public.Document, "where").mockReturnValue(db.orm.public.Document);
    vi.spyOn(db.orm.public.Document, "first").mockResolvedValue(adminUpload as never);
    vi.spyOn(db.orm.public.User, "where").mockReturnValue(db.orm.public.User);
    vi.spyOn(db.orm.public.User, "first")
      .mockResolvedValueOnce({ id: 8, role: "USER" } as never)
      .mockResolvedValueOnce({ id: 3, role: "ADMIN" } as never);

    await expect(getAccessibleDocumentById(12, 8)).resolves.toBe(adminUpload);
    expect(adminUpload.userId).toBe(3);
  });

  it("does not allow a user to access another user's private document by ID", async () => {
    vi.spyOn(db.orm.public.Document, "where").mockReturnValue(db.orm.public.Document);
    vi.spyOn(db.orm.public.Document, "first").mockResolvedValue({ id: 12, userId: 3 } as never);
    vi.spyOn(db.orm.public.User, "where").mockReturnValue(db.orm.public.User);
    vi.spyOn(db.orm.public.User, "first")
      .mockResolvedValueOnce({ id: 8, role: "USER" } as never)
      .mockResolvedValueOnce({ id: 3, role: "USER" } as never);

    await expect(getAccessibleDocumentById(12, 8)).resolves.toBeNull();
  });

  it("does not allow admins to access documents through the processing workspace", async () => {
    vi.spyOn(db.orm.public.User, "where").mockReturnValue(db.orm.public.User);
    vi.spyOn(db.orm.public.User, "first").mockResolvedValue({ id: 3, role: "ADMIN" } as never);
    const documentLookup = vi.spyOn(db.orm.public.Document, "where");

    await expect(getAccessibleDocumentById(12, 3)).resolves.toBeNull();
    expect(documentLookup).not.toHaveBeenCalled();
  });

  it("lists a user's own uploads and admin uploads, marking shared work as available", async () => {
    vi.spyOn(db.orm.public.Document, "all").mockResolvedValue([
      { id: 1, userId: 8 },
      { id: 2, userId: 3 },
      { id: 3, userId: 4 },
      { id: 4, userId: 4, status: "COMPLETED" },
    ] as never);
    vi.spyOn(db.orm.public.User, "all").mockResolvedValue([
      { id: 8, role: "USER", name: "Current user" },
      { id: 3, role: "ADMIN", name: "Admin" },
      { id: 4, role: "USER", name: "Other user" },
    ] as never);

    const documents = await getDocumentsAccessibleToUser(8);
    expect(documents.map((document) => document.id)).toEqual([1, 2, 4]);
    expect(documents[1]).toMatchObject({ uploaderName: "Admin", uploaderRole: "ADMIN", isAvailableToUser: true });
  });

  it("allows users to view completed documents uploaded by other users", async () => {
    const completed = { id: 14, userId: 4, status: "COMPLETED" };
    vi.spyOn(db.orm.public.User, "where").mockReturnValue(db.orm.public.User);
    vi.spyOn(db.orm.public.User, "first").mockResolvedValue({ id: 8, role: "USER" } as never);
    vi.spyOn(db.orm.public.Document, "where").mockReturnValue(db.orm.public.Document);
    vi.spyOn(db.orm.public.Document, "first").mockResolvedValue(completed as never);
    await expect(getAccessibleDocumentById(14, 8)).resolves.toBe(completed);
  });
});
