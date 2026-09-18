import { useState } from "react";

import { createDocumentType } from "./api";

interface CreateTemplateFormProps {
  onCreated: () => void;
  onCancel: () => void;
}

export function CreateTemplateForm({
  onCreated,
  onCancel,
}: CreateTemplateFormProps) {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [description, setDescription] =
    useState("");

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

      await createDocumentType({
        name,
        domain,
        description,
        jsonSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
      });

      onCreated();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to create template"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3>Create Template</h3>

      <div>
        <label htmlFor="template-name">
          Name
        </label>

        <input
          id="template-name"
          type="text"
          value={name}
          onChange={(event) =>
            setName(event.target.value)
          }
          required
        />
      </div>

      <div>
        <label htmlFor="template-domain">
          Domain
        </label>

        <input
          id="template-domain"
          type="text"
          value={domain}
          onChange={(event) =>
            setDomain(event.target.value)
          }
          required
        />
      </div>

      <div>
        <label htmlFor="template-description">
          Description
        </label>

        <textarea
          id="template-description"
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
          ? "Creating..."
          : "Create Template"}
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