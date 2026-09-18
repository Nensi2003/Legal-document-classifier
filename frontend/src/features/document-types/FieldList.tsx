import { useEffect, useState } from "react";

import {
    deleteField,
    getFields,
    type Field,
} from "./api";

interface FieldListProps {
  documentTypeId: number;
  onEdit: (field: Field) => void;
  onChanged: () => void;
  refreshKey: number;
}

export function FieldList({
  documentTypeId,
  onEdit,
    onChanged,
  refreshKey,
}: FieldListProps) {
  const [fields, setFields] =
    useState<Field[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadFields() {
      try {
        setLoading(true);
        setError("");

        const result =
  await getFields(
    documentTypeId
  );

console.log(
  "Fields loaded:",
  documentTypeId,
  result
);

setFields(result);
      } catch (error) {
        console.error(error);

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load fields"
        );
      } finally {
        setLoading(false);
      }
    }

    loadFields();
  }, [documentTypeId, refreshKey]);

  async function handleDelete(field: Field) {
  const confirmed = window.confirm(
    `Delete "${field.name}"?`
  );

  if (!confirmed) return;

  try {
    await deleteField(field.id);

    setFields((current) =>
      current.filter((item) => item.id !== field.id)
    );

    onChanged();
  } catch (error) {
    console.error(error);
    setError("Failed to delete field.");
  }
}

  if (loading) {
    return <p>Loading fields...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div>
      {fields.length === 0 && (
        <p>
          This template has no fields yet.
        </p>
      )}

      {fields.map((field) => (
        <div key={field.id}>
          <strong>{field.name}</strong>

          <p>
            Type: {field.type}
          </p>

          <p>
            Required:{" "}
            {field.required
              ? "Yes"
              : "No"}
          </p>

          {field.validationRule && (
            <p>
              Validation:{" "}
              {field.validationRule}
            </p>
          )}

          <button
            type="button"
            onClick={() =>
              onEdit(field)
            }
          >
            Edit
          </button>

          <button
            type="button"
            onClick={() =>
              handleDelete(field)
            }
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}