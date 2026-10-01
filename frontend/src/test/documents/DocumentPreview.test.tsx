import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import { DocumentPreview } from "../../features/documents/components/DocumentPreview";

describe("DocumentPreview", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a PDF inside an iframe", () => {
    render(
      <DocumentPreview
        documentId={1}
        fileName="contract.pdf"
        mimeType="application/pdf"
      />
    );

    const iframe = screen.getByTitle(
      "contract.pdf"
    );

    expect(iframe).toBeInTheDocument();

    expect(iframe).toHaveAttribute(
      "src",
      "http://localhost:3000/api/documents/1/file"
    );
  });

  it("renders an image preview", () => {
    render(
      <DocumentPreview
        documentId={2}
        fileName="photo.png"
        mimeType="image/png"
      />
    );

    const image = screen.getByAltText(
      "photo.png"
    );

    expect(image).toBeInTheDocument();

    expect(image).toHaveAttribute(
      "src",
      "http://localhost:3000/api/documents/2/file"
    );
  });

  it("shows loading state while DOCX preview is loading", async () => {
    vi.mocked(fetch).mockReturnValue(
      new Promise(() => {})
    );

    render(
      <DocumentPreview
        documentId={3}
        fileName="contract.docx"
        mimeType="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      />
    );

    expect(
      await screen.findByText(
        "Preparing document preview..."
      )
    ).toBeInTheDocument();
  });

  it("renders DOCX HTML preview successfully", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        type: "docx",
        html: "<h1>Contract</h1><p>This is a contract.</p>",
      }),
    } as Response);

    render(
      <DocumentPreview
        documentId={4}
        fileName="contract.docx"
        mimeType="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      />
    );

    expect(
      await screen.findByText("Contract")
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "This is a contract."
      )
    ).toBeInTheDocument();

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/documents/4/preview",
      {
        credentials: "include",
      }
    );
  });

  it("renders CSV preview successfully", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        type: "csv",
        rows: [
          ["Name", "Age"],
          ["Alice", 25],
          ["Bob", 30],
        ],
      }),
    } as Response);

    render(
      <DocumentPreview
        documentId={5}
        fileName="users.csv"
        mimeType="text/csv"
      />
    );

    expect(
      await screen.findByText("Name")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Age")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Alice")
    ).toBeInTheDocument();

    expect(
      screen.getByText("25")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Bob")
    ).toBeInTheDocument();

    expect(
      screen.getByText("30")
    ).toBeInTheDocument();
  });

  it("shows empty message for an empty CSV", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        type: "csv",
        rows: [],
      }),
    } as Response);

    render(
      <DocumentPreview
        documentId={6}
        fileName="empty.csv"
        mimeType="text/csv"
      />
    );

    expect(
      await screen.findByText(
        "The CSV file is empty."
      )
    ).toBeInTheDocument();
  });

  it("shows an error when DOCX preview fails", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({
        error: "Preview service failed",
      }),
    } as Response);

    render(
      <DocumentPreview
        documentId={7}
        fileName="broken.docx"
        mimeType="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      />
    );

    expect(
      await screen.findByText(
        "Preview unavailable"
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Preview service failed"
      )
    ).toBeInTheDocument();
  });

  it("shows unsupported format message", () => {
    render(
      <DocumentPreview
        documentId={8}
        fileName="document.xyz"
        mimeType="application/octet-stream"
      />
    );

    expect(
      screen.getByText(
        "Preview not available"
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "This document format cannot be displayed in the preview."
      )
    ).toBeInTheDocument();
  });

  it("supports Microsoft Word DOC files", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        type: "docx",
        html: "<p>Old Word document</p>",
      }),
    } as Response);

    render(
      <DocumentPreview
        documentId={9}
        fileName="old-document.doc"
        mimeType="application/msword"
      />
    );

    expect(
      await screen.findByText(
        "Old Word document"
      )
    ).toBeInTheDocument();
  });
});