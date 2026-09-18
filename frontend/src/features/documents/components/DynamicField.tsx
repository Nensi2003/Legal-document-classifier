import type { JSONSchemaProperty } from "../../../types/jsonSchema";
import { formatFieldName } from "../../../utils/formatFieldName";
import { ArrayField } from "./ArrayField";
import { ObjectField } from "./ObjectField";

interface DynamicFieldProps {
  name: string;
  schema: JSONSchemaProperty;
  value: unknown;
  onChange: (value: unknown) => void;
  required?: boolean;
}

export function DynamicField({
  name,
  schema,
  value,
  onChange,
  required = false,
}: DynamicFieldProps) {
  const label =
    schema.title ?? formatFieldName(name);

  /*
   * OBJECT
   */
  if (schema.type === "object") {
    return (
      <ObjectField
        name={name}
        schema={schema}
        value={
          (value as Record<string, unknown>) ?? {}
        }
        onChange={onChange}
      />
    );
  }

  /*
   * ARRAY
   */
  if (schema.type === "array") {
    return (
      <ArrayField
        name={name}
        schema={schema}
        value={
          Array.isArray(value)
            ? value
            : []
        }
        onChange={onChange}
      />
    );
  }

  /*
   * BOOLEAN
   */
  if (schema.type === "boolean") {
    return (
      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 transition hover:bg-slate-100">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) =>
            onChange(
              event.target.checked
            )
          }
          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
        />

        <span className="text-sm font-medium text-slate-700">
          {label}
          {required && (
            <span className="ml-1 text-red-500">
              *
            </span>
          )}
        </span>
      </label>
    );
  }

  /*
   * ENUM
   */
  if (
    schema.type === "string" &&
    schema.enum &&
    schema.enum.length > 0
  ) {
    return (
      <FieldWrapper
        label={label}
        required={required}
        description={schema.description}
      >
        <select
          value={String(value ?? "")}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          className={inputClassName}
        >
          <option value="">
            Select...
          </option>

          {schema.enum.map(
            (option) => (
              <option
                key={option}
                value={option}
              >
                {option}
              </option>
            )
          )}
        </select>
      </FieldWrapper>
    );
  }

  /*
   * NUMBER / INTEGER
   */
  if (
    schema.type === "number" ||
    schema.type === "integer"
  ) {
    return (
      <FieldWrapper
        label={label}
        required={required}
        description={schema.description}
      >
        <input
          type="number"
          step={
            schema.type === "integer"
              ? 1
              : "any"
          }
          min={schema.minimum}
          max={schema.maximum}
          value={
            value === undefined ||
            value === null
              ? ""
              : String(value)
          }
          onChange={(event) => {
            const rawValue =
              event.target.value;

            if (rawValue === "") {
              onChange(undefined);
              return;
            }

            onChange(
              Number(rawValue)
            );
          }}
          className={inputClassName}
        />
      </FieldWrapper>
    );
  }

  /*
   * EMAIL
   */
  if (
    schema.type === "string" &&
    schema.format === "email"
  ) {
    return (
      <FieldWrapper
        label={label}
        required={required}
        description={schema.description}
      >
        <input
          type="email"
          value={String(value ?? "")}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          placeholder="example@email.com"
          className={inputClassName}
        />
      </FieldWrapper>
    );
  }

  /*
   * DATE
   */
  if (
    schema.type === "string" &&
    schema.pattern ===
      "^\\d{2}/\\d{2}/\\d{4}$"
  ) {
    return (
      <FieldWrapper
        label={label}
        required={required}
        description={schema.description}
      >
        <input
          type="text"
          placeholder="DD/MM/YYYY"
          value={String(value ?? "")}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          className={inputClassName}
        />
      </FieldWrapper>
    );
  }

  /*
   * DEFAULT STRING
   */
  return (
    <FieldWrapper
      label={label}
      required={required}
      description={schema.description}
    >
      <input
        type="text"
        value={String(value ?? "")}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className={inputClassName}
      />
    </FieldWrapper>
  );
}

/*
 * Reusable field wrapper
 */
function FieldWrapper({
  label,
  required,
  description,
  children,
}: {
  label: string;
  required: boolean;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      {description && (
        <p className="text-xs leading-5 text-slate-400">
          {description}
        </p>
      )}

      {children}
    </div>
  );
}

/*
 * Shared input styling
 */
const inputClassName =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200";