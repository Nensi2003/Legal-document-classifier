import type { Field } from "./api";

export interface GeneratedJSONSchema {
  type: "object";
  properties: Record<string, Record<string, unknown>>;
  required?: string[];
  additionalProperties: false;
}

const CURRENCY_OPTIONS = [
  "EUR",
  "USD",
  "ALL",
  "GBP",
  "CHF",
  "CAD",
  "AUD",
  "JPY",
] as const;

export function generateJSONSchema(
  fields: Field[]
): GeneratedJSONSchema {
  const properties: Record<string, Record<string, unknown>> = {};
  const required: string[] = [];

  for (const field of fields) {
    const property: Record<string, unknown> = {};

    switch (field.type) {
      case "number":
        property.type = "number";
        break;

      case "integer":
        property.type = "integer";
        break;

      case "boolean":
        property.type = "boolean";
        break;

      case "date":
        property.type = "string";

        // Date format used by the application:
        // DD/MM/YYYY
        property.pattern = "^\\d{2}/\\d{2}/\\d{4}$";
        break;

      case "email":
        property.type = "string";
        property.format = "email";
        break;

      case "currency":
        property.type = "string";
        property.enum = [...CURRENCY_OPTIONS];
        break;

      case "textarea":
      case "string":
      default:
        property.type = "string";
        break;
    }

    // Custom validation rule can still override the default rule.
    if (field.validationRule) {
      property.pattern = field.validationRule;
    }

    properties[field.name] = property;

    if (field.required) {
      required.push(field.name);
    }
  }

  return {
    type: "object",
    properties,
    ...(required.length > 0 ? { required } : {}),
    additionalProperties: false,
  };
}