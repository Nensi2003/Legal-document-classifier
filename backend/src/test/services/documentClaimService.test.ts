import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../prisma/db";
import { claimDocument, DocumentClaimConflictError, releaseDocumentClaim } from "../../services/documentClaimService";

describe("document claims", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("allows only one of two simultaneous users to claim a document", async () => {
    const document: Record<string, unknown> = { id: 12, status: "AVAILABLE", activeWorkerId: null, claimExpiresAt: null };
    vi.spyOn(db.orm.public.Document, "where").mockImplementation(((query: Record<string, unknown>) => ({
      first: async () => ({ ...document }),
      update: async (patch: Record<string, unknown>) => {
        if (document.activeWorkerId !== query.activeWorkerId || document.claimExpiresAt !== query.claimExpiresAt) return null;
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
    const update = vi.fn().mockResolvedValue({ id: 12 });
    vi.spyOn(db.orm.public.Document, "where").mockReturnValue({ update } as never);
    await releaseDocumentClaim(12, 7);
    expect(db.orm.public.Document.where).toHaveBeenCalledWith({ id: 12, activeWorkerId: 7 });
    expect(update).toHaveBeenCalledWith({ activeWorkerId: null, claimExpiresAt: null });
  });

  it("does not allow completed documents to be claimed", async () => {
    vi.spyOn(db.orm.public.Document, "where").mockReturnValue({ first: vi.fn().mockResolvedValue({ id: 12, status: "COMPLETED", activeWorkerId: null, claimExpiresAt: null }) } as never);
    await expect(claimDocument(12, 2)).rejects.toBeInstanceOf(DocumentClaimConflictError);
  });
});
