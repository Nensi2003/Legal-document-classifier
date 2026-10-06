import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const { getDocumentTypesMock, getBatchMock } = vi.hoisted(() => ({ getDocumentTypesMock: vi.fn(), getBatchMock: vi.fn() }));
vi.mock("../../features/document-types/api", () => ({ getDocumentTypes: getDocumentTypesMock }));
vi.mock("../../features/documents/batchApi", () => ({ uploadBatch: vi.fn(), getBatch: getBatchMock }));

import { UploadDocument } from "../../features/documents/UploadDocument";
import { BatchUpload } from "../../features/documents/BatchUpload";

describe("admin publishing navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    getDocumentTypesMock.mockResolvedValue([]);
    getBatchMock.mockResolvedValue(null);
  });

  it("provides a dashboard button on single-document publishing", () => {
    const onBack = vi.fn();
    render(<UploadDocument isAdmin onBackToDashboard={onBack} onUploaded={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "← Back to Dashboard" }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("provides a dashboard button on batch publishing", () => {
    const onBack = vi.fn();
    render(<BatchUpload isAdmin onBackToDashboard={onBack} onComplete={vi.fn()} onCancel={vi.fn()} onOpenDraft={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "← Back to Dashboard" }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
