import { db } from "@/prisma/db";

/**
 * Ordinary users can work on their own documents and admin-published
 * documents. Admin accounts publish and manage uploads but do not process
 * them through the user document workspace.
 */
export async function getAccessibleDocumentById(documentId: number, userId: number) {
  const requester = await db.orm.public.User.where({ id: userId }).first();
  if (!requester || requester.role === "ADMIN") return null;

  const document = await db.orm.public.Document.where({ id: documentId }).first();
  if (!document) return null;
  if (document.userId === userId || document.status === "COMPLETED") return document;

  const uploader = await db.orm.public.User.where({ id: document.userId }).first();
  return uploader?.role === "ADMIN" ? document : null;
}

export async function getDocumentsAccessibleToUser(userId: number) {
  const [documents, users] = await Promise.all([
    db.orm.public.Document.all(),
    db.orm.public.User.all(),
  ]);
  const uploaderById = new Map(users.map((user) => [user.id, user]));

  const isAdmin = uploaderById.get(userId)?.role === "ADMIN";
  return documents
    .filter((document) => !isAdmin && (document.userId === userId || uploaderById.get(document.userId)?.role === "ADMIN" || document.status === "COMPLETED"))
    .map((document) => ({
      ...document,
      uploaderName: uploaderById.get(document.userId)?.name ?? null,
      uploaderId: document.userId,
      uploaderRole: uploaderById.get(document.userId)?.role ?? null,
      isUploadedByCurrentUser: document.userId === userId,
      isAvailableToUser: document.userId !== userId && uploaderById.get(document.userId)?.role === "ADMIN",
      activeWorkerName: document.activeWorkerId == null || !document.claimExpiresAt || new Date(document.claimExpiresAt).getTime() <= Date.now() ? null : uploaderById.get(document.activeWorkerId)?.name ?? null,
      isClaimedByCurrentUser: document.activeWorkerId === userId && document.claimExpiresAt != null && new Date(document.claimExpiresAt).getTime() > Date.now(),
    }));
}
