export interface DocumentType {
  id: number;
  name: string;
  domain: string;
  description?: string | null;
  jsonSchema: unknown;
  documentTypeVersionId?: number | null;
  versionNumber?: number | null;
  versionStatus?: string | null;
  activeVersion?: { id: number; versionNumber: number; status: string } | null;
  draftVersion?: { id: number; versionNumber: number; status: string } | null;
}

export interface Field {
  id: number;
  name: string;
  type: string;
  required: boolean;
  validationRule?: string | null;
  documentTypeId: number;
}

export async function getDocumentTypes(): Promise<DocumentType[]> {
  const response = await fetch(
    "http://localhost:3000/api/document-types",
    {
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch document types");
  }

  return response.json();
}

export async function getDocumentTypeById(
  id: number,
  versionId?: number | null,
  includeDraft = false,
): Promise<DocumentType> {
  const query = new URLSearchParams();
  if (versionId) query.set("versionId", String(versionId));
  if (includeDraft) query.set("includeDraft", "true");
  const suffix = query.size ? `?${query.toString()}` : "";
  const response = await fetch(
    `http://localhost:3000/api/document-types/${id}${suffix}`,
    {
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch document type");
  }

  return response.json();
}

export async function publishDocumentTypeVersion(documentTypeId: number, versionId: number) {
  const response = await fetch(
    `http://localhost:3000/api/document-types/${documentTypeId}/versions/${versionId}/publish`,
    { method: "POST", credentials: "include" },
  );
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Failed to publish template version");
  return result;
}

export async function createDocumentType(data: {
  name: string;
  domain: string;
  description?: string;
  jsonSchema: unknown;
}): Promise<DocumentType> {
  const response = await fetch(
    "http://localhost:3000/api/document-types",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ?? "Failed to create template"
    );
  }

  return result;
}

export async function updateDocumentType(
  id: number,
  data: {
    name?: string;
    domain?: string;
    description?: string;
    jsonSchema?: unknown;
  }
): Promise<DocumentType> {
  const response = await fetch(
    `http://localhost:3000/api/document-types/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ?? "Failed to update template"
    );
  }

  return result;
}


export async function deleteDocumentType(
  id: number
): Promise<void> {
  const response = await fetch(
    `http://localhost:3000/api/document-types/${id}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ?? "Failed to delete template"
    );
  }
}

export async function getFields(
  documentTypeId: number,
  versionId?: number | null,
): Promise<Field[]> {
  const query = versionId ? `?versionId=${encodeURIComponent(versionId)}` : "";
  const response = await fetch(
    `http://localhost:3000/api/document-types/${documentTypeId}/fields${query}`,
    {
      credentials: "include",
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ?? "Failed to load fields"
    );
  }

  return result;
}

export async function createField(data: {
  name: string;
  type: string;
  required?: boolean;
  validationRule?: string;
  documentTypeId: number;
}): Promise<Field> {
  const response = await fetch(
    `http://localhost:3000/api/document-types/${data.documentTypeId}/fields`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ?? "Failed to create field"
    );
  }

  return result;
}


export async function updateField(
  id: number,
  data: {
    name?: string;
    type?: string;
    required?: boolean;
    validationRule?: string;
  }
): Promise<Field> {
  const response = await fetch(
    `http://localhost:3000/api/fields/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ?? "Failed to update field"
    );
  }

  return result;
}

export async function deleteField(
  id: number
): Promise<void> {
  const response = await fetch(
    `http://localhost:3000/api/fields/${id}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ?? "Failed to delete field"
    );
  }
}
