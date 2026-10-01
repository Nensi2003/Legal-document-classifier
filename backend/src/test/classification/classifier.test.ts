import {
  describe,
  expect,
  it,
} from "vitest";

import { classifyDocument } from "../../classification/classifier";

describe("classifyDocument", () => {
  it("returns a classification when enough keywords match", () => {
    const result = classifyDocument(
      "This invoice contains the invoice number, total amount and payment due date."
    );

    expect(result.length).toBeGreaterThan(0);
  });

  it("matches keywords case-insensitively", () => {
    const lowerCaseResult = classifyDocument(
      "invoice payment total"
    );

    const upperCaseResult = classifyDocument(
      "INVOICE PAYMENT TOTAL"
    );

    expect(upperCaseResult).toEqual(
      lowerCaseResult
    );
  });

  it("includes matched keywords in the suggestion", () => {
    const result = classifyDocument(
      "invoice number total payment"
    );

    expect(result.length).toBeGreaterThan(0);

    expect(
      result[0].matchedKeywords.length
    ).toBeGreaterThan(0);
  });

  it("only returns classifications with a score of at least 4", () => {
    const result = classifyDocument(
      "invoice"
    );

    for (const suggestion of result) {
      expect(suggestion.score).toBeGreaterThanOrEqual(4);
    }
  });

  it("sorts classifications by score descending", () => {
    const result = classifyDocument(
      `
      invoice
      payment
      total
      contract
      agreement
      party
      signature
      `
    );

    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThanOrEqual(
        result[i].score
      );
    }
  });

  it("returns an empty array when no classification matches", () => {
    const result = classifyDocument(
      "This is a completely unrelated sentence about the weather."
    );

    expect(result).toEqual([]);
  });

  it("returns an empty array for empty text", () => {
    const result = classifyDocument("");

    expect(result).toEqual([]);
  });

  it("returns the expected classification structure", () => {
    const result = classifyDocument(
      "invoice payment total amount due"
    );

    expect(result.length).toBeGreaterThan(0);

    expect(result[0]).toHaveProperty(
      "domain"
    );

    expect(result[0]).toHaveProperty(
      "documentType"
    );

    expect(result[0]).toHaveProperty(
      "score"
    );

    expect(result[0]).toHaveProperty(
      "matchedKeywords"
    );

    expect(
      Array.isArray(
        result[0].matchedKeywords
      )
    ).toBe(true);
  });
});