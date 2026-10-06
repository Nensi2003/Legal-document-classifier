import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../App";

import { getCurrentUser } from "../features/auth/api";

const { getDocumentByIdMock, claimDocumentMock, realtimeMock } = vi.hoisted(() => ({
  getDocumentByIdMock: vi.fn(),
  claimDocumentMock: vi.fn(),
  realtimeMock: {
    connect: vi.fn(),
    watchDocument: vi.fn(),
    claimDocument: vi.fn(),
    onEvent: vi.fn(),
  },
}));

// Mock authentication API
vi.mock("../features/auth/api", () => ({
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("../features/documents/api", () => ({
  getDocumentById: getDocumentByIdMock,
  claimDocument: claimDocumentMock,
}));
vi.mock("../features/documents/parseApi", () => ({ parseDocument: vi.fn() }));
vi.mock("../features/realtime/realtimeClient", () => ({ realtimeClient: realtimeMock }));

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
  Dashboard: ({ onNavigate }: { onNavigate: (page: string) => void }) => (
    <div data-testid="user-dashboard">
      User Dashboard
      <button onClick={() => onNavigate("documents")}>Go to documents</button>
    </div>
  ),
}));

vi.mock("../features/documents/DocumentList", () => ({
  DocumentList: ({ onOpenDocument }: { onOpenDocument: (id: number) => void }) => (
    <div data-testid="documents-page">
      <button onClick={() => onOpenDocument(31)}>Open sample document</button>
    </div>
  ),
}));
vi.mock("../features/documents/DraftList", () => ({ DraftList: () => <div data-testid="drafts-page" /> }));
vi.mock("../features/documents/UploadDocument", () => ({ UploadDocument: () => <div data-testid="upload-page" /> }));
vi.mock("../features/documents/BatchUpload", () => ({ BatchUpload: () => <div data-testid="batch-upload-page" /> }));
vi.mock("../features/documents/components/DocumentForm", () => ({
  DocumentForm: ({ documentId }: { documentId: number }) => <div data-testid="document-form">Document {documentId}</div>,
}));
vi.mock("../features/documents/components/DocumentCollaborationBar", () => ({
  DocumentCollaborationBar: () => null,
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
    window.history.replaceState({}, "", "/");
    realtimeMock.connect.mockReturnValue(() => undefined);
    realtimeMock.watchDocument.mockReturnValue(() => undefined);
    realtimeMock.claimDocument.mockReturnValue(() => undefined);
    realtimeMock.onEvent.mockReturnValue(() => undefined);
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

  it("restores the opened document after refresh using its URL", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 2,
      email: "test@gmail.com",
      name: "Test User",
      role: "USER",
    });
    getDocumentByIdMock.mockResolvedValue({
      id: 31,
      fileName: "sample.pdf",
      filePath: "uploads/sample.pdf",
      mimeType: "application/pdf",
      documentTypeId: 9,
      status: "COMPLETED",
      createdAt: "2026-10-06T10:00:00Z",
    });

    const firstLoad = render(<App />);
    await screen.findByTestId("user-dashboard");
    fireEvent.click(screen.getByRole("button", { name: "Go to documents" }));
    fireEvent.click(screen.getByRole("button", { name: "Open sample document" }));
    expect(await screen.findByTestId("document-form")).toHaveTextContent("Document 31");
    expect(new URLSearchParams(window.location.search).get("documentId")).toBe("31");

    firstLoad.unmount();
    render(<App />);

    expect(await screen.findByTestId("document-form")).toHaveTextContent("Document 31");
    expect(getDocumentByIdMock).toHaveBeenLastCalledWith(31);
  });

  it.each([
    ["documents", "documents-page"],
    ["drafts", "drafts-page"],
    ["upload", "upload-page"],
    ["batch-upload", "batch-upload-page"],
  ])("restores the %s tab after refresh", async (page, testId) => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 2,
      email: "test@gmail.com",
      name: "Test User",
      role: "USER",
    });
    window.history.replaceState({}, "", `/?page=${page}`);

    render(<App />);

    expect(await screen.findByTestId(testId)).toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).get("page")).toBe(page);
  });
});
