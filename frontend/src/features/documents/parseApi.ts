export interface ParseDocumentResponse {
  document: {
    id: number;
    fileName: string;
    filePath: string;
    mimeType: string;
    documentTypeId?: number | null;
    status: string;
    extractedText?: string | null;
    parseStatus?: string | null;
    parseMessage?: string | null;
  };

  classification?: {
    suggestions: Array<{
      documentTypeId: number;
      documentType: string;
      domain: string;
      score: number;
      matchedKeywords: string[];
    }>;
  };
}

export async function parseDocument(
  documentId: number
): Promise<ParseDocumentResponse> {
  const response = await fetch(
    `http://localhost:3000/api/documents/${documentId}/parse`,
    {
      method: "POST",
      credentials: "include",
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ?? "Failed to parse document"
    );
  }

  return result;
}