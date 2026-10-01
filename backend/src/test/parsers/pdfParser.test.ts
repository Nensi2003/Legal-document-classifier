import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

vi.mock("unpdf", () => ({
  getDocumentProxy: vi.fn(),
  extractText: vi.fn(),
}));

import { readFile } from "node:fs/promises";
import {
  extractText,
  getDocumentProxy,
} from "unpdf";

import { parsePdf } from "../../parsers/pdfParser";

describe("parsePdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses a PDF and returns the extracted text", async () => {
    vi.mocked(readFile).mockResolvedValue(
      Buffer.from("fake pdf content")
    );

    vi.mocked(getDocumentProxy).mockResolvedValue(
      {} as never
    );

    vi.mocked(extractText).mockResolvedValue({
      text: [
        "  First page content  ",
        "  Second page content  ",
      ],
      totalPages: 2,
    });

    const result = await parsePdf(
      "/tmp/test.pdf"
    );

    expect(result.text).toBe(
      "First page content\n\nSecond page content"
    );

    expect(result.pages).toEqual([
      {
        pageNumber: 1,
        text: "First page content",
      },
      {
        pageNumber: 2,
        text: "Second page content",
      },
    ]);

    expect(result.metadata).toEqual({
      pages: 2,
    });
  });

  it("reads the PDF from the provided file path", async () => {
    vi.mocked(readFile).mockResolvedValue(
      Buffer.from("fake pdf")
    );

    vi.mocked(getDocumentProxy).mockResolvedValue(
      {} as never
    );

    vi.mocked(extractText).mockResolvedValue({
      text: ["Test content"],
      totalPages: 1,
    });

    await parsePdf("/documents/example.pdf");

    expect(readFile).toHaveBeenCalledWith(
      "/documents/example.pdf"
    );
  });

  it("passes the PDF buffer to getDocumentProxy", async () => {
    const buffer = Buffer.from(
      "fake pdf content"
    );

    vi.mocked(readFile).mockResolvedValue(buffer);

    vi.mocked(getDocumentProxy).mockResolvedValue(
      {} as never
    );

    vi.mocked(extractText).mockResolvedValue({
      text: ["Test content"],
      totalPages: 1,
    });

    await parsePdf("/tmp/test.pdf");

    expect(getDocumentProxy).toHaveBeenCalledWith(
      new Uint8Array(buffer)
    );
  });

  it("extracts text with mergePages disabled", async () => {
    vi.mocked(readFile).mockResolvedValue(
      Buffer.from("fake pdf")
    );

    const pdf = {} as never;

    vi.mocked(getDocumentProxy).mockResolvedValue(
      pdf
    );

    vi.mocked(extractText).mockResolvedValue({
      text: ["Page content"],
      totalPages: 1,
    });

    await parsePdf("/tmp/test.pdf");

    expect(extractText).toHaveBeenCalledWith(
      pdf,
      {
        mergePages: false,
      }
    );
  });

  it("trims whitespace from each page", async () => {
    vi.mocked(readFile).mockResolvedValue(
      Buffer.from("fake pdf")
    );

    vi.mocked(getDocumentProxy).mockResolvedValue(
      {} as never
    );

    vi.mocked(extractText).mockResolvedValue({
      text: [
        "   Page one   ",
        "\n Page two \n",
      ],
      totalPages: 2,
    });

    const result = await parsePdf(
      "/tmp/test.pdf"
    );

    expect(result.pages).toEqual([
      {
        pageNumber: 1,
        text: "Page one",
      },
      {
        pageNumber: 2,
        text: "Page two",
      },
    ]);
  });

  it("returns an empty text value for an empty PDF", async () => {
    vi.mocked(readFile).mockResolvedValue(
      Buffer.from("fake pdf")
    );

    vi.mocked(getDocumentProxy).mockResolvedValue(
      {} as never
    );

    vi.mocked(extractText).mockResolvedValue({
      text: [],
      totalPages: 0,
    });

    const result = await parsePdf(
      "/tmp/empty.pdf"
    );

    expect(result).toEqual({
      text: "",
      pages: [],
      metadata: {
        pages: 0,
      },
    });
  });

  it("propagates an error when the PDF cannot be read", async () => {
    vi.mocked(readFile).mockRejectedValue(
      new Error("File not found")
    );

    await expect(
      parsePdf("/missing/file.pdf")
    ).rejects.toThrow("File not found");
  });
});