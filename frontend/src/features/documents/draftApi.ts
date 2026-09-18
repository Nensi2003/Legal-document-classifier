export interface DraftResponse {
  documentId: number;
  status: string;
  draftData: Record<string, unknown> | null;
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
  draftData: Record<string, unknown>
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
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to save draft");
  }

  return response.json();
}