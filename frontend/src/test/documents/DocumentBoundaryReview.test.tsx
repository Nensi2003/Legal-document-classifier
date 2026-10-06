import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const { getDocumentInstancesMock } = vi.hoisted(() => ({ getDocumentInstancesMock: vi.fn() }));
vi.mock("../../features/documents/boundaryApi", () => ({
  getDocumentInstances: getDocumentInstancesMock,
  mergeDocumentInstances: vi.fn(),
  splitDocumentInstance: vi.fn(),
  updateInstanceBoundary: vi.fn(),
}));
vi.mock("../../features/documents/components/InstancePagePreview", () => ({
  InstancePagePreview: ({ instanceId, startPage, endPage }: { instanceId: number; startPage: number; endPage: number }) => (
    <div data-testid="instance-source-preview">Instance {instanceId}, pages {startPage}–{endPage}</div>
  ),
}));

import { DocumentBoundaryReview } from "../../features/documents/components/DocumentBoundaryReview";

describe("DocumentBoundaryReview source preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDocumentInstancesMock.mockResolvedValue([
      { id: 12, documentId: 7, position: 1, startPage: 1, endPage: 2, status: "DRAFT", extractedText: "First instance text" },
      { id: 13, documentId: 7, position: 2, startPage: 3, endPage: 4, status: "DRAFT", extractedText: "Second instance text" },
    ]);
  });

  it("opens with the first instance's actual source preview selected", async () => {
    render(<DocumentBoundaryReview documentId={7} fileName="bundle.pdf" mimeType="application/pdf" onConfirmed={vi.fn()} onBackToDocuments={vi.fn()} />);

    expect(await screen.findByTestId("instance-source-preview")).toHaveTextContent("Instance 12, pages 1–2");
    expect(screen.getByRole("button", { name: "Document preview" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Extracted text" })).toHaveAttribute("aria-pressed", "false");
  });

  it("uses the separate back-to-documents action instead of confirming boundaries", async () => {
    const onBackToDocuments = vi.fn();
    const onConfirmed = vi.fn();
    render(<DocumentBoundaryReview documentId={7} fileName="bundle.pdf" mimeType="application/pdf" onConfirmed={onConfirmed} onBackToDocuments={onBackToDocuments} />);

    fireEvent.click(await screen.findByRole("button", { name: "← Back to Documents" }));
    expect(onBackToDocuments).toHaveBeenCalledOnce();
    expect(onConfirmed).not.toHaveBeenCalled();
  });
});
