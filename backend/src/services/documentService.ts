import { db } from "@/prisma/db";

export async function createDocument(data: {
  fileName: string;
  filePath: string;
  mimeType: string;
  userId: number;
}) {
  return db.orm.public.Document.create({
    fileName: data.fileName,
    filePath: data.filePath,
    mimeType: data.mimeType,
    userId: data.userId,
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
  return db.orm.public.Document
    .where({
      id,
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