export interface DraftResponse {
  documentId: number;
  status: string;
  draftData: Record<string, unknown> | null;
  updatedAt: string;
}

export async function getDraft(
  documentId: number
): Promise<DraftResponse> {
  const response = await fetch(
    `http://localhost:3000/api/documents/${documentId}/draft`,
    {
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch draft");
  }

  return response.json();
}

export async function saveDraft(
  documentId: number,
  draftData: Record<string, unknown>,
  expectedUpdatedAt: string
): Promise<DraftResponse> {
  const response = await fetch(
    `http://localhost:3000/api/documents/${documentId}/draft`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        draftData,
        expectedUpdatedAt,
      }),
    }
  );

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error ?? "Failed to save draft");
  }

  return response.json();
}
