export interface BatchDocumentResult {
  document?: {
    id: number;
    fileName: string;
    mimeType: string;
    status: string;
    parseStatus: string;
  };

  fileName?: string;
  success: boolean;
  status: string;
  error?: string;

  suggestions?: Array<{
    documentTypeId: number;
    documentType: string;
    domain: string;
    score: number;
    matchedKeywords: string[];
  }>;
}

export interface BatchUploadResponse {
  message: string;
  total: number;
  successful: number;
  failed: number;
  results: BatchDocumentResult[];
}

export async function uploadBatch(
  files: File[]
): Promise<BatchUploadResponse> {
  const formData = new FormData();

  for (const file of files) {
    formData.append("files", file);
  }

  const response = await fetch(
    "http://localhost:3000/api/documents/batch",
    {
      method: "POST",
      credentials: "include",
      body: formData,
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ??
        "Failed to upload documents."
    );
  }

  return result;
}