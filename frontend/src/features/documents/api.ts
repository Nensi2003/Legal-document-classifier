export interface Document {
  id: number;
  fileName: string;
  filePath: string;
  mimeType: string;

  documentTypeId?: number | null;
  documentTypeVersionId?: number | null;
  documentTypeName?: string | null;
  uploaderName?: string | null;
  uploaderId?: number;
  uploaderRole?: string | null;
  activeWorkerId?: number | null;
  activeWorkerName?: string | null;
  claimExpiresAt?: string | null;
  isUploadedByCurrentUser?: boolean;
  isClaimedByCurrentUser?: boolean;

  status: string;

  extractedText?: string | null;
  parseStatus?: string | null;
  parseMessage?: string | null;

  draftData?: Record<string, unknown> | null;

  createdAt: string;
  updatedAt?: string;
}

export async function getDocumentById(
  id: number
): Promise<Document> {
  const response = await fetch(
    `http://localhost:3000/api/documents/${id}`,
    {
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch document");
  }

  const result = await response.json();

return result.document;
}

/** Claim a document before requesting processing or opening editing controls. */
export async function claimDocument(documentId: number): Promise<boolean> {
  const response = await fetch(`http://localhost:3000/api/documents/${documentId}/claim`, {
    method: "POST",
    credentials: "include",
  });
  const result = await response.json();
  if (response.status === 409) return false;
  if (!response.ok) throw new Error(result.error ?? "Failed to claim document");
  return true;
}

/** Release this user's claim when leaving the processing workspace. */
export async function releaseDocumentClaim(documentId: number): Promise<void> {
  const response = await fetch(`http://localhost:3000/api/documents/${documentId}/claim`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error ?? "Failed to release document claim");
  }
}

export async function assignDocumentType(
  documentId: number,
  documentTypeId: number
) {
  const response = await fetch(
    `http://localhost:3000/api/documents/${documentId}/document-type`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        documentTypeId,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ??
        "Failed to assign document type"
    );
  }

  return result;
}

export async function uploadDocument(
  file: File,
  documentTypeId?: number,
): Promise<Document> {
  const formData = new FormData();

  formData.append("file", file);
  if (documentTypeId) formData.append("documentTypeId", String(documentTypeId));

  const response = await fetch(
    "http://localhost:3000/api/documents",
    {
      method: "POST",
      credentials: "include",
      body: formData,
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ?? "Failed to upload document."
    );
  }

  return result.document ?? result;
}

export async function getDocuments(): Promise<Document[]> {
  const response = await fetch(
    "http://localhost:3000/api/documents",
    {
      credentials: "include",
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ??
        "Failed to load documents."
    );
  }

  return result.documents;
}


export async function deleteDocument(
  documentId: number
): Promise<void> {
  const response = await fetch(
    `http://localhost:3000/api/documents/${documentId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ?? "Failed to delete document."
    );
  }
}
