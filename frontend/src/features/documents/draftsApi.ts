export interface DraftDocument {
  id: number;
  fileName: string;
  mimeType: string;
  documentTypeId?: number | null;
  status: string;
  parseStatus?: string | null;
  updatedAt?: string;
}

export async function getDraftDocuments(): Promise<
  DraftDocument[]
> {
  const response = await fetch(
    "http://localhost:3000/api/documents/drafts",
    {
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch drafts");
  }

  const result = await response.json();

  return result.drafts;
}