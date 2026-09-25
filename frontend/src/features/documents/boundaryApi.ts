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
  draftData?: Record<string, unknown> | null;
  generatedJSON?: unknown;
}

interface GetInstancesResponse {
  instances: DocumentInstance[];
}

interface InstanceResponse {
  instance: DocumentInstance;
}

interface SplitResponse {
  message: string;
  instances: DocumentInstance[];
}

interface MergeResponse {
  message: string;
  instance: DocumentInstance;
}

async function handleResponse<T>(
  response: Response,
  fallbackMessage: string
): Promise<T> {
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error ?? fallbackMessage);
  }

  return result;
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

  const result = await handleResponse<GetInstancesResponse>(
    response,
    "Failed to load document instances"
  );

  return result.instances;
}

export async function updateInstanceBoundary(
  documentId: number,
  instanceId: number,
  startPage: number,
  endPage: number
): Promise<DocumentInstance> {
  const response = await fetch(
    `http://localhost:3000/api/documents/${documentId}/instances/${instanceId}/boundary`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        startPage,
        endPage,
      }),
    }
  );

  const result = await handleResponse<InstanceResponse>(
    response,
    "Failed to update document boundary"
  );

  return result.instance;
}

export async function splitDocumentInstance(
  documentId: number,
  instanceId: number,
  splitPage: number
): Promise<DocumentInstance[]> {
  const response = await fetch(
    `http://localhost:3000/api/documents/${documentId}/instances/${instanceId}/split`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        splitPage,
      }),
    }
  );

  const result = await handleResponse<SplitResponse>(
    response,
    "Failed to split document instance"
  );

  return result.instances;
}

export async function mergeDocumentInstances(
  documentId: number,
  firstInstanceId: number,
  secondInstanceId: number
): Promise<DocumentInstance> {
  const response = await fetch(
    `http://localhost:3000/api/documents/${documentId}/instances/merge`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        firstInstanceId,
        secondInstanceId,
      }),
    }
  );

  const result = await handleResponse<MergeResponse>(
    response,
    "Failed to merge document instances"
  );

  return result.instance;
}