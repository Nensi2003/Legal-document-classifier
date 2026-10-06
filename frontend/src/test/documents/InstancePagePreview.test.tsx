import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { InstancePagePreview } from "../../features/documents/components/InstancePagePreview";

describe("InstancePagePreview", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(["page"], { type: "image/png" }) }));
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:instance-page") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  });
  afterEach(() => vi.restoreAllMocks());

  it("loads only pages inside the instance range and starts at its first page", async () => {
    render(<InstancePagePreview documentId={7} instanceId={14} fileName="bundle.pdf" mimeType="application/pdf" startPage={3} endPage={4} />);

    expect(await screen.findByAltText("bundle.pdf, page 3")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/documents/7/instances/14/preview?page=3",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(screen.getByRole("button", { name: "Previous instance page" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Next instance page" }));
    expect(await screen.findByAltText("bundle.pdf, page 4")).toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenLastCalledWith(
      "http://localhost:3000/api/documents/7/instances/14/preview?page=4",
      expect.objectContaining({ credentials: "include" }),
    ));
    expect(screen.getByRole("button", { name: "Next instance page" })).toBeDisabled();
  });
});
