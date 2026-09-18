import type { JSONSchemaProperty } from "../../../types/jsonSchema";
import { formatFieldName } from "../../../utils/formatFieldName";
import { DynamicField } from "./DynamicField";

interface ArrayFieldProps {
  name: string;
  schema: JSONSchemaProperty;
  value: unknown[];
  onChange: (value: unknown[]) => void;
}

export function ArrayField({
  name,
  schema,
  value,
  onChange,
}: ArrayFieldProps) {
  if (!schema.items) {
    return null;
  }

  function addItem() {
    onChange([
      ...value,
      createEmptyValue(schema.items!),
    ]);
  }

  function removeItem(index: number) {
    onChange(
      value.filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
    );
  }

  function updateItem(
    index: number,
    newValue: unknown
  ) {
    const updated = [...value];

    updated[index] = newValue;

    onChange(updated);
  }

  return (
    <fieldset className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
      <legend className="px-2 text-sm font-semibold text-slate-800">
        {formatFieldName(name)}
      </legend>

      <div className="mt-2 space-y-4">
        {value.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center">
            <p className="text-sm text-slate-500">
              No {formatFieldName(name).toLowerCase()} added yet.
            </p>
          </div>
        )}

        {value.map((item, index) => (
          <div
            key={index}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-800">
                {formatFieldName(name)} #{index + 1}
              </h4>

              <button
                type="button"
                onClick={() =>
                  removeItem(index)
                }
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600"
              >
                Remove
              </button>
            </div>

            <DynamicField
              name={`${name}_${index}`}
              schema={schema.items!}
              value={item}
              onChange={(newValue) =>
                updateItem(
                  index,
                  newValue
                )
              }
            />
          </div>
        ))}

        <button
          type="button"
          onClick={addItem}
          className="w-full rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
        >
          + Add {formatFieldName(name)}
        </button>
      </div>
    </fieldset>
  );
}

function createEmptyValue(
  schema: JSONSchemaProperty
): unknown {
  switch (schema.type) {
    case "string":
      return "";

    case "number":
    case "integer":
      return undefined;

    case "boolean":
      return false;

    case "object":
      return {};

    case "array":
      return [];

    default:
      return "";
  }
}