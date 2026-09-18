export interface JSONSchemaProperty {
  type:
    | "string"
    | "number"
    | "integer"
    | "boolean"
    | "object"
    | "array";

  title?: string;
  description?: string;
  format?: string;

  enum?: string[];

  minLength?: number;
  maxLength?: number;
  pattern?: string;

  minimum?: number;
  maximum?: number;

  properties?: Record<string, JSONSchemaProperty>;

  required?: string[];

  items?: JSONSchemaProperty;
}

export interface JSONSchema {
  type: "object";
  title?: string;
  description?: string;

  properties: Record<string, JSONSchemaProperty>;

  required?: string[];

  additionalProperties?: boolean;
}