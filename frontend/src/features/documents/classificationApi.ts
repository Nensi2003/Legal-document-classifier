export interface ClassificationSuggestion {
  documentTypeId: number;
  documentType: string;
  domain: string;
  score: number;
  matchedKeywords: string[];
}

export async function getClassificationSuggestions(
  documentId: number
): Promise<ClassificationSuggestion[]> {
  const response = await fetch(
    `http://localhost:3000/api/documents/${documentId}/classification`,
    {
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error(
      "Failed to classify document"
    );
  }

  const result = await response.json();

  return result.suggestions;
}