import type { JSONSchema } from "../../../types/jsonSchema";
import { DynamicField } from "./DynamicField";

interface DynamicFormProps {
  schema: JSONSchema;
  initialData?: Record<string, unknown>;
  onChange?: (data: Record<string, unknown>) => void;
}

export function DynamicForm({
  schema,
  initialData = {},
  onChange,
}: DynamicFormProps) {
  function handleFieldChange(
    name: string,
    value: unknown
  ) {
    const updatedData = {
      ...initialData,
      [name]: value,
    };

    onChange?.(updatedData);
  }

  return (
    <form>
      {Object.entries(schema.properties).map(
  ([name, fieldSchema]) => (
    <DynamicField
      key={name}
      name={name}
      schema={fieldSchema}
      value={initialData[name]}
      required={
        schema.required?.includes(name) ?? false
      }
      onChange={(value) =>
        handleFieldChange(name, value)
      }
    />
  )
)}
    </form>
  );
}