import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { getDocumentsMock, getDocumentTypesMock } = vi.hoisted(() => ({
  getDocumentsMock: vi.fn(),
  getDocumentTypesMock: vi.fn(),
}));

vi.mock("../../features/documents/api", () => ({
  getDocuments: getDocumentsMock,
  deleteDocument: vi.fn(),
}));
vi.mock("../../features/document-types/api", () => ({ getDocumentTypes: getDocumentTypesMock }));
vi.mock("../../features/realtime/realtimeClient", () => ({
  realtimeClient: { watchDocument: vi.fn(() => () => undefined), onEvent: vi.fn(() => () => undefined) },
}));

import { DocumentList } from "../../features/documents/DocumentList";

describe("DocumentList status filter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDocumentTypesMock.mockResolvedValue([]);
    getDocumentsMock.mockResolvedValue([
      { id: 1, fileName: "available.pdf", status: "AVAILABLE", createdAt: "2026-01-01", mimeType: "application/pdf" },
      { id: 2, fileName: "ready.pdf", status: "READY", createdAt: "2026-01-02", mimeType: "application/pdf" },
      { id: 3, fileName: "failed.pdf", status: "FAILED", createdAt: "2026-01-03", mimeType: "application/pdf" },
      { id: 4, fileName: "complete.pdf", status: "COMPLETED", createdAt: "2026-01-04", mimeType: "application/pdf", uploaderId: 7, uploaderName: "Morgan", uploaderRole: "USER" },
      { id: 5, fileName: "working.pdf", status: "AVAILABLE", createdAt: "2026-01-05", mimeType: "application/pdf", activeWorkerId: 9, claimExpiresAt: "2030-01-01T00:00:00.000Z", activeWorkerName: "John Doe", uploaderId: 2, uploaderName: "Admin", uploaderRole: "ADMIN", isUploadedByCurrentUser: false },
      { id: 6, fileName: "released-draft.pdf", status: "DRAFT", createdAt: "2026-01-06", mimeType: "application/pdf", uploaderId: 2, uploaderName: "Admin", uploaderRole: "ADMIN", isAvailableToUser: true, isUploadedByCurrentUser: false },
      { id: 7, fileName: "my-upload.pdf", status: "DRAFT", createdAt: "2026-01-07", mimeType: "application/pdf", uploaderId: 4, uploaderName: "Me", uploaderRole: "USER", isUploadedByCurrentUser: true },
    ]);
  });

  it("offers all supported document statuses and filters the selected status", async () => {
    render(<DocumentList onOpenDocument={vi.fn()} />);
    const statusFilter = await screen.findByRole("combobox", { name: "Filter documents by status" });

    for (const status of ["PENDING", "AVAILABLE", "DRAFT", "REVIEW", "READY", "COMPLETED", "FAILED"]) {
      expect(statusFilter.querySelector(`option[value="${status}"]`)).not.toBeNull();
    }

    fireEvent.change(statusFilter, { target: { value: "AVAILABLE" } });
    await waitFor(() => expect(screen.getAllByText("available.pdf")).toHaveLength(2));
    expect(screen.queryByText("ready.pdf")).not.toBeInTheDocument();
    expect(screen.queryByText("failed.pdf")).not.toBeInTheDocument();
  });

  it("filters user documents by an inclusive upload date range", async () => {
    render(<DocumentList onOpenDocument={vi.fn()} />);
    const fromDate = await screen.findByLabelText("Filter documents uploaded from date");
    const toDate = screen.getByLabelText("Filter documents uploaded through date");
    fireEvent.change(fromDate, { target: { value: "2026-01-02" } });
    fireEvent.change(toDate, { target: { value: "2026-01-02" } });

    await waitFor(() => expect(screen.getAllByText("ready.pdf")).toHaveLength(2));
    expect(screen.queryByText("available.pdf")).not.toBeInTheDocument();
    expect(screen.queryByText("failed.pdf")).not.toBeInTheDocument();
  });

  it("shows uploader filters and row styles for available, working, and completed documents", async () => {
    render(<DocumentList onOpenDocument={vi.fn()} />);
    await screen.findAllByText("complete.pdf");
    const cards = screen.getAllByRole("article");
    expect(cards.find((card) => card.textContent?.includes("available.pdf"))?.className).toContain("bg-emerald-50");
    const workingCard = cards.find((card) => card.textContent?.includes("working.pdf"));
    expect(workingCard?.className).toContain("bg-rose-50");
    expect(workingCard).toHaveTextContent("Currently working: John Doe");
    expect(cards.find((card) => card.textContent?.includes("complete.pdf"))?.className).not.toContain("bg-emerald-50");
    expect(cards.find((card) => card.textContent?.includes("released-draft.pdf"))?.className).toContain("bg-emerald-50");
    const uploader = screen.getByRole("combobox", { name: "Filter documents by uploader" });
    fireEvent.change(uploader, { target: { value: "7" } });
    await waitFor(() => expect(screen.getAllByText("complete.pdf")).toHaveLength(2));
    expect(screen.queryByText("working.pdf")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(screen.getAllByText("working.pdf")).toHaveLength(2));
  });

  it("does not offer delete for admin uploads, but keeps it for the current user's own upload", async () => {
    render(<DocumentList onOpenDocument={vi.fn()} />);
    await screen.findAllByText("released-draft.pdf");

    const adminUploadCard = screen.getAllByRole("article").find((card) => card.textContent?.includes("released-draft.pdf"));
    const ownUploadCard = screen.getAllByRole("article").find((card) => card.textContent?.includes("my-upload.pdf"));

    expect(adminUploadCard?.querySelectorAll('[aria-label="Delete released-draft.pdf"]')).toHaveLength(0);
    expect(ownUploadCard?.querySelectorAll('[aria-label="Delete my-upload.pdf"]')).toHaveLength(2);
  });
});
