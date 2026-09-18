import { useState } from "react";

import {
  updateDocumentType,
  type DocumentType,
} from "./api";

interface EditTemplateFormProps {
  documentType: DocumentType;
  onUpdated: () => void;
  onCancel: () => void;
}

export function EditTemplateForm({
  documentType,
  onUpdated,
  onCancel,
}: EditTemplateFormProps) {
  const [name, setName] =
    useState(documentType.name);

  const [domain, setDomain] =
    useState(documentType.domain);

  const [description, setDescription] =
    useState(
      documentType.description ?? ""
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

      await updateDocumentType(
        documentType.id,
        {
          name,
          domain,
          description,
        }
      );

      onUpdated();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to update template"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3>Edit Template</h3>

      <div>
        <label htmlFor="edit-template-name">
          Name
        </label>

        <input
          id="edit-template-name"
          type="text"
          value={name}
          onChange={(event) =>
            setName(event.target.value)
          }
          required
        />
      </div>

      <div>
        <label htmlFor="edit-template-domain">
          Domain
        </label>

        <input
          id="edit-template-domain"
          type="text"
          value={domain}
          onChange={(event) =>
            setDomain(event.target.value)
          }
          required
        />
      </div>

      <div>
        <label htmlFor="edit-template-description">
          Description
        </label>

        <textarea
          id="edit-template-description"
          value={description}
          onChange={(event) =>
            setDescription(event.target.value)
          }
        />
      </div>

      {error && <p>{error}</p>}

      <button
        type="submit"
        disabled={loading}
      >
        {loading
          ? "Saving..."
          : "Save Changes"}
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