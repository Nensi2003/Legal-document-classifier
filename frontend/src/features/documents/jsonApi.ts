export interface ValidationError {
  instancePath: string;
  schemaPath: string;
  keyword: string;
  params: Record<string, unknown>;
  message?: string;
}

export interface CombinedValidationError {
  instanceId: number;
  errors: ValidationError[];
}

export interface GeneratedJSON {
  id: number;
  data: unknown;
  isValid: boolean;
  documentId: number;
}

export interface GenerateJSONResponse {
  valid: boolean;
  generatedJSON?: GeneratedJSON;
  errors?: ValidationError[] | CombinedValidationError[];
  error?: string;
}

export interface GenerateInstanceJSONResponse {
  valid: boolean;

  instance?: {
    id: number;
    documentId: number;
    position: number;
    startPage: number;
    endPage: number;
    status: string;
    draftData: unknown;
    generatedJSON: unknown;
  };

  errors?: ValidationError[];
  error?: string;
}

/**
 * Generate JSON for one specific document instance.
 */
export async function generateInstanceJSON(
  documentId: number,
  instanceId: number
): Promise<GenerateInstanceJSONResponse> {
  const response = await fetch(
    `http://localhost:3000/api/documents/${documentId}/instances/${instanceId}/json`,
    {
      method: "POST",
      credentials: "include",
    }
  );

  const result = await response.json();

  console.log(
    "Generate instance JSON response:",
    JSON.stringify(result, null, 2)
  );

  if (!response.ok && !result.errors) {
    throw new Error(
      result.error ??
        "Failed to generate instance JSON"
    );
  }

  return result;
}

/**
 * Generate JSON for the current document.
 *
 * Backend decides whether this is:
 * - a single-document JSON generation, or
 * - combined JSON for multiple instances.
 */
export async function generateCombinedJSON(
  documentId: number
): Promise<GenerateJSONResponse> {
  const response = await fetch(
    `http://localhost:3000/api/documents/${documentId}/json`,
    {
      method: "POST",
      credentials: "include",
    }
  );

  const result = await response.json();

  console.log(
    "Generate combined/document JSON response:",
    JSON.stringify(result, null, 2)
  );

  if (!response.ok && !result.errors) {
    throw new Error(
      result.error ??
        "Failed to generate JSON"
    );
  }

  return result;
}

/**
 * Backwards-compatible name for single-document JSON generation.
 */
export const generateDocumentJSON =
  generateCombinedJSON;