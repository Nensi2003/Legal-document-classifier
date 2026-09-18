import { useState } from "react";

import {
  createField,
  updateField,
  type Field,
} from "./api";

interface FieldFormProps {
  documentTypeId: number;
  field?: Field;
  onSaved: () => void;
  onCancel: () => void;
}

export function FieldForm({
  documentTypeId,
  field,
  onSaved,
  onCancel,
}: FieldFormProps) {
  const [name, setName] =
    useState(field?.name ?? "");

  const [type, setType] =
    useState(field?.type ?? "string");

  const [required, setRequired] =
    useState(field?.required ?? false);

  const [validationRule, setValidationRule] =
    useState(
      field?.validationRule ?? ""
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");

      if (field) {
        await updateField(field.id, {
          name,
          type,
          required,
          validationRule:
            validationRule || undefined,
        });
      } else {
        await createField({
          name,
          type,
          required,
          validationRule:
            validationRule || undefined,
          documentTypeId,
        });
      }

      onSaved();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to save field"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h4>
        {field ? "Edit Field" : "Add Field"}
      </h4>

      <div>
        <label htmlFor="field-name">
          Field Name
        </label>

        <input
          id="field-name"
          value={name}
          onChange={(event) =>
            setName(event.target.value)
          }
          required
        />
      </div>

      <div>
        <label htmlFor="field-type">
          Type
        </label>

        <select
          id="field-type"
          value={type}
          onChange={(event) =>
            setType(event.target.value)
          }
        >
          <option value="string">
            Text
          </option>

          <option value="number">
            Number
          </option>

          <option value="integer">
            Integer
          </option>

          <option value="boolean">
            Yes / No
          </option>

          <option value="date">
            Date
          </option>

          <option value="email">
            Email
          </option>

          <option value="textarea">
            Long Text
          </option>
        </select>
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={required}
            onChange={(event) =>
              setRequired(
                event.target.checked
              )
            }
          />

          Required
        </label>
      </div>

      <div>
        <label htmlFor="validation-rule">
          Validation Rule
        </label>

        <input
          id="validation-rule"
          value={validationRule}
          onChange={(event) =>
            setValidationRule(
              event.target.value
            )
          }
          placeholder="Optional regex"
        />
      </div>

      {error && <p>{error}</p>}

      <button
        type="submit"
        disabled={loading}
      >
        {loading
          ? "Saving..."
          : field
            ? "Save Field"
            : "Add Field"}
      </button>

      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
      >
        Cancel
      </button>
    </form>
  );
}