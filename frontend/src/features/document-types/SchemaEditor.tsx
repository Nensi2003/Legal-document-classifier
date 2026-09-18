import type {
  JSONSchema,
  JSONSchemaProperty,
} from "../../types/jsonSchema";

interface SchemaEditorProps {
  schema: JSONSchema;
  onChange: (schema: JSONSchema) => void;
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
];

type EditorFieldType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "date"
  | "email"
  | "currency"
  | "textarea"
  | "object"
  | "array";

export function SchemaEditor({
  schema,
  onChange,
}: SchemaEditorProps) {
  function updateProperty(
    propertyName: string,
    updatedProperty: JSONSchemaProperty
  ) {
    onChange({
      ...schema,
      properties: {
        ...schema.properties,
        [propertyName]: updatedProperty,
      },
    });
  }

  function deleteProperty(propertyName: string) {
    const properties = {
      ...schema.properties,
    };

    delete properties[propertyName];

    const required = schema.required?.filter(
      (name) => name !== propertyName
    );

    onChange({
      ...schema,
      properties,
      ...(required && required.length > 0
        ? { required }
        : {}),
    });
  }

  function addProperty() {
    const baseName = "newField";

    let name = baseName;
    let counter = 1;

    while (schema.properties[name]) {
      name = `${baseName}${counter}`;
      counter++;
    }

    onChange({
      ...schema,
      properties: {
        ...schema.properties,
        [name]: {
          type: "string",
          title: name,
        },
      },
    });
  }

  function toggleRequired(propertyName: string) {
    const currentRequired = schema.required ?? [];

    const isRequired =
      currentRequired.includes(propertyName);

    const required = isRequired
      ? currentRequired.filter(
          (name) => name !== propertyName
        )
      : [...currentRequired, propertyName];

    onChange({
      ...schema,
      ...(required.length > 0
        ? { required }
        : {}),
    });
  }

  const properties = Object.entries(
    schema.properties
  );

  return (
    <div className="space-y-6">
      {/* Editor header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">
            Fields
          </h4>

          <p className="mt-1 text-sm text-slate-500">
            Add and configure the fields users will fill in.
          </p>
        </div>

        <button
          type="button"
          onClick={addProperty}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
        >
          <span className="text-base">+</span>
          Add Field
        </button>
      </div>

      {/* Empty */}
      {properties.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg shadow-sm">
            +
          </div>

          <h4 className="text-sm font-semibold text-slate-800">
            No fields yet
          </h4>

          <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
            Add your first field to define the structure
            of this template.
          </p>
        </div>
      )}

      {/* Fields */}
      <div className="space-y-4">
        {properties.map(([name, property]) => (
          <SchemaPropertyEditor
            key={name}
            name={name}
            property={property}
            required={
              schema.required?.includes(name) ?? false
            }
            onChange={(updatedProperty) =>
              updateProperty(
                name,
                updatedProperty
              )
            }
            onDelete={() =>
              deleteProperty(name)
            }
            onToggleRequired={() =>
              toggleRequired(name)
            }
          />
        ))}
      </div>
    </div>
  );
}

interface SchemaPropertyEditorProps {
  name: string;
  property: JSONSchemaProperty;
  required: boolean;
  onChange: (
    property: JSONSchemaProperty
  ) => void;
  onDelete: () => void;
  onToggleRequired: () => void;
}

function SchemaPropertyEditor({
  name,
  property,
  required,
  onChange,
  onDelete,
  onToggleRequired,
}: SchemaPropertyEditorProps) {
  function update(
    changes: Partial<JSONSchemaProperty>
  ) {
    onChange({
      ...property,
      ...changes,
    });
  }

  const editorType = getEditorFieldType(property);

  function changeType(type: EditorFieldType) {
    const updated = createPropertyForType(
      type,
      property
    );

    onChange(updated);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Field header */}
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-semibold text-slate-900">
              {property.title || name}
            </h4>

            {required && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                Required
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-slate-400">
            Field key:{" "}
            <span className="font-mono text-slate-500">
              {name}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={onDelete}
          className="w-fit rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600"
        >
          Delete
        </button>
      </div>

      <div className="space-y-5 p-5">
        {/* Name + display name */}
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Field name
            </label>

            <input
              value={name}
              disabled
              className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-mono text-slate-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Display name
            </label>

            <input
              value={property.title ?? ""}
              onChange={(event) =>
                update({
                  title: event.target.value,
                })
              }
              placeholder="e.g. Full Name"
              className={inputClassName}
            />
          </div>
        </div>

        {/* Type */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Field type
          </label>

          <select
            value={editorType}
            onChange={(event) =>
              changeType(
                event.target.value as EditorFieldType
              )
            }
            className={inputClassName}
          >
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="integer">Integer</option>
            <option value="boolean">Boolean</option>
            <option value="date">Date</option>
            <option value="email">Email</option>
            <option value="currency">Currency</option>
            <option value="textarea">Textarea</option>
            <option value="object">Object</option>
            <option value="array">Array</option>
          </select>
        </div>

        {/* Required */}
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 transition hover:bg-slate-100">
          <input
            type="checkbox"
            checked={required}
            onChange={onToggleRequired}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
          />

          <div>
            <span className="text-sm font-semibold text-slate-700">
              Required field
            </span>

            <p className="text-xs text-slate-400">
              Users must provide a value for this field.
            </p>
          </div>
        </label>

        {/* String options */}
        {editorType === "string" && (
          <StringOptions
            property={property}
            onChange={onChange}
          />
        )}

        {/* Textarea */}
        {editorType === "textarea" && (
          <InfoBox>
            Textarea values are stored as strings in the
            generated JSON.
          </InfoBox>
        )}

        {/* Email */}
        {editorType === "email" && (
          <InfoBox>
            Email format validation will be enabled for
            this field.
          </InfoBox>
        )}

        {/* Date */}
        {editorType === "date" && <DateOptions />}

        {/* Currency */}
        {editorType === "currency" && (
          <CurrencyOptions />
        )}

        {/* Object */}
        {editorType === "object" && (
          <NestedObjectEditor
            property={property}
            onChange={onChange}
          />
        )}

        {/* Array */}
        {editorType === "array" && (
          <ArraySchemaEditor
            property={property}
            onChange={onChange}
          />
        )}
      </div>
    </div>
  );
}

function getEditorFieldType(
  property: JSONSchemaProperty
): EditorFieldType {
  if (property.type === "number") {
    return "number";
  }

  if (property.type === "integer") {
    return "integer";
  }

  if (property.type === "boolean") {
    return "boolean";
  }

  if (property.type === "object") {
    return "object";
  }

  if (property.type === "array") {
    return "array";
  }

  if (
    property.enum &&
    property.enum.length > 0 &&
    property.enum.every((value) =>
      CURRENCY_OPTIONS.includes(value)
    )
  ) {
    return "currency";
  }

  if (property.format === "email") {
    return "email";
  }

  if (
    property.pattern ===
    "^\\d{2}/\\d{2}/\\d{4}$"
  ) {
    return "date";
  }

  return "string";
}

function createPropertyForType(
  type: EditorFieldType,
  previous: JSONSchemaProperty
): JSONSchemaProperty {
  const base = {
    title: previous.title,
  };

  switch (type) {
    case "number":
      return {
        ...base,
        type: "number",
      };

    case "integer":
      return {
        ...base,
        type: "integer",
      };

    case "boolean":
      return {
        ...base,
        type: "boolean",
      };

    case "date":
      return {
        ...base,
        type: "string",
        pattern:
          "^\\d{2}/\\d{2}/\\d{4}$",
      };

    case "email":
      return {
        ...base,
        type: "string",
        format: "email",
      };

    case "currency":
      return {
        ...base,
        type: "string",
        enum: [...CURRENCY_OPTIONS],
      };

    case "textarea":
      return {
        ...base,
        type: "string",
      };

    case "object":
      return {
        ...base,
        type: "object",
        properties:
          previous.properties ?? {},
        ...(previous.required
          ? {
              required:
                previous.required,
            }
          : {}),
      };

    case "array":
      return {
        ...base,
        type: "array",
        items:
          previous.items ?? {
            type: "string",
          },
      };

    case "string":
    default:
      return {
        ...base,
        type: "string",
      };
  }
}

function StringOptions({
  property,
  onChange,
}: {
  property: JSONSchemaProperty;
  onChange: (
    property: JSONSchemaProperty
  ) => void;
}) {
  const enumValues = property.enum ?? [];

  function updateEnumValue(
    index: number,
    value: string
  ) {
    const updatedValues = [...enumValues];

    updatedValues[index] = value;

    onChange({
      ...property,
      enum: updatedValues,
    });
  }

  function addEnumValue() {
    onChange({
      ...property,
      enum: [...enumValues, ""],
    });
  }

  function removeEnumValue(index: number) {
    const updatedValues = enumValues.filter(
      (_, valueIndex) =>
        valueIndex !== index
    );

    onChange({
      ...property,
      enum:
        updatedValues.length > 0
          ? updatedValues
          : undefined,
    });
  }

  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      {/* Regex */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700">
          Validation pattern
        </label>

        <input
          value={property.pattern ?? ""}
          onChange={(event) =>
            onChange({
              ...property,
              pattern:
                event.target.value ||
                undefined,
            })
          }
          placeholder="Optional regular expression"
          className={inputClassName}
        />

        <p className="text-xs text-slate-400">
          Optional regex used to validate the value.
        </p>
      </div>

      {/* Allowed values */}
      <div className="space-y-3">
        <div>
          <h5 className="text-sm font-semibold text-slate-700">
            Allowed values
          </h5>

          <p className="mt-1 text-xs text-slate-400">
            Optional list of values users can choose from.
          </p>
        </div>

        {enumValues.map((value, index) => (
          <div
            key={index}
            className="flex gap-2"
          >
            <input
              type="text"
              value={value}
              onChange={(event) =>
                updateEnumValue(
                  index,
                  event.target.value
                )
              }
              placeholder="Allowed value"
              className={inputClassName}
            />

            <button
              type="button"
              onClick={() =>
                removeEnumValue(index)
              }
              className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600"
            >
              Remove
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addEnumValue}
          className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
        >
          + Add allowed value
        </button>
      </div>
    </div>
  );
}

function DateOptions() {
  return (
    <InfoBox>
      Date format:{" "}
      <span className="font-semibold">
        DD/MM/YYYY
      </span>
    </InfoBox>
  );
}

function CurrencyOptions() {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <p className="text-sm font-semibold text-slate-700">
        Available currencies
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {CURRENCY_OPTIONS.map((currency) => (
          <span
            key={currency}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600"
          >
            {currency}
          </span>
        ))}
      </div>
    </div>
  );
}

function NestedObjectEditor({
  property,
  onChange,
}: {
  property: JSONSchemaProperty;
  onChange: (
    property: JSONSchemaProperty
  ) => void;
}) {
  if (!property.properties) {
    return null;
  }

  function updateNestedProperty(
    name: string,
    updated: JSONSchemaProperty
  ) {
    onChange({
      ...property,
      properties: {
        ...property.properties,
        [name]: updated,
      },
    });
  }

  function deleteNestedProperty(name: string) {
    const properties = {
      ...property.properties,
    };

    delete properties[name];

    const required = property.required?.filter(
      (item) => item !== name
    );

    onChange({
      ...property,
      properties,
      ...(required && required.length > 0
        ? { required }
        : {}),
    });
  }

  function toggleNestedRequired(name: string) {
    const current = property.required ?? [];

    const required = current.includes(name)
      ? current.filter(
          (item) => item !== name
        )
      : [...current, name];

    onChange({
      ...property,
      required:
        required.length > 0
          ? required
          : undefined,
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div>
        <h4 className="text-sm font-semibold text-slate-800">
          Nested Fields
        </h4>

        <p className="mt-1 text-xs text-slate-400">
          Fields contained inside this object.
        </p>
      </div>

      {Object.entries(property.properties).map(
        ([name, nested]) => (
          <SchemaPropertyEditor
            key={name}
            name={name}
            property={nested}
            required={
              property.required?.includes(
                name
              ) ?? false
            }
            onChange={(updated) =>
              updateNestedProperty(
                name,
                updated
              )
            }
            onDelete={() =>
              deleteNestedProperty(name)
            }
            onToggleRequired={() =>
              toggleNestedRequired(name)
            }
          />
        )
      )}

      {Object.keys(property.properties).length ===
        0 && (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-5 text-center text-xs text-slate-500">
          No nested fields yet.
        </p>
      )}
    </div>
  );
}

function ArraySchemaEditor({
  property,
  onChange,
}: {
  property: JSONSchemaProperty;
  onChange: (
    property: JSONSchemaProperty
  ) => void;
}) {
  if (!property.items) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div>
        <h4 className="text-sm font-semibold text-slate-800">
          Array Item
        </h4>

        <p className="mt-1 text-xs text-slate-400">
          Configure the structure of each item in this
          array.
        </p>
      </div>

      <SchemaPropertyEditor
        name="item"
        property={property.items}
        required={false}
        onChange={(updated) =>
          onChange({
            ...property,
            items: updated,
          })
        }
        onDelete={() => {}}
        onToggleRequired={() => {}}
      />
    </div>
  );
}

function InfoBox({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
      {children}
    </div>
  );
}

const inputClassName =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200";