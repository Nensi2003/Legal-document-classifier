import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  getAdminStats,
  getAdminUsers,
  getAdminDocumentTypes,
} from "../../features/admin/api";

describe("Admin API", () => {
  beforeEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

  describe("getAdminStats", () => {
  it("gets admin statistics successfully", async () => {
    const mockStats = {
      totalUsers: 10,
      totalDocuments: 25,
      totalDocumentTypes: 5,
      completedDocuments: 15,
      draftDocuments: 4,
      pendingDocuments: 6,
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        stats: mockStats,
      }),
    });

    vi.stubGlobal("fetch", mockFetch);

    const result = await getAdminStats();

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/admin/stats",
      {
        credentials: "include",
      }
    );

    expect(result).toEqual(mockStats);
  });

  it("throws when getting admin statistics fails", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    vi.stubGlobal("fetch", mockFetch);

    await expect(
      getAdminStats()
    ).rejects.toThrow(
      "Failed to load admin statistics"
    );
  });
});

  describe("getAdminUsers", () => {
    it("gets admin users successfully", async () => {
      const mockUsers = [
        {
          id: 1,
          email: "admin@gmail.com",
          name: "Admin",
          role: "ADMIN",
          createdAt: "2026-09-29T10:00:00Z",
        },
        {
          id: 2,
          email: "test@gmail.com",
          name: "Test User",
          role: "USER",
          createdAt: "2026-09-29T11:00:00Z",
        },
      ];

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            users: mockUsers,
          }),
        })
      );

      const result = await getAdminUsers();

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/admin/users",
        {
          credentials: "include",
        }
      );

      expect(result).toEqual(mockUsers);
    });

    it("throws when getting users fails", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          json: async () => ({}),
        })
      );

      await expect(
        getAdminUsers()
      ).rejects.toThrow("Failed to load users");
    });
  });

  describe("getAdminDocumentTypes", () => {
    it("gets document types successfully", async () => {
      const mockDocumentTypes = [
        {
          id: 1,
          name: "Contract",
          domain: "Legal",
          description: "Legal contract",
          createdAt: "2026-09-29T10:00:00Z",
          updatedAt: "2026-09-29T10:00:00Z",
        },
        {
          id: 2,
          name: "Invoice",
          domain: "Finance",
          description: "Financial invoice",
          createdAt: "2026-09-29T11:00:00Z",
          updatedAt: "2026-09-29T11:00:00Z",
        },
      ];

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            documentTypes: mockDocumentTypes,
          }),
        })
      );

      const result =
        await getAdminDocumentTypes();

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/admin/document-types",
        {
          credentials: "include",
        }
      );

      expect(result).toEqual(
        mockDocumentTypes
      );
    });

    it("throws when getting document types fails", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          json: async () => ({}),
        })
      );

      await expect(
        getAdminDocumentTypes()
      ).rejects.toThrow(
        "Failed to load document types"
      );
    });
  });
});