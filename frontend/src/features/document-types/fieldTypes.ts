export const FIELD_TYPES = [
  "string",
  "number",
  "integer",
  "boolean",
  "date",
  "email",
  "currency",
  "textarea",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];