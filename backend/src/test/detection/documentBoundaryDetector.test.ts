import { describe, expect, it } from "vitest";
import { detectDocumentBoundaries } from "../../detection/documentBoundaryDetector";

describe("detectDocumentBoundaries", () => {
  it("returns no instances for an empty page list", () => {
    expect(detectDocumentBoundaries([])).toEqual([]);
  });

  it("treats the whole file as one document when no start signal is strong enough", () => {
    expect(detectDocumentBoundaries([
      { pageNumber: 1, text: "A few notes" },
      { pageNumber: 2, text: "More notes" },
      { pageNumber: 3, text: "Final page" },
    ])).toEqual([{
      position: 1,
      startPage: 1,
      endPage: 3,
      score: 0,
      matchedRules: [],
    }]);
  });

  it("uses strong title signals to divide a combined PDF into ordered page ranges", () => {
    const result = detectDocumentBoundaries([
      { pageNumber: 1, text: "Employment contract\nEmployee: Ada" },
      { pageNumber: 2, text: "Terms and conditions" },
      { pageNumber: 3, text: "Invoice\nInvoice No: INV-14\nDate: 2026-10-01" },
      { pageNumber: 4, text: "Payment details" },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ position: 1, startPage: 1, endPage: 2, score: 6 });
    expect(result[1]).toMatchObject({ position: 2, startPage: 3, endPage: 4, score: 8 });
    expect(result[0].matchedRules).toContain("document title");
    expect(result[1].matchedRules).toContain("document number");
  });

  it("collapses adjacent start signals and keeps the stronger page", () => {
    const result = detectDocumentBoundaries([
      { pageNumber: 1, text: "Contract" },
      { pageNumber: 2, text: "Invoice\nInvoice No: INV-2\nDate: 2026-10-01" },
      { pageNumber: 3, text: "Invoice terms" },
      { pageNumber: 4, text: "Receipt\nReceipt No: RC-2" },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ position: 1, startPage: 2, endPage: 3, score: 8 });
    expect(result[1]).toMatchObject({ position: 2, startPage: 4, endPage: 4, score: 4 });
  });
});
