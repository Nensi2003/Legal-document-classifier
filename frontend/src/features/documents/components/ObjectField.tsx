import type { JSONSchemaProperty } from "../../../types/jsonSchema";
import { DynamicField } from "./DynamicField";
import { formatFieldName } from "../../../utils/formatFieldName";

interface ObjectFieldProps {
  name: string;
  schema: JSONSchemaProperty;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}

export function ObjectField({
  name,
  schema,
  value,
  onChange,
}: ObjectFieldProps) {
  if (!schema.properties) {
    return null;
  }

  function handleFieldChange(
    fieldName: string,
    fieldValue: unknown
  ) {
    onChange({
      ...value,
      [fieldName]: fieldValue,
    });
  }

  return (
    <fieldset className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
      <legend className="px-2 text-sm font-semibold text-slate-800">
        {formatFieldName(name)}
      </legend>

      <div className="mt-2 grid gap-5 sm:grid-cols-2">
        {Object.entries(schema.properties).map(
          ([fieldName, fieldSchema]) => (
            <DynamicField
              key={fieldName}
              name={fieldName}
              schema={fieldSchema}
              value={value[fieldName]}
              required={
                schema.required?.includes(
                  fieldName
                ) ?? false
              }
              onChange={(fieldValue) =>
                handleFieldChange(
                  fieldName,
                  fieldValue
                )
              }
            />
          )
        )}
      </div>
    </fieldset>
  );
}