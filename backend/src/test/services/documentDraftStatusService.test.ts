import { describe, expect, it } from "vitest";
import { getStatusAfterDraftSave } from "../../services/documentDraftStatusService";

describe("getStatusAfterDraftSave", () => {
  it.each([
    [null],
    [undefined],
    [{}],
    [{ name: "  ", address: null }],
    [{ nested: { first: "", second: [] } }],
  ])("keeps an empty document available for draft data %j", (...draftData) => {
    expect(getStatusAfterDraftSave(...draftData)).toBe("AVAILABLE");
  });

  it.each([
    [{ name: "Ada" }],
    [{ nested: { employer: "Example Ltd" } }],
    [{ items: ["completed field"] }],
    [{ consent: false }],
    [{ years: 0 }],
  ])("marks the document DRAFT when saved data contains a field value: %j", (...draftData) => {
    expect(getStatusAfterDraftSave(...draftData)).toBe("DRAFT");
  });
});
