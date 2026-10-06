import { db } from "@/prisma/db";
import { getActiveDocumentTypeVersion } from "./documentTypeService";
import { getAccessibleDocumentById } from "./documentAccessService";

export async function createDocument(data: {
  fileName: string;
  filePath: string;
  mimeType: string;
  userId: number;
  batchId?: number;
  documentTypeId?: number;
  documentTypeVersionId?: number;
  status?: string;
}) {
  return db.orm.public.Document.create({
    fileName: data.fileName,
    filePath: data.filePath,
    mimeType: data.mimeType,
    userId: data.userId,
    batchId: data.batchId,
    documentTypeId: data.documentTypeId,
    documentTypeVersionId: data.documentTypeVersionId,
    status: data.status,
  });
}
export async function getDocuments(userId: number) {
  return db.orm.public.Document
    .where({ userId })
    .all();
}

export async function getDocumentById(id: number, userId: number) {
  return getAccessibleDocumentById(id, userId);
}

export async function deleteDocument(id: number, userId: number) {
  const document = await db.orm.public.Document
    .where({
      id,
      userId,
    })
    .first();

  if (!document) {
    return null;
  }

  // Delete generated JSON first because it references the document.
  await db.orm.public.GeneratedJSON
    .where({
      documentId: document.id,
    })
    .delete();
    

  // Now delete the document itself.
  return db.orm.public.Document
    .where({
      id: document.id,
      userId,
    })
    .delete();
}

/** Delete a document from the admin document-management screen. */
export async function deleteDocumentAsAdmin(id: number) {
  const document = await db.orm.public.Document
    .where({ id })
    .first();

  if (!document) return null;

  // GeneratedJSON has a restrictive relation, so remove it before the
  // document. DocumentInstance rows are removed by the document FK cascade.
  await db.orm.public.GeneratedJSON
    .where({ documentId: document.id })
    .delete();

  return db.orm.public.Document
    .where({ id: document.id })
    .delete();
}

export async function assignDocumentType(
  documentId: number,
  userId: number,
  documentTypeId: number
) {
  const version = await getActiveDocumentTypeVersion(documentTypeId);
  if (!version) throw new Error("Document type has no active version");
  const document = await getAccessibleDocumentById(documentId, userId);
  if (!document) return null;
  return db.orm.public.Document
    .where({ id: documentId })
    .update({
      documentTypeId,
      documentTypeVersionId: version.id,
    });
}
