export interface DocumentInstance {
  id: number;
  documentId: number;
  position: number;
  startPage: number;
  endPage: number;
  detectionMethod?: string | null;
  detectionScore?: number | null;
  extractedText?: string | null;
  status: string;
  draftData?: unknown;
  generatedJSON?: unknown;
}

interface GetInstancesResponse {
  instances: DocumentInstance[];
}

export async function getDocumentInstances(
  documentId: number
): Promise<DocumentInstance[]> {
  const response = await fetch(
    `http://localhost:3000/api/documents/${documentId}/instances`,
    {
      credentials: "include",
    }
  );

  const result: GetInstancesResponse | { error?: string } =
    await response.json();

  if (!response.ok) {
    throw new Error(
      "error" in result && result.error
        ? result.error
        : "Failed to get document instances"
    );
  }

  return (result as GetInstancesResponse).instances;
}

export async function confirmDocumentBoundaries(
  documentId: number
) {
  const response = await fetch(
    `http://localhost:3000/api/documents/${documentId}/confirm-boundaries`,
    {
      method: "POST",
      credentials: "include",
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ?? "Failed to confirm document boundaries"
    );
  }

  return result;
}
