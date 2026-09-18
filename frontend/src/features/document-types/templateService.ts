import {
  getFields,
  updateDocumentType,
  type Field,
} from "./api";
import { generateJSONSchema } from "./schemaGenerator";

export async function syncTemplateSchema(
  documentTypeId: number,
  fields?: Field[]
) {
  const currentFields =
    fields ?? (await getFields(documentTypeId));

  const schema = generateJSONSchema(currentFields);

  await updateDocumentType(documentTypeId, {
    jsonSchema: schema,
  });

  return schema;
}