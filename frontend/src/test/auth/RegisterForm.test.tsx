import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";

import { RegisterForm } from "../../features/auth/RegisterForm";
import { register } from "../../features/auth/api";

vi.mock("../../features/auth/api", () => ({
  register: vi.fn(),
}));

describe("RegisterForm", () => {
  it("registers successfully", async () => {
    const mockUser = {
      id: 1,
      email: "test@gmail.com",
      name: "Test User",
      role: "USER" as const,
    };

    vi.mocked(register).mockResolvedValue(mockUser);

    const onRegister = vi.fn();
    const onBackToLogin = vi.fn();

    render(
      <RegisterForm
        onRegister={onRegister}
        onBackToLogin={onBackToLogin}
      />
    );

    fireEvent.change(
      screen.getByLabelText("Full name"),
      {
        target: {
          value: "Test User",
        },
      }
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

    fireEvent.change(
      screen.getByLabelText("Confirm password"),
      {
        target: {
          value: "password123",
        },
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Create account",
      })
    );

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith(
        "test@gmail.com",
        "password123",
        "Test User"
      );

      expect(onRegister).toHaveBeenCalledWith(
        mockUser
      );
    });
  });

  it("shows an error when registration fails", async () => {
    vi.mocked(register).mockRejectedValue(
      new Error("Email already exists")
    );

    const onRegister = vi.fn();
    const onBackToLogin = vi.fn();

    render(
      <RegisterForm
        onRegister={onRegister}
        onBackToLogin={onBackToLogin}
      />
    );

    fireEvent.change(
      screen.getByLabelText("Full name"),
      {
        target: {
          value: "Test User",
        },
      }
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

    fireEvent.change(
      screen.getByLabelText("Confirm password"),
      {
        target: {
          value: "password123",
        },
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Create account",
      })
    );

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent(
      "Email already exists"
    );

    expect(onRegister).not.toHaveBeenCalled();
  });

  it("shows an error when passwords do not match", async () => {
    const onRegister = vi.fn();
    const onBackToLogin = vi.fn();

    render(
      <RegisterForm
        onRegister={onRegister}
        onBackToLogin={onBackToLogin}
      />
    );

    fireEvent.change(
      screen.getByLabelText("Full name"),
      {
        target: {
          value: "Test User",
        },
      }
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

    fireEvent.change(
      screen.getByLabelText("Confirm password"),
      {
        target: {
          value: "different123",
        },
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Create account",
      })
    );

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent(
      "Passwords do not match."
    );

    expect(register).not.toHaveBeenCalled();
    expect(onRegister).not.toHaveBeenCalled();
  });

  it("shows an error when password is too short", async () => {
    const onRegister = vi.fn();
    const onBackToLogin = vi.fn();

    render(
      <RegisterForm
        onRegister={onRegister}
        onBackToLogin={onBackToLogin}
      />
    );

    fireEvent.change(
      screen.getByLabelText("Full name"),
      {
        target: {
          value: "Test User",
        },
      }
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
          value: "1234567",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText("Confirm password"),
      {
        target: {
          value: "1234567",
        },
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Create account",
      })
    );

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent(
      "Password must be at least 8 characters."
    );

    expect(register).not.toHaveBeenCalled();
  });

  it("calls onBackToLogin when Sign in is clicked", () => {
    const onRegister = vi.fn();
    const onBackToLogin = vi.fn();

    render(
      <RegisterForm
        onRegister={onRegister}
        onBackToLogin={onBackToLogin}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /Sign in/i,
      })
    );

    expect(onBackToLogin).toHaveBeenCalledTimes(1);
  });
});