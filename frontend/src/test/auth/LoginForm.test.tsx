import { describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";

import { LoginForm } from "../../features/auth/LoginForm";
import { login } from "../../features/auth/api";

vi.mock("../../features/auth/api", () => ({
  login: vi.fn(),
}));

describe("LoginForm", () => {
  it("logs in successfully", async () => {
    const mockUser = {
      id: 1,
      email: "test@gmail.com",
      name: "Test User",
      role: "USER" as const,
    };

    vi.mocked(login).mockResolvedValue(mockUser);

    const onLogin = vi.fn();
    const onRegister = vi.fn();

    render(
      <LoginForm
        onLogin={onLogin}
        onRegister={onRegister}
      />
    );

    fireEvent.change(
      screen.getByLabelText("Email address"),
      {
        target: {
          value: "test@gmail.com",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText("Password"),
      {
        target: {
          value: "password123",
        },
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Sign in",
      })
    );

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith(
        "test@gmail.com",
        "password123"
      );

      expect(onLogin).toHaveBeenCalledWith(
        mockUser
      );
    });
  });

  it("shows an error when login fails", async () => {
    vi.mocked(login).mockRejectedValue(
      new Error("Invalid email or password")
    );

    const onLogin = vi.fn();
    const onRegister = vi.fn();

    render(
      <LoginForm
        onLogin={onLogin}
        onRegister={onRegister}
      />
    );

    fireEvent.change(
      screen.getByLabelText("Email address"),
      {
        target: {
          value: "wrong@gmail.com",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText("Password"),
      {
        target: {
          value: "wrongpassword",
        },
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Sign in",
      })
    );

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent(
      "Invalid email or password"
    );

    expect(onLogin).not.toHaveBeenCalled();
  });
});