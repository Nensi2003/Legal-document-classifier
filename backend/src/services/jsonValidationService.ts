import Ajv, {
  type AnySchema,
  type ErrorObject,
} from "ajv";

import addFormats from "ajv-formats";

import type { JsonValue } from "@prisma/orm-postgres/target/codec-types";

const ajv = new Ajv({
  allErrors: true,
});

addFormats(ajv);

const CURRENCY_OPTIONS = [
  "EUR",
  "USD",
  "ALL",
  "GBP",
  "CHF",
  "CAD",
  "AUD",
  "JPY",
];

export interface JSONValidationResult {
  valid: boolean;
  errors: ErrorObject[];
}

export function validateJSON(
  data: JsonValue,
  schema: JsonValue
): JSONValidationResult {
  const cleanedSchema =
    cleanSchema(schema);

  const validate = ajv.compile(
    cleanedSchema as AnySchema
  );

  const valid = validate(data);

  return {
    valid: Boolean(valid),
    errors: validate.errors ?? [],
  };
}

function cleanSchema(
  schema: JsonValue
): JsonValue {
  if (
    schema === null ||
    typeof schema !== "object"
  ) {
    return schema;
  }

  if (Array.isArray(schema)) {
    return schema.map((item) =>
      cleanSchema(item)
    );
  }

  const cleaned: Record<
    string,
    JsonValue
  > = {};

  for (const [key, value] of Object.entries(
    schema
  )) {
    cleaned[key] = cleanSchema(value);
  }

  /*
   * Older templates may contain:
   *
   * "format": "currency"
   *
   * Currency is not a standard AJV format.
   * Currency is represented by enum instead.
   */
  if (
    cleaned["format"] === "currency"
  ) {
    delete cleaned["format"];

    cleaned["type"] = "string";

    cleaned["enum"] =
      CURRENCY_OPTIONS;
  }

  return cleaned;
}