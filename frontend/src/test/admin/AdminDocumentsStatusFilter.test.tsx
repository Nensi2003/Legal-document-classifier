import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { getAdminDocumentsMock, deleteAdminDocumentMock } = vi.hoisted(() => ({ getAdminDocumentsMock: vi.fn(), deleteAdminDocumentMock: vi.fn() }));
vi.mock("../../features/admin/api", () => ({ getAdminDocuments: getAdminDocumentsMock, deleteAdminDocument: deleteAdminDocumentMock }));

import { AdminDocuments } from "../../features/admin/AdminDocuments";

describe("AdminDocuments status filter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAdminDocumentsMock.mockResolvedValue(Array.from({ length: 12 }, (_, index) => {
      const id = index + 1;
      const userId = id % 2 === 0 ? 1 : 2;
      return {
        id,
        fileName: `doc-${id}.pdf`,
        mimeType: "application/pdf",
        status: "AVAILABLE",
        createdAt: `2026-10-${String(id).padStart(2, "0")}T12:00:00.000Z`,
        userId,
        userName: `User ${userId}`,
        userEmail: `user${userId}@example.test`,
        documentTypeName: null,
        uploaderRole: id === 12 ? "ADMIN" : "USER",
      };
    }));
  });

  it("offers every supported document status", async () => {
    render(<AdminDocuments onNavigate={vi.fn()} />);
    const filter = await screen.findByRole("combobox", { name: "Filter documents by status" });
    for (const status of ["PENDING", "AVAILABLE", "DRAFT", "REVIEW", "READY", "COMPLETED", "FAILED"]) {
      expect(filter.querySelector(`option[value="${status}"]`)).not.toBeNull();
    }
  });

  it("sorts newest first, paginates, and filters by uploader", async () => {
    render(<AdminDocuments onNavigate={vi.fn()} />);
    expect(await screen.findByText("doc-12.pdf")).toBeInTheDocument();
    expect(screen.getByText("doc-3.pdf")).toBeInTheDocument();
    expect(screen.queryByText("doc-2.pdf")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next →" }));
    expect(await screen.findByText("doc-2.pdf")).toBeInTheDocument();
    expect(screen.getByText("doc-1.pdf")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "Filter documents by uploader" }), { target: { value: "1" } });
    await waitFor(() => expect(screen.getByText("doc-12.pdf")).toBeInTheDocument());
    expect(screen.queryByText("doc-11.pdf")).not.toBeInTheDocument();
  });

  it("filters admin documents by an inclusive date range", async () => {
    render(<AdminDocuments onNavigate={vi.fn()} />);
    const fromDate = await screen.findByLabelText("Filter documents uploaded from date");
    const toDate = screen.getByLabelText("Filter documents uploaded through date");
    fireEvent.change(fromDate, { target: { value: "2026-10-10" } });
    fireEvent.change(toDate, { target: { value: "2026-10-12" } });
    await waitFor(() => expect(screen.getByText("doc-10.pdf")).toBeInTheDocument());
    expect(screen.getByText("doc-11.pdf")).toBeInTheDocument();
    expect(screen.getByText("doc-12.pdf")).toBeInTheDocument();
    expect(screen.queryByText("doc-9.pdf")).not.toBeInTheDocument();
  });

  it("hides delete for admin-uploaded documents but keeps it for user uploads", async () => {
    render(<AdminDocuments onNavigate={vi.fn()} />);
    const adminDocument = await screen.findByText("doc-12.pdf");
    const userDocument = screen.getByText("doc-11.pdf");

    expect(adminDocument.closest("tr")?.querySelector("button[aria-label='Delete doc-12.pdf']")).toBeNull();
    expect(userDocument.closest("tr")?.querySelector("button[aria-label='Delete doc-11.pdf']")).not.toBeNull();
  });
});
