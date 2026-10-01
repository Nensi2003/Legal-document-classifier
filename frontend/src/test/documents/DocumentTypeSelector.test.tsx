import {
  beforeEach,
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

import { DocumentTypeSelector } from "../../features/documents/components/DocumentTypeSelector";

import { getDocumentTypes } from "../../features/document-types/api";
import { getClassificationSuggestions } from "../../features/documents/classificationApi";
import { assignDocumentType } from "../../features/documents/api";

vi.mock("../../features/document-types/api", () => ({
  getDocumentTypes: vi.fn(),
}));

vi.mock("../../features/documents/classificationApi", () => ({
  getClassificationSuggestions: vi.fn(),
}));

vi.mock("../../features/documents/api", () => ({
  assignDocumentType: vi.fn(),
}));

describe("DocumentTypeSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads and displays document types", async () => {
    vi.mocked(getDocumentTypes).mockResolvedValue([
      {
        id: 1,
        name: "Contract",
        domain: "Legal",
        description: "Legal contract",
        jsonSchema: {},
      },
      {
        id: 2,
        name: "Invoice",
        domain: "Finance",
        description: "Financial invoice",
        jsonSchema: {},
      },
    ]);

    vi.mocked(
      getClassificationSuggestions
    ).mockResolvedValue([]);

    const onTypeSelected = vi.fn();

    render(
      <DocumentTypeSelector
        documentId={10}
        onTypeSelected={onTypeSelected}
      />
    );

    expect(
      screen.getByText("Analyzing document...")
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText("Contract")
      ).toBeInTheDocument();

      expect(
        screen.getByText("Invoice")
      ).toBeInTheDocument();
    });
  });

  it("displays suggested document types", async () => {
    vi.mocked(getDocumentTypes).mockResolvedValue([
      {
        id: 1,
        name: "Contract",
        domain: "Legal",
        description: "Legal contract",
        jsonSchema: {},
      },
      {
        id: 2,
        name: "Invoice",
        domain: "Finance",
        description: "Financial invoice",
        jsonSchema: {},
      },
    ]);

    vi.mocked(
      getClassificationSuggestions
    ).mockResolvedValue([
      {
        documentTypeId: 1,
        documentType: "Contract",
        domain: "Legal",
        score: 0.95,
        matchedKeywords: [
          "agreement",
          "contract",
        ],
      },
    ]);

    const onTypeSelected = vi.fn();

    render(
      <DocumentTypeSelector
        documentId={10}
        onTypeSelected={onTypeSelected}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText("Suggested Types")
      ).toBeInTheDocument();

      expect(
        screen.getByText("Contract")
      ).toBeInTheDocument();

      expect(
        screen.getByText("agreement")
      ).toBeInTheDocument();

      expect(
        screen.getByText("contract")
      ).toBeInTheDocument();
    });
  });

  it("assigns the selected document type successfully", async () => {
    vi.mocked(getDocumentTypes).mockResolvedValue([
      {
        id: 1,
        name: "Contract",
        domain: "Legal",
        description: "Legal contract",
        jsonSchema: {},
      },
    ]);

    vi.mocked(
      getClassificationSuggestions
    ).mockResolvedValue([]);

    vi.mocked(assignDocumentType).mockResolvedValue({
      document: {
        id: 10,
      },
    });

    const onTypeSelected = vi.fn();

    render(
      <DocumentTypeSelector
        documentId={10}
        onTypeSelected={onTypeSelected}
      />
    );

    const button =
      await screen.findByRole("button", {
        name: "Use this type",
      });

    fireEvent.click(button);

    await waitFor(() => {
      expect(assignDocumentType).toHaveBeenCalledWith(
        10,
        1
      );

      expect(onTypeSelected).toHaveBeenCalledWith(1);
    });
  });

  it("shows an error when loading document types fails", async () => {
    vi.mocked(getDocumentTypes).mockRejectedValue(
      new Error("Failed to fetch document types")
    );

    vi.mocked(
      getClassificationSuggestions
    ).mockResolvedValue([]);

    render(
      <DocumentTypeSelector
        documentId={10}
        onTypeSelected={vi.fn()}
      />
    );

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent(
      "Failed to fetch document types"
    );
  });

  it("shows an error when assigning a document type fails", async () => {
    vi.mocked(getDocumentTypes).mockResolvedValue([
      {
        id: 1,
        name: "Contract",
        domain: "Legal",
        description: "Legal contract",
        jsonSchema: {},
      },
    ]);

    vi.mocked(
      getClassificationSuggestions
    ).mockResolvedValue([]);

    vi.mocked(assignDocumentType).mockRejectedValue(
      new Error("Failed to assign document type")
    );

    render(
      <DocumentTypeSelector
        documentId={10}
        onTypeSelected={vi.fn()}
      />
    );

    const button =
      await screen.findByRole("button", {
        name: "Use this type",
      });

    fireEvent.click(button);

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent(
      "Failed to assign document type"
    );
  });
});