export interface AdminStats {
  totalUsers: number;
  totalDocuments: number;
  totalDocumentTypes: number;
  completedDocuments: number;
  draftDocuments: number;
  pendingDocuments: number;
}

export interface AdminUser {
  id: number;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
}

export interface AdminDocumentType {
  id: number;
  name: string;
  domain: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getAdminStats(): Promise<AdminStats> {
  const response = await fetch(
    "http://localhost:3000/api/admin/stats",
    {
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to load admin statistics");
  }

  const data = await response.json();

  return data.stats;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const response = await fetch(
    "http://localhost:3000/api/admin/users",
    {
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to load users");
  }

  const data = await response.json();

  return data.users;
}

export async function getAdminDocumentTypes(): Promise<
  AdminDocumentType[]
> {
  const response = await fetch(
    "http://localhost:3000/api/admin/document-types",
    {
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to load document types");
  }

  const data = await response.json();

  return data.documentTypes;
}



export interface AdminDocument {
  id: number;
  fileName: string;
  mimeType: string;
  status: string;
  createdAt: string;
  userId: number;
  userName: string | null;
  userEmail: string | null;
  documentTypeName: string | null;
}

export async function getAdminDocuments(): Promise<
  AdminDocument[]
> {
  const response = await fetch(
    "http://localhost:3000/api/admin/documents",
    {
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to load documents");
  }

  const data = await response.json();

  return data.documents;
}