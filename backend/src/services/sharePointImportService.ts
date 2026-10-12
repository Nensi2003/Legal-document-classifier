import path from "node:path";
import { db } from "@/prisma/db";
import { publishAvailableEvent } from "@/realtime/publisher";
import { createDocument } from "@/services/documentService";
import {
  createSharePointReferenceForItem,
  getConfiguredSharePointDriveId,
  getSharePointIdentity,
  isSharePointConfigured,
  listSharePointInboxFiles,
} from "@/lib/sharePointStorage";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MIME_TYPES_BY_EXTENSION: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".csv": "text/csv",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

function resolveUploaderEmail(item: { createdBy?: { user?: { id?: string; email?: string } } }): string | null {
  const providedEmail = item.createdBy?.user?.email?.trim().toLowerCase();
  if (providedEmail) return providedEmail;

  const objectId = item.createdBy?.user?.id;
  const mappingSource = process.env.SHAREPOINT_USER_MAP;
  if (!objectId || !mappingSource) return null;
  try {
    const mapping = JSON.parse(mappingSource) as Record<string, unknown>;
    const mappedEmail = mapping[objectId];
    return typeof mappedEmail === "string" ? mappedEmail.trim().toLowerCase() : null;
  } catch {
    console.warn("SHAREPOINT_USER_MAP is not valid JSON; uploader ID mapping was skipped.");
    return null;
  }
}

type ImportLock = typeof globalThis & { __sharePointImportPromise?: Promise<number> };

/**
 * Import direct uploads from the configured SharePoint inbox into the app's
 * existing available-document queue. SharePoint content stays in SharePoint;
 * Postgres stores a stable file reference in Document.filePath.
 */
export async function importSharePointInboxDocuments(): Promise<number> {
  if (!isSharePointConfigured()) return 0;
  const lock = globalThis as ImportLock;
  if (lock.__sharePointImportPromise) return lock.__sharePointImportPromise;

  const run = importSharePointInboxDocumentsOnce();
  lock.__sharePointImportPromise = run;
  try {
    return await run;
  } finally {
    if (lock.__sharePointImportPromise === run) delete lock.__sharePointImportPromise;
  }
}

async function importSharePointInboxDocumentsOnce(): Promise<number> {
  const driveId = getConfiguredSharePointDriveId();
  if (!driveId) return 0;

  const [items, existingDocuments] = await Promise.all([
    listSharePointInboxFiles(),
    db.orm.public.Document.all(),
  ]);
  const knownItems = new Set(existingDocuments
    .map((document) => getSharePointIdentity(document.filePath))
    .filter((identity): identity is string => identity !== null));
  let imported = 0;
  const skipped: string[] = [];

  for (const item of items) {
    if (!item.id || !item.name || !item.file) continue;
    const identity = `${driveId}:${item.id}`;
    if (knownItems.has(identity)) continue;

    const extension = path.extname(item.name).toLowerCase();
    const reportedMimeType = item.file.mimeType;
    const mimeType = reportedMimeType && Object.values(MIME_TYPES_BY_EXTENSION).includes(reportedMimeType)
      ? reportedMimeType
      : MIME_TYPES_BY_EXTENSION[extension];
    if (!mimeType || !Object.values(MIME_TYPES_BY_EXTENSION).includes(mimeType)) {
      skipped.push(`${item.name} (unsupported file type)`);
      continue;
    }
    if ((item.size ?? 0) > MAX_FILE_SIZE) {
      skipped.push(`${item.name} (larger than 10 MB)`);
      continue;
    }

    const uploaderEmail = resolveUploaderEmail(item);
    if (!uploaderEmail) {
      skipped.push(`${item.name} (SharePoint did not provide the uploader's email)`);
      continue;
    }
    const uploader = await db.orm.public.User.where({ email: uploaderEmail }).first();
    if (!uploader) {
      skipped.push(`${item.name} (uploader ${uploaderEmail} has no matching app account)`);
      continue;
    }

    const filePath = createSharePointReferenceForItem(driveId, item);
    const document = await createDocument({
      fileName: item.name,
      filePath,
      mimeType,
      userId: uploader.id,
      status: "AVAILABLE",
      createdAt: item.createdDateTime ?? new Date().toISOString(),
    });
    knownItems.add(identity);
    imported += 1;
    publishAvailableEvent(document.id, uploader.id, {
      fileName: document.fileName,
      status: "AVAILABLE",
      createdAt: document.createdAt,
    });
  }

  if (skipped.length) {
    console.warn("SharePoint inbox files skipped:", skipped);
  }
  return imported;
}
