import { db } from "@/prisma/db";

const CLAIM_TTL_MS = 90_000;

export class DocumentClaimConflictError extends Error {
  constructor(public readonly workerName: string | null) {
    super(workerName ? `Currently working: ${workerName}` : "This document is currently being worked on by another user.");
  }
}

export async function claimDocument(documentId: number, userId: number) {
  const document = await db.orm.public.Document.where({ id: documentId }).first();
  if (!document) return null;
  if (document.status === "COMPLETED") throw new DocumentClaimConflictError(null);

  const now = Date.now();
  const expiresAt = new Date(now + CLAIM_TTL_MS).toISOString();
  const currentClaimExpired = !document.claimExpiresAt || new Date(document.claimExpiresAt).getTime() <= now;
  if (document.activeWorkerId != null && document.activeWorkerId !== userId && !currentClaimExpired) {
    const worker = await db.orm.public.User.where({ id: document.activeWorkerId }).first();
    throw new DocumentClaimConflictError(worker?.name ?? null);
  }

  // Compare-and-swap on the exact observed claim state makes two simultaneous
  // claims mutually exclusive at the database level.
  const updated = await db.orm.public.Document.where({
    id: documentId,
    status: document.status,
    activeWorkerId: document.activeWorkerId,
    claimExpiresAt: document.claimExpiresAt,
  }).update({ activeWorkerId: userId, claimExpiresAt: expiresAt });
  if (!updated) {
    const latest = await db.orm.public.Document.where({ id: documentId }).first();
    const worker = latest?.activeWorkerId == null ? null : await db.orm.public.User.where({ id: latest.activeWorkerId }).first();
    throw new DocumentClaimConflictError(worker?.name ?? null);
  }
  return updated;
}

export async function releaseDocumentClaim(documentId: number, userId: number) {
  return db.orm.public.Document.where({ id: documentId, activeWorkerId: userId }).update({ activeWorkerId: null, claimExpiresAt: null });
}

/** Extend an active socket claim without ever acquiring or reacquiring one. */
export async function renewDocumentClaim(documentId: number, userId: number) {
  const document = await db.orm.public.Document.where({ id: documentId }).first();
  if (
    !document ||
    document.activeWorkerId !== userId ||
    !document.claimExpiresAt ||
    new Date(document.claimExpiresAt).getTime() <= Date.now()
  ) return false;

  const updated = await db.orm.public.Document.where({
    id: documentId,
    activeWorkerId: userId,
    claimExpiresAt: document.claimExpiresAt,
  }).update({ claimExpiresAt: new Date(Date.now() + CLAIM_TTL_MS).toISOString() });
  return Boolean(updated);
}

export async function getActiveDocumentClaim(documentId: number) {
  const document = await db.orm.public.Document.where({ id: documentId }).first();
  if (!document?.activeWorkerId || !document.claimExpiresAt || new Date(document.claimExpiresAt).getTime() <= Date.now()) return null;
  const user = await db.orm.public.User.where({ id: document.activeWorkerId }).first();
  return user ? { userId: user.id, userName: user.name } : null;
}

export async function assertDocumentClaim(documentId: number, userId: number) {
  const document = await db.orm.public.Document.where({ id: documentId }).first();
  if (!document) return { allowed: false as const, status: 404, error: "Document not found" };
  if (document.status === "COMPLETED") return { allowed: false as const, status: 409, error: "Completed documents are read-only" };
  if (document.activeWorkerId !== userId || !document.claimExpiresAt || new Date(document.claimExpiresAt).getTime() <= Date.now()) {
    return { allowed: false as const, status: 403, error: "You must claim this document before editing it" };
  }
  return { allowed: true as const };
}
