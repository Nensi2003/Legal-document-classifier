import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "../App";

import { getCurrentUser } from "../features/auth/api";

// Mock authentication API
vi.mock("../features/auth/api", () => ({
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
}));

// Mock components that App renders
vi.mock("../features/auth/LoginForm", () => ({
  LoginForm: () => (
    <div data-testid="login-form">
      Login Form
    </div>
  ),
}));

vi.mock("../features/auth/RegisterForm", () => ({
  RegisterForm: () => (
    <div data-testid="register-form">
      Register Form
    </div>
  ),
}));

vi.mock("../features/admin/AdminDashboard", () => ({
  AdminDashboard: () => (
    <div data-testid="admin-dashboard">
      Admin Dashboard
    </div>
  ),
}));

vi.mock("../features/dashboard/Dashboard", () => ({
  Dashboard: () => (
    <div data-testid="user-dashboard">
      User Dashboard
    </div>
  ),
}));

vi.mock("../features/documents/components/AppLayout", () => ({
  AppLayout: ({
    children,
  }: {
    children: React.ReactNode;
  }) => (
    <div data-testid="app-layout">
      {children}
    </div>
  ),
}));

describe("App authentication routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the admin dashboard for an ADMIN user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 1,
      email: "admin@gmail.com",
      name: "Admin",
      role: "ADMIN",
    });

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByTestId("admin-dashboard")
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByTestId("user-dashboard")
    ).not.toBeInTheDocument();
  });

  it("shows the normal user dashboard for a USER", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 2,
      email: "test@gmail.com",
      name: "Test User",
      role: "USER",
    });

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByTestId("user-dashboard")
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByTestId("admin-dashboard")
    ).not.toBeInTheDocument();
  });

  it("shows the login form when there is no authenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByTestId("login-form")
      ).toBeInTheDocument();
    });
  });
});