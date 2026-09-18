export interface ValidationError {
  instancePath: string;
  schemaPath: string;
  keyword: string;
  params: Record<string, unknown>;
  message?: string;
}

export interface GenerateJSONResponse {
  valid: boolean;

  generatedJSON?: {
    id: number;
    data: unknown;
    isValid: boolean;
    documentId: number;
  };

  errors?: ValidationError[];

  error?: string;
}

export async function generateDocumentJSON(
  documentId: number,
  data: Record<string, unknown>
): Promise<GenerateJSONResponse> {
  const response = await fetch(
    `http://localhost:3000/api/documents/${documentId}/json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ data }),
    }
  );

  const result =
    await response.json();

  console.log(
    "Generate JSON response:",
    JSON.stringify(result, null, 2)
  );

  /*
   * A 400 response with `valid: false`
   * is a validation result, not a network/API failure.
   *
   * Return it to DocumentForm so it can
   * display the actual validation errors.
   */
  if (
    !response.ok &&
    !result.errors
  ) {
    throw new Error(
      result.error ??
        "Failed to generate JSON"
    );
  }

  return result;
}