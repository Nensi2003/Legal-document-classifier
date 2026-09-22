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
  batchId?: number;
  error?: string;
  suggestions?: Array<{
    documentTypeId: number;
    documentType: string;
    domain: string;
    score: number;
    matchedKeywords: string[];
  }>;
}

export interface BatchDetails {
  batch: {
    id: number;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  documents: Array<{
    id: number;
    fileName: string;
    mimeType: string;
    status: string;
    parseStatus: string;
    parseMessage?: string | null;
    documentTypeId?: number | null;
    createdAt: string;
    updatedAt: string;
  }>;
}


export interface BatchListItem {
  id: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface BatchListResponse {
  batches: BatchListItem[];
}

export async function getBatch(
  batchId: number
): Promise<BatchDetails> {
  const response = await fetch(
    `http://localhost:3000/api/documents/batches/${batchId}`,
    {
      method: "GET",
      credentials: "include",
    }
  );

  const result = await response.json();

  console.log("GET BATCH RESPONSE:", {
    status: response.status,
    ok: response.ok,
    result,
  });

  if (!response.ok) {
    throw new Error(
      result.error ?? "Failed to retrieve batch."
    );
  }

  return result;
}
export interface BatchUploadResponse {
  message: string;
  batchId: number;
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



export async function getBatches(): Promise<BatchListResponse> {
  const response = await fetch(
    "http://localhost:3000/api/documents/batches",
    {
      method: "GET",
      credentials: "include",
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ?? "Failed to retrieve batches."
    );
  }

  return result;
}