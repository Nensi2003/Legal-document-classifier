import { describe, expect, it } from "vitest";

import {
  validateJSON,
} from "../../services/jsonValidationService";

describe("jsonValidationService", () => {
  describe("validateJSON", () => {
    it("validates data successfully when it matches the schema", () => {
      const schema = {
        type: "object",
        properties: {
          name: {
            type: "string",
          },
          age: {
            type: "number",
          },
        },
        required: ["name", "age"],
      };

      const data = {
        name: "John",
        age: 25,
      };

      const result = validateJSON(data, schema);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("returns validation errors when required fields are missing", () => {
      const schema = {
        type: "object",
        properties: {
          name: {
            type: "string",
          },
          email: {
            type: "string",
            format: "email",
          },
        },
        required: ["name", "email"],
      };

      const data = {
        name: "John",
      };

      const result = validateJSON(data, schema);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("rejects data with the wrong field type", () => {
      const schema = {
        type: "object",
        properties: {
          age: {
            type: "number",
          },
        },
      };

      const data = {
        age: "twenty-five",
      };

      const result = validateJSON(data, schema);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("validates email format correctly", () => {
      const schema = {
        type: "object",
        properties: {
          email: {
            type: "string",
            format: "email",
          },
        },
      };

      const validData = {
        email: "test@example.com",
      };

      const invalidData = {
        email: "not-an-email",
      };

      expect(
        validateJSON(validData, schema).valid
      ).toBe(true);

      expect(
        validateJSON(invalidData, schema).valid
      ).toBe(false);
    });

    it("validates enum values", () => {
      const schema = {
        type: "object",
        properties: {
          currency: {
            type: "string",
            enum: ["EUR", "USD", "ALL"],
          },
        },
      };

      const validData = {
        currency: "EUR",
      };

      const invalidData = {
        currency: "GBP",
      };

      expect(
        validateJSON(validData, schema).valid
      ).toBe(true);

      expect(
        validateJSON(invalidData, schema).valid
      ).toBe(false);
    });

    it("supports nested object validation", () => {
      const schema = {
        type: "object",
        properties: {
          customer: {
            type: "object",
            properties: {
              name: {
                type: "string",
              },
              email: {
                type: "string",
                format: "email",
              },
            },
            required: ["name", "email"],
          },
        },
        required: ["customer"],
      };

      const data = {
        customer: {
          name: "John",
          email: "john@example.com",
        },
      };

      const result = validateJSON(data, schema);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("supports array validation", () => {
      const schema = {
        type: "array",
        items: {
          type: "string",
        },
      };

      const validData = ["one", "two", "three"];

      const invalidData = ["one", 2, "three"];

      expect(
        validateJSON(validData, schema).valid
      ).toBe(true);

      expect(
        validateJSON(invalidData, schema).valid
      ).toBe(false);
    });

    it("validates minimum and maximum values", () => {
      const schema = {
        type: "number",
        minimum: 0,
        maximum: 100,
      };

      expect(
        validateJSON(50, schema).valid
      ).toBe(true);

      expect(
        validateJSON(-1, schema).valid
      ).toBe(false);

      expect(
        validateJSON(101, schema).valid
      ).toBe(false);
    });

    it("supports the custom currency format used by older templates", () => {
      const schema = {
        type: "object",
        properties: {
          amount: {
            type: "string",
            format: "currency",
          },
        },
      };

      expect(
        validateJSON(
          { amount: "EUR" },
          schema
        ).valid
      ).toBe(true);

      expect(
        validateJSON(
          { amount: "USD" },
          schema
        ).valid
      ).toBe(true);

      expect(
        validateJSON(
          { amount: "XYZ" },
          schema
        ).valid
      ).toBe(false);
    });

    it("returns true when an optional field is not provided", () => {
      const schema = {
        type: "object",
        properties: {
          name: {
            type: "string",
          },
          description: {
            type: "string",
          },
        },
        required: ["name"],
      };

      const data = {
        name: "Contract",
      };

      const result = validateJSON(data, schema);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("returns false when the root value has the wrong type", () => {
      const schema = {
        type: "object",
        properties: {
          name: {
            type: "string",
          },
        },
      };

      const data = "not an object";

      const result = validateJSON(data, schema);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});