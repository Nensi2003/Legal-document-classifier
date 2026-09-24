const API_BASE_URL = "http://localhost:3000";

export interface DocumentInstance {
  id: number;
  documentId: number;
  position: number;
  startPage: number;
  endPage: number;
  detectionMethod: string | null;
  detectionScore: number | null;
  extractedText: string | null;
  status: string;
  draftData: Record<string, unknown> | null;
  generatedJSON: unknown | null;
}

export async function getDocumentInstances(
  documentId: number
): Promise<DocumentInstance[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/documents/${documentId}/instances`,
    {
      credentials: "include",
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ?? "Failed to get document instances"
    );
  }

  return result.instances;
}

export async function saveInstanceDraft(
  documentId: number,
  instanceId: number,
  draftData: Record<string, unknown>
) {
  const response = await fetch(
    `${API_BASE_URL}/api/documents/${documentId}/instances/${instanceId}/draft`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        draftData,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ?? "Failed to save instance draft"
    );
  }

  return result.instance;
}