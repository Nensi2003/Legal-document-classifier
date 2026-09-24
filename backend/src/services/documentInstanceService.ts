import { db } from "@/prisma/db";
import { parseDocument } from "@/parsers/documentParser";

async function getDocumentAndInstance(
  documentId: number,
  instanceId: number,
  userId: number
) {
  const document =
    await db.orm.public.Document
      .where({
        id: documentId,
        userId,
      })
      .first();

  if (!document) {
    throw new Error("Document not found");
  }

  if (document.status !== "REVIEW") {
  throw new Error(
    "Document boundaries can only be edited during review"
  );
}

  const instance =
    await db.orm.public.DocumentInstance
      .where({
        id: instanceId,
        documentId,
      })
      .first();

  if (!instance) {
    throw new Error("Document instance not found");
  }

  return { document, instance };
}

async function getParsedPages(
  filePath: string,
  mimeType: string
) {
  if (mimeType !== "application/pdf") {
    throw new Error(
      "Boundary editing is currently supported only for PDF documents"
    );
  }

  const parsedDocument = await parseDocument(filePath, mimeType);

  if (!parsedDocument.pages || parsedDocument.pages.length === 0) {
    throw new Error("Document does not contain page-level text");
  }

  return parsedDocument.pages;
}

function getTextForPageRange(
  pages: Array<{ pageNumber: number; text: string }>,
  startPage: number,
  endPage: number
) {
  return pages
    .filter(
      (page) =>
        page.pageNumber >= startPage &&
        page.pageNumber <= endPage
    )
    .map((page) => page.text)
    .filter((text) => text.trim().length > 0)
    .join("\n\n");
}

/**
 * Update the page range of an existing instance.
 */
export async function updateDocumentInstanceBoundary(
  documentId: number,
  instanceId: number,
  userId: number,
  startPage: number,
  endPage: number
) {
  const { document, instance } =
    await getDocumentAndInstance(
      documentId,
      instanceId,
      userId
    );

  if (
    !Number.isInteger(startPage) ||
    !Number.isInteger(endPage) ||
    startPage < 1 ||
    endPage < startPage
  ) {
    throw new Error("Invalid page range");
  }

  const pages = await getParsedPages(
    document.filePath,
    document.mimeType
  );

  const totalPages = pages.length;

  if (endPage > totalPages) {
    throw new Error(
      `Invalid page range. Document contains ${totalPages} pages`
    );
  }

  const extractedText = getTextForPageRange(
    pages,
    startPage,
    endPage
  );

  const updatedInstance =
    await db.orm.public.DocumentInstance
      .where({
        id: instance.id,
        documentId,
      })
      .update({
        startPage,
        endPage,
        extractedText,
      });

  if (!updatedInstance) {
    throw new Error("Failed to update document instance");
  }

  return updatedInstance;
}

/**
 * Split one instance into two instances.
 *
 * Example:
 *   Instance 1 → pages 1–6
 *
 * splitPage = 3
 *
 *   Instance 1 → pages 1–3
 *   Instance 2 → pages 4–6
 */
export async function splitDocumentInstance(
  documentId: number,
  instanceId: number,
  userId: number,
  splitPage: number
) {
  const { document, instance } =
    await getDocumentAndInstance(
      documentId,
      instanceId,
      userId
    );

  if (!Number.isInteger(splitPage)) {
    throw new Error("Invalid split page");
  }

  if (
    splitPage < instance.startPage ||
    splitPage >= instance.endPage
  ) {
    throw new Error(
      "Split page must be inside the document instance range"
    );
  }

  const pages = await getParsedPages(
    document.filePath,
    document.mimeType
  );

  const totalPages = pages.length;

  if (instance.endPage > totalPages) {
    throw new Error(
      `Invalid instance range. Document contains ${totalPages} pages`
    );
  }

  const firstStartPage = instance.startPage;
  const firstEndPage = splitPage;

  const secondStartPage = splitPage + 1;
  const secondEndPage = instance.endPage;

  const firstExtractedText = getTextForPageRange(
    pages,
    firstStartPage,
    firstEndPage
  );

  const secondExtractedText = getTextForPageRange(
    pages,
    secondStartPage,
    secondEndPage
  );

  /*
   * Keep the original instance as the first half.
   * This means existing references to its ID remain valid.
   */
  const updatedFirstInstance =
    await db.orm.public.DocumentInstance
      .where({
        id: instance.id,
        documentId,
      })
      .update({
        startPage: firstStartPage,
        endPage: firstEndPage,
        extractedText: firstExtractedText,
      });

  if (!updatedFirstInstance) {
    throw new Error("Failed to update first split instance");
  }

  /*
   * Create the second half as a new instance.
   */
  const secondInstance =
  await db.orm.public.DocumentInstance.create({
    documentId,
    position: instance.position + 1,
    startPage: secondStartPage,
    endPage: secondEndPage,
    detectionMethod: "MANUAL_SPLIT",
    detectionScore: null,
    extractedText: secondExtractedText,
    status: "DRAFT",
  });

  /*
   * Re-number all instances so the order remains:
   *
   * 1, 2, 3, 4...
   */
  const instances =
    await db.orm.public.DocumentInstance
      .where({ documentId })
      .all();

  const sortedInstances = instances.sort(
    (a, b) => {
      if (a.startPage !== b.startPage) {
        return a.startPage - b.startPage;
      }

      return a.id - b.id;
    }
  );

  for (let index = 0; index < sortedInstances.length; index++) {
    await db.orm.public.DocumentInstance
      .where({
        id: sortedInstances[index].id,
        documentId,
      })
      .update({
        position: index + 1,
      });
  }

  return {
    firstInstance: updatedFirstInstance,
    secondInstance,
  };
}

/**
 * Merge two adjacent instances into one.
 *
 * Example:
 *
 *   Instance 1 → pages 1–3
 *   Instance 2 → pages 4–6
 *
 * becomes:
 *
 *   Instance 1 → pages 1–6
 */
export async function mergeDocumentInstances(
  documentId: number,
  firstInstanceId: number,
  secondInstanceId: number,
  userId: number
) {
  if (firstInstanceId === secondInstanceId) {
    throw new Error("Cannot merge an instance with itself");
  }

  const { document } =
    await getDocumentAndInstance(
      documentId,
      firstInstanceId,
      userId
    );

  const firstInstance =
    await db.orm.public.DocumentInstance
      .where({
        id: firstInstanceId,
        documentId,
      })
      .first();

  const secondInstance =
    await db.orm.public.DocumentInstance
      .where({
        id: secondInstanceId,
        documentId,
      })
      .first();

  if (!firstInstance || !secondInstance) {
    throw new Error("Document instance not found");
  }

  /*
   * Make sure the first instance is actually before
   * the second instance.
   */
  const [earlier, later] =
    firstInstance.startPage <= secondInstance.startPage
      ? [firstInstance, secondInstance]
      : [secondInstance, firstInstance];

  /*
   * Only adjacent instances can be merged.
   *
   * 1–3 + 4–6 → valid
   * 1–3 + 5–6 → invalid because page 4 is uncovered
   */
  if (earlier.endPage + 1 !== later.startPage) {
    throw new Error(
      "Only adjacent document instances can be merged"
    );
  }

  const pages = await getParsedPages(
    document.filePath,
    document.mimeType
  );

  const mergedStartPage = earlier.startPage;
  const mergedEndPage = later.endPage;

  const mergedExtractedText = getTextForPageRange(
    pages,
    mergedStartPage,
    mergedEndPage
  );

  /*
   * Keep the earlier instance.
   *
   * This preserves its ID.
   */
  const updatedInstance =
    await db.orm.public.DocumentInstance
      .where({
        id: earlier.id,
        documentId,
      })
      .update({
        startPage: mergedStartPage,
        endPage: mergedEndPage,
        extractedText: mergedExtractedText,
      });

  if (!updatedInstance) {
    throw new Error("Failed to update merged instance");
  }

  /*
   * Delete the later instance.
   */
  await db.orm.public.DocumentInstance
    .where({
      id: later.id,
      documentId,
    })
    .delete();

  /*
   * Re-number the remaining instances.
   */
  const instances =
    await db.orm.public.DocumentInstance
      .where({ documentId })
      .all();

  const sortedInstances = instances.sort(
    (a, b) => {
      if (a.startPage !== b.startPage) {
        return a.startPage - b.startPage;
      }

      return a.id - b.id;
    }
  );

  for (let index = 0; index < sortedInstances.length; index++) {
    await db.orm.public.DocumentInstance
      .where({
        id: sortedInstances[index].id,
        documentId,
      })
      .update({
        position: index + 1,
      });
  }

  return {
    instance: updatedInstance,
  };
}