import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import bcrypt from "bcryptjs";

import {
  registerUser,
  loginUser,
  createSession,
  deleteSession,
  getUserFromSession,
} from "../../services/authService";

import { db } from "../../prisma/db";

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock("../../prisma/db", () => ({
  db: {
    orm: {
      public: {
        User: {
          where: vi.fn(),
          create: vi.fn(),
        },
        Session: {
          where: vi.fn(),
          create: vi.fn(),
        },
      },
    },
  },
}));

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("registerUser", () => {
    it("registers a new user successfully", async () => {
      const first = vi.fn().mockResolvedValue(null);

      vi.mocked(db.orm.public.User.where).mockReturnValue({
        first,
      } as any);

      vi.mocked(bcrypt.hash).mockResolvedValue(
        "hashed-password" as never
      );

      vi.mocked(db.orm.public.User.create).mockResolvedValue({
        id: 1,
        email: "test@gmail.com",
        password: "hashed-password",
        name: "Test User",
        role: "USER",
      } as any);

      const result = await registerUser(
        "  TEST@GMAIL.COM ",
        "password123",
        " Test User "
      );

      expect(
        db.orm.public.User.where
      ).toHaveBeenCalledWith({
        email: "test@gmail.com",
      });

      expect(bcrypt.hash).toHaveBeenCalledWith(
        "password123",
        12
      );

      expect(
        db.orm.public.User.create
      ).toHaveBeenCalledWith({
        email: "test@gmail.com",
        password: "hashed-password",
        name: "Test User",
      });

      expect(result).toEqual({
        id: 1,
        email: "test@gmail.com",
        name: "Test User",
        role: "USER",
      });
    });

    it("throws when the user already exists", async () => {
      const first = vi.fn().mockResolvedValue({
        id: 1,
        email: "test@gmail.com",
      });

      vi.mocked(db.orm.public.User.where).mockReturnValue({
        first,
      } as any);

      await expect(
        registerUser(
          "test@gmail.com",
          "password123",
          "Test User"
        )
      ).rejects.toThrow("User already exists");

      expect(
        db.orm.public.User.create
      ).not.toHaveBeenCalled();

      expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    it("uses null when the name is empty", async () => {
      const first = vi.fn().mockResolvedValue(null);

      vi.mocked(db.orm.public.User.where).mockReturnValue({
        first,
      } as any);

      vi.mocked(bcrypt.hash).mockResolvedValue(
        "hashed-password" as never
      );

      vi.mocked(db.orm.public.User.create).mockResolvedValue({
        id: 2,
        email: "test@gmail.com",
        password: "hashed-password",
        name: null,
        role: "USER",
      } as any);

      await registerUser(
        "test@gmail.com",
        "password123",
        "   "
      );

      expect(
        db.orm.public.User.create
      ).toHaveBeenCalledWith({
        email: "test@gmail.com",
        password: "hashed-password",
        name: null,
      });
    });
  });

  describe("loginUser", () => {
    it("logs in successfully with valid credentials", async () => {
      const user = {
        id: 1,
        email: "test@gmail.com",
        password: "hashed-password",
        name: "Test User",
        role: "USER",
      };

      const first = vi.fn().mockResolvedValue(user);

      vi.mocked(db.orm.public.User.where).mockReturnValue({
        first,
      } as any);

      vi.mocked(bcrypt.compare).mockResolvedValue(
        true as never
      );

      const result = await loginUser(
        " TEST@GMAIL.COM ",
        "password123"
      );

      expect(
        db.orm.public.User.where
      ).toHaveBeenCalledWith({
        email: "test@gmail.com",
      });

      expect(bcrypt.compare).toHaveBeenCalledWith(
        "password123",
        "hashed-password"
      );

      expect(result).toEqual(user);
    });

    it("throws when the user does not exist", async () => {
      const first = vi.fn().mockResolvedValue(null);

      vi.mocked(db.orm.public.User.where).mockReturnValue({
        first,
      } as any);

      await expect(
        loginUser(
          "unknown@gmail.com",
          "password123"
        )
      ).rejects.toThrow(
        "Invalid email or password"
      );

      expect(
        bcrypt.compare
      ).not.toHaveBeenCalled();
    });

    it("throws when the password is incorrect", async () => {
      const user = {
        id: 1,
        email: "test@gmail.com",
        password: "hashed-password",
        name: "Test User",
        role: "USER",
      };

      const first = vi.fn().mockResolvedValue(user);

      vi.mocked(db.orm.public.User.where).mockReturnValue({
        first,
      } as any);

      vi.mocked(bcrypt.compare).mockResolvedValue(
        false as never
      );

      await expect(
        loginUser(
          "test@gmail.com",
          "wrong-password"
        )
      ).rejects.toThrow(
        "Invalid email or password"
      );
    });
  });

  describe("createSession", () => {
    it("creates a session successfully", async () => {
      const sessionCreate = vi.fn().mockResolvedValue({
        id: "session-id",
        userId: 1,
      });

      vi.mocked(
        db.orm.public.Session.create
      ).mockImplementation(
        sessionCreate as any
      );

      const result = await createSession(1);

      expect(result.sessionId).toBeDefined();
      expect(result.expiresAt).toBeDefined();

      expect(sessionCreate).toHaveBeenCalledTimes(1);

      expect(sessionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          userId: 1,
          expiresAt: expect.any(String),
        })
      );

      expect(
        new Date(result.expiresAt).getTime()
      ).toBeGreaterThan(Date.now());
    });
  });

  describe("deleteSession", () => {
    it("deletes the requested session", async () => {
      const deleteMock = vi.fn().mockResolvedValue({
        id: "session-123",
      });

      const whereMock = vi.fn().mockReturnValue({
        delete: deleteMock,
      });

      vi.mocked(
        db.orm.public.Session.where
      ).mockImplementation(
        whereMock as any
      );

      await deleteSession("session-123");

      expect(whereMock).toHaveBeenCalledWith({
        id: "session-123",
      });

      expect(deleteMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("getUserFromSession", () => {
    it("returns the user for a valid session", async () => {
      const session = {
        id: "session-123",
        userId: 1,
        expiresAt: new Date(
          Date.now() + 60_000
        ).toISOString(),
      };

      const user = {
        id: 1,
        email: "test@gmail.com",
        name: "Test User",
        role: "USER",
      };

      const sessionFirst = vi
        .fn()
        .mockResolvedValue(session);

      const userFirst = vi
        .fn()
        .mockResolvedValue(user);

      vi.mocked(
        db.orm.public.Session.where
      ).mockReturnValue({
        first: sessionFirst,
      } as any);

      vi.mocked(
        db.orm.public.User.where
      ).mockReturnValue({
        first: userFirst,
      } as any);

      const result =
        await getUserFromSession(
          "session-123"
        );

      expect(result).toEqual({
        id: 1,
        email: "test@gmail.com",
        name: "Test User",
        role: "USER",
      });
    });

    it("returns null when the session does not exist", async () => {
      const first = vi.fn().mockResolvedValue(null);

      vi.mocked(
        db.orm.public.Session.where
      ).mockReturnValue({
        first,
      } as any);

      const result =
        await getUserFromSession(
          "unknown-session"
        );

      expect(result).toBeNull();
    });

    it("deletes and returns null for an expired session", async () => {
  const session = {
    id: "expired-session",
    userId: 1,
    expiresAt: new Date(
      Date.now() - 60_000
    ).toISOString(),
  };

  const first = vi.fn().mockResolvedValue(session);
  const deleteMock = vi.fn().mockResolvedValue(undefined);

  vi.mocked(
    db.orm.public.Session.where
  ).mockReturnValue({
    first,
    delete: deleteMock,
  } as any);

  const result =
    await getUserFromSession(
      "expired-session"
    );

  expect(result).toBeNull();

  expect(
    db.orm.public.Session.where
  ).toHaveBeenCalledWith({
    id: "expired-session",
  });

  expect(deleteMock).toHaveBeenCalledTimes(1);
});

    it("returns null when the user no longer exists", async () => {
      const session = {
        id: "session-123",
        userId: 999,
        expiresAt: new Date(
          Date.now() + 60_000
        ).toISOString(),
      };

      const sessionFirst = vi
        .fn()
        .mockResolvedValue(session);

      const userFirst = vi
        .fn()
        .mockResolvedValue(null);

      vi.mocked(
        db.orm.public.Session.where
      ).mockReturnValue({
        first: sessionFirst,
      } as any);

      vi.mocked(
        db.orm.public.User.where
      ).mockReturnValue({
        first: userFirst,
      } as any);

      const result =
        await getUserFromSession(
          "session-123"
        );

      expect(result).toBeNull();
    });
  });
});