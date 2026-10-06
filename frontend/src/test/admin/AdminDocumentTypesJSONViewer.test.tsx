import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { getTypes, getJSON } = vi.hoisted(() => ({ getTypes: vi.fn(), getJSON: vi.fn() }));
vi.mock("../../features/admin/api", () => ({ getAdminDocumentTypes: getTypes, getAdminDocumentTypeJSON: getJSON }));
import { AdminDocumentTypes } from "../../features/admin/AdminDocumentTypes";

describe("admin combined JSON viewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTypes.mockResolvedValue([{ id: 3, name: "Contract", domain: "Legal", description: null, createdAt: "", updatedAt: "", activeVersion: { id: 8, versionNumber: 2, status: "ACTIVE" }, versions: [{ id: 7, versionNumber: 1, status: "ARCHIVED", createdAt: "", publishedAt: null }, { id: 8, versionNumber: 2, status: "ACTIVE", createdAt: "", publishedAt: null }] }]);
    getJSON.mockResolvedValue({ versions: [{ version: 1, documents: [{ data: { title: "Old" } }] }, { version: 2, documents: [{ data: { title: "New" } }] }] });
  });

  it("opens formatted JSON, loads a version, and copies the selected data", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<AdminDocumentTypes onBack={vi.fn()} onNavigate={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Get Combined JSON" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/"version": 1/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "JSON version" }), { target: { value: "2" } });
    await waitFor(() => expect(getJSON).toHaveBeenLastCalledWith(3, 2));
    fireEvent.click(screen.getByRole("button", { name: "Copy JSON" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(JSON.stringify({ versions: [{ version: 1, documents: [{ data: { title: "Old" } }] }, { version: 2, documents: [{ data: { title: "New" } }] }] }, null, 2)));
  });
});
