function hasFieldValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.some(hasFieldValue);
  if (typeof value === "object") return Object.values(value).some(hasFieldValue);
  return false;
}

/** A document is a draft only while at least one saved processing field has a value. */
export function getStatusAfterDraftSave(...draftData: unknown[]) {
  return draftData.some(hasFieldValue)
    ? "DRAFT"
    : "AVAILABLE";
}
