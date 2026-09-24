import { db } from "@/prisma/db";

export async function createDocument(data: {
  fileName: string;
  filePath: string;
  mimeType: string;
  userId: number;
  batchId?: number;
}) {
  return db.orm.public.Document.create({
    fileName: data.fileName,
    filePath: data.filePath,
    mimeType: data.mimeType,
    userId: data.userId,
    batchId: data.batchId,
  });
}
export async function getDocuments(userId: number) {
  return db.orm.public.Document
    .where({ userId })
    .all();
}

export async function getDocumentById(id: number, userId: number) {
  return db.orm.public.Document
    .where({
      id,
      userId,
    })
    .first();
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

export async function assignDocumentType(
  documentId: number,
  userId: number,
  documentTypeId: number
) {
  return db.orm.public.Document
    .where({
      id: documentId,
      userId,
    })
    .update({
      documentTypeId,
    });
}