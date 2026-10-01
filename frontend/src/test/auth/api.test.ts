import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  login,
  register,
  getCurrentUser,
  logout,
} from "../../features/auth/api";

describe("Auth API", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("login", () => {
    it("logs in successfully", async () => {
      const mockUser = {
        id: 1,
        email: "test@gmail.com",
        name: "Test User",
        role: "USER" as const,
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            user: mockUser,
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
      );

      const result = await login(
        "test@gmail.com",
        "password123"
      );

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email: "test@gmail.com",
            password: "password123",
          }),
        }
      );

      expect(result).toEqual(mockUser);
    });

    it("throws the backend error when login fails", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            error: "Invalid email or password",
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
        login("wrong@gmail.com", "wrongpassword")
      ).rejects.toThrow("Invalid email or password");
    });
  });

  describe("register", () => {
    it("registers successfully", async () => {
      const mockUser = {
        id: 2,
        email: "new@gmail.com",
        name: "New User",
        role: "USER" as const,
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            user: mockUser,
          }),
          {
            status: 201,
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
      );

      const result = await register(
        "new@gmail.com",
        "password123",
        "New User"
      );

      expect(result).toEqual(mockUser);
    });

    it("throws the backend error when registration fails", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            error: "User already exists",
          }),
          {
            status: 409,
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
      );

      await expect(
        register(
          "existing@gmail.com",
          "password123",
          "Existing User"
        )
      ).rejects.toThrow("User already exists");
    });
  });

  describe("getCurrentUser", () => {
    it("returns the current user when authenticated", async () => {
      const mockUser = {
        id: 1,
        email: "test@gmail.com",
        name: "Test User",
        role: "USER" as const,
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            user: mockUser,
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
      );

      const result = await getCurrentUser();

      expect(result).toEqual(mockUser);
    });

    it("returns null when the user is not authenticated", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(null, {
          status: 401,
        })
      );

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    it("throws when authentication check fails", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            error: "Server error",
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
      );

      await expect(
        getCurrentUser()
      ).rejects.toThrow(
        "Failed to check authentication"
      );
    });
  });

  describe("logout", () => {
    it("logs out successfully", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(null, {
          status: 200,
        })
      );

      await expect(logout()).resolves.toBeUndefined();

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/auth/logout",
        {
          method: "POST",
          credentials: "include",
        }
      );
    });

    it("throws when logout fails", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(null, {
          status: 500,
        })
      );

      await expect(logout()).rejects.toThrow(
        "Logout failed"
      );
    });
  });
});