import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../prisma/db";
import { assertDocumentClaim, claimDocument, DocumentClaimConflictError, releaseDocumentClaim, renewDocumentClaim } from "../../services/documentClaimService";

describe("document claims", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("allows only one of two simultaneous users to claim a document", async () => {
    const document: Record<string, unknown> = { id: 12, status: "DRAFT", activeWorkerId: null, claimExpiresAt: null, draftData: { firstName: "Saved" } };
    vi.spyOn(db.orm.public.Document, "where").mockImplementation(((query: Record<string, unknown>) => ({
      first: async () => ({ ...document }),
      update: async (patch: Record<string, unknown>) => {
        if (document.status !== query.status || document.activeWorkerId !== query.activeWorkerId || document.claimExpiresAt !== query.claimExpiresAt) return null;
        Object.assign(document, patch);
        return { ...document };
      },
    })) as never);
    vi.spyOn(db.orm.public.User, "where").mockReturnValue(db.orm.public.User);
    vi.spyOn(db.orm.public.User, "first").mockResolvedValue({ name: "Ada" } as never);

    const results = await Promise.allSettled([claimDocument(12, 1), claimDocument(12, 2)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejection = results.find((result) => result.status === "rejected");
    expect(rejection?.status === "rejected" && rejection.reason).toBeInstanceOf(DocumentClaimConflictError);
  });

  it("releases only the current worker's claim", async () => {
    const document: Record<string, unknown> = { id: 12, status: "DRAFT", activeWorkerId: 7, claimExpiresAt: "2030-01-01T00:00:00.000Z", draftData: { firstName: "Saved" } };
    const update = vi.fn().mockImplementation(async (patch) => { Object.assign(document, patch); return { ...document }; });
    vi.spyOn(db.orm.public.Document, "where").mockReturnValue({ update } as never);
    await releaseDocumentClaim(12, 7);
    expect(db.orm.public.Document.where).toHaveBeenCalledWith({ id: 12, activeWorkerId: 7 });
    expect(update).toHaveBeenCalledWith({ activeWorkerId: null, claimExpiresAt: null });
    expect(document).toMatchObject({ status: "DRAFT", draftData: { firstName: "Saved" }, activeWorkerId: null });
  });

  it("does not allow completed documents to be claimed", async () => {
    vi.spyOn(db.orm.public.Document, "where").mockReturnValue({ first: vi.fn().mockResolvedValue({ id: 12, status: "COMPLETED", activeWorkerId: null, claimExpiresAt: null }) } as never);
    await expect(claimDocument(12, 2)).rejects.toBeInstanceOf(DocumentClaimConflictError);
  });

  it("allows editing only for the current owner of a live claim", async () => {
    const activeDocument = {
      id: 12,
      status: "DRAFT",
      activeWorkerId: 7,
      claimExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    };
    vi.spyOn(db.orm.public.Document, "where").mockReturnValue({ first: vi.fn().mockResolvedValue(activeDocument) } as never);

    await expect(assertDocumentClaim(12, 7)).resolves.toEqual({ allowed: true });
    await expect(assertDocumentClaim(12, 8)).resolves.toMatchObject({ allowed: false, status: 403 });
  });

  it("rejects edits to completed or expired documents", async () => {
    const completedDocument = { id: 12, status: "COMPLETED", activeWorkerId: 7, claimExpiresAt: new Date(Date.now() + 60_000).toISOString() };
    const expiredDocument = { id: 12, status: "DRAFT", activeWorkerId: 7, claimExpiresAt: new Date(Date.now() - 1_000).toISOString() };
    const first = vi.fn()
      .mockResolvedValueOnce(completedDocument)
      .mockResolvedValueOnce(expiredDocument);
    vi.spyOn(db.orm.public.Document, "where").mockReturnValue({ first } as never);

    await expect(assertDocumentClaim(12, 7)).resolves.toMatchObject({ allowed: false, status: 409 });
    await expect(assertDocumentClaim(12, 7)).resolves.toMatchObject({ allowed: false, status: 403 });
  });

  it("renews only a live claim owned by the same user and never reacquires a released claim", async () => {
    const document: Record<string, unknown> = {
      id: 12,
      status: "DRAFT",
      activeWorkerId: 7,
      claimExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    };
    const update = vi.fn().mockImplementation(async (patch) => {
      Object.assign(document, patch);
      return { ...document };
    });
    vi.spyOn(db.orm.public.Document, "where").mockImplementation(((query: Record<string, unknown>) => ({
      first: async () => ({ ...document }),
      update: async (patch: Record<string, unknown>) => {
        if (document.activeWorkerId !== query.activeWorkerId || document.claimExpiresAt !== query.claimExpiresAt) return null;
        return update(patch);
      },
    })) as never);

    await expect(renewDocumentClaim(12, 7)).resolves.toBe(true);
    expect(update).toHaveBeenCalledOnce();
    document.activeWorkerId = null;
    document.claimExpiresAt = null;
    await expect(renewDocumentClaim(12, 7)).resolves.toBe(false);
  });
});
