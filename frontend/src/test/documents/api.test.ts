import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getDocumentById,
  claimDocument,
  assignDocumentType,
  uploadDocument,
  getDocuments,
  deleteDocument,
} from "../../features/documents/api";

describe("Documents API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("claims an editable document and treats another user's active claim as a view-only result", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ claimed: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Currently working: Alex" }), { status: 409 }));
    await expect(claimDocument(9)).resolves.toBe(true);
    await expect(claimDocument(9)).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/api/documents/9/claim", { method: "POST", credentials: "include" });
  });

  it("gets a document successfully", async () => {
    const mockDocument = {
      id: 1,
      fileName: "contract.pdf",
      filePath: "/uploads/contract.pdf",
      mimeType: "application/pdf",
      status: "COMPLETED",
      createdAt: "2026-09-29T10:00:00Z",
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          document: mockDocument,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    );

    const result = await getDocumentById(1);

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/documents/1",
      {
        credentials: "include",
      }
    );

    expect(result).toEqual(mockDocument);
  });

  it("throws an error when getting a document fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Document not found",
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    );

    await expect(
      getDocumentById(999)
    ).rejects.toThrow("Failed to fetch document");
  });

  it("assigns a document type successfully", async () => {
    const mockResponse = {
      success: true,
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify(mockResponse),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    );

    const result = await assignDocumentType(1, 2);

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/documents/1/document-type",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          documentTypeId: 2,
        }),
      }
    );

    expect(result).toEqual(mockResponse);
  });

  it("returns the backend error when assigning a document type fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Invalid document type",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    );

    await expect(
      assignDocumentType(1, 999)
    ).rejects.toThrow("Invalid document type");
  });

  it("uploads a document successfully", async () => {
    const mockDocument = {
      id: 10,
      fileName: "contract.pdf",
      filePath: "/uploads/contract.pdf",
      mimeType: "application/pdf",
      status: "PENDING",
      createdAt: "2026-09-29T10:00:00Z",
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          document: mockDocument,
        }),
        {
          status: 201,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    );

    const file = new File(
      ["test document"],
      "contract.pdf",
      {
        type: "application/pdf",
      }
    );

    const result = await uploadDocument(file);

    expect(fetch).toHaveBeenCalledTimes(1);

    const [url, options] = vi.mocked(fetch).mock.calls[0];

    expect(url).toBe(
      "http://localhost:3000/api/documents"
    );

    expect(options?.method).toBe("POST");
    expect(options?.credentials).toBe("include");

    expect(options?.body).toBeInstanceOf(FormData);

    expect(result).toEqual(mockDocument);
  });

  it("throws the backend error when document upload fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Unsupported file type",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    );

    const file = new File(
      ["test document"],
      "test.exe",
      {
        type: "application/octet-stream",
      }
    );

    await expect(
      uploadDocument(file)
    ).rejects.toThrow("Unsupported file type");
  });

  it("gets all documents successfully", async () => {
    const mockDocuments = [
      {
        id: 1,
        fileName: "contract.pdf",
        filePath: "/uploads/contract.pdf",
        mimeType: "application/pdf",
        status: "COMPLETED",
        createdAt: "2026-09-29T10:00:00Z",
      },
      {
        id: 2,
        fileName: "invoice.pdf",
        filePath: "/uploads/invoice.pdf",
        mimeType: "application/pdf",
        status: "PENDING",
        createdAt: "2026-09-29T11:00:00Z",
      },
    ];

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          documents: mockDocuments,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    );

    const result = await getDocuments();

    expect(result).toEqual(mockDocuments);
  });

  it("throws an error when getting documents fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Unauthorized",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    );

    await expect(
      getDocuments()
    ).rejects.toThrow("Unauthorized");
  });

  it("deletes a document successfully", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    );

    await deleteDocument(5);

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/documents/5",
      {
        method: "DELETE",
        credentials: "include",
      }
    );
  });

  it("throws the backend error when deleting a document fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Document not found",
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    );

    await expect(
      deleteDocument(999)
    ).rejects.toThrow("Document not found");
  });
});
