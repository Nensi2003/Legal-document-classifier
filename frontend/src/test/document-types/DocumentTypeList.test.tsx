import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import { DocumentTypeList } from "../../features/document-types/DocumentTypeList";

import { getDocumentTypes } from "../../features/document-types/api";

vi.mock("../../features/document-types/api", () => ({
  getDocumentTypes: vi.fn(),
}));

describe("DocumentTypeList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDocumentTypes = [
    {
      id: 1,
      name: "Employment Contract",
      domain: "Legal",
      description: "Employment contract template",
      jsonSchema: {},
    },
    {
      id: 2,
      name: "Invoice",
      domain: "Finance",
      description: "Invoice document template",
      jsonSchema: {},
    },
  ];

  it("shows loading state", () => {
    vi.mocked(getDocumentTypes).mockReturnValue(
      new Promise(() => {})
    );

    render(
      <DocumentTypeList
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(
      screen.getByText("Loading templates...")
    ).toBeInTheDocument();
  });

  it("loads and displays document types successfully", async () => {
    vi.mocked(getDocumentTypes).mockResolvedValue(
      mockDocumentTypes
    );

    render(
      <DocumentTypeList
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText("Employment Contract")
      ).toBeInTheDocument();

      expect(
        screen.getByText("Invoice")
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("Legal")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Finance")
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Employment contract template"
      )
    ).toBeInTheDocument();

    expect(getDocumentTypes).toHaveBeenCalledTimes(1);
  });

  it("shows an error when loading document types fails", async () => {
    vi.mocked(getDocumentTypes).mockRejectedValue(
      new Error("Failed to fetch document types")
    );

    render(
      <DocumentTypeList
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent(
      "Failed to fetch document types"
    );

    expect(
      screen.getByRole("button", {
        name: "Try Again",
      })
    ).toBeInTheDocument();
  });

  it("filters document types using the search input", async () => {
    vi.mocked(getDocumentTypes).mockResolvedValue(
      mockDocumentTypes
    );

    render(
      <DocumentTypeList
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText("Employment Contract")
      ).toBeInTheDocument();
    });

    const searchInput =
      screen.getByPlaceholderText(
        "Search templates..."
      );

    fireEvent.change(searchInput, {
      target: {
        value: "invoice",
      },
    });

    expect(
      screen.getByText("Invoice")
    ).toBeInTheDocument();

    expect(
      screen.queryByText("Employment Contract")
    ).not.toBeInTheDocument();

    expect(
      screen.getByText("Showing 1 of 2 templates")
    ).toBeInTheDocument();
  });

  it("searches by domain", async () => {
    vi.mocked(getDocumentTypes).mockResolvedValue(
      mockDocumentTypes
    );

    render(
      <DocumentTypeList
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText("Employment Contract")
      ).toBeInTheDocument();
    });

    fireEvent.change(
      screen.getByPlaceholderText(
        "Search templates..."
      ),
      {
        target: {
          value: "finance",
        },
      }
    );

    expect(
      screen.getByText("Invoice")
    ).toBeInTheDocument();

    expect(
      screen.queryByText("Employment Contract")
    ).not.toBeInTheDocument();
  });

  it("shows no templates found when search has no matches", async () => {
    vi.mocked(getDocumentTypes).mockResolvedValue(
      mockDocumentTypes
    );

    render(
      <DocumentTypeList
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText("Invoice")
      ).toBeInTheDocument();
    });

    fireEvent.change(
      screen.getByPlaceholderText(
        "Search templates..."
      ),
      {
        target: {
          value: "something-that-does-not-exist",
        },
      }
    );

    expect(
      screen.getByText("No templates found")
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /No template matches/
      )
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Clear Search",
      })
    ).toBeInTheDocument();
  });

  it("clears the search", async () => {
    vi.mocked(getDocumentTypes).mockResolvedValue(
      mockDocumentTypes
    );

    render(
      <DocumentTypeList
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText("Invoice")
      ).toBeInTheDocument();
    });

    const searchInput =
      screen.getByPlaceholderText(
        "Search templates..."
      );

    fireEvent.change(searchInput, {
      target: {
        value: "invoice",
      },
    });

    expect(
      screen.queryByText("Employment Contract")
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Clear",
      })
    );

    expect(
      screen.getByText("Employment Contract")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Invoice")
    ).toBeInTheDocument();
  });

  it("calls onEdit with the selected document type", async () => {
    vi.mocked(getDocumentTypes).mockResolvedValue(
      mockDocumentTypes
    );

    const onEdit = vi.fn();

    render(
      <DocumentTypeList
        onEdit={onEdit}
        onDelete={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText("Employment Contract")
      ).toBeInTheDocument();
    });

    const editButtons =
      screen.getAllByRole("button", {
        name: "Edit",
      });

    fireEvent.click(editButtons[0]);

    expect(onEdit).toHaveBeenCalledWith(
      mockDocumentTypes[0]
    );
  });

  it("calls onDelete with the selected document type", async () => {
    vi.mocked(getDocumentTypes).mockResolvedValue(
      mockDocumentTypes
    );

    const onDelete = vi.fn();

    render(
      <DocumentTypeList
        onEdit={vi.fn()}
        onDelete={onDelete}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText("Employment Contract")
      ).toBeInTheDocument();
    });

    const deleteButtons =
      screen.getAllByRole("button", {
        name: "Delete",
      });

    fireEvent.click(deleteButtons[0]);

    expect(onDelete).toHaveBeenCalledWith(
      mockDocumentTypes[0]
    );
  });

  it("shows the empty state when there are no document types", async () => {
    vi.mocked(getDocumentTypes).mockResolvedValue([]);

    render(
      <DocumentTypeList
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(
      await screen.findByText("No templates yet")
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Create a document template to define the fields and JSON structure used by your application."
      )
    ).toBeInTheDocument();
  });
});