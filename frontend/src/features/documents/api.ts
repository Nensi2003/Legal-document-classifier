export interface Document {
  id: number;
  fileName: string;
  filePath: string;
  mimeType: string;

  documentTypeId?: number | null;
  documentTypeName?: string | null;

  status: string;

  extractedText?: string | null;
  parseStatus?: string | null;
  parseMessage?: string | null;

  draftData?: Record<string, unknown> | null;

  createdAt: string;
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
  file: File
): Promise<Document> {
  const formData = new FormData();

  formData.append("file", file);

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