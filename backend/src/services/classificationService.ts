import { db } from "@/prisma/db";
import { classifyDocument } from "@/classification/classifier";

export async function classifyAndMatchDocument(text: string) {
  const suggestions = classifyDocument(text);

  if (suggestions.length === 0) {
    return [];
  }

  const documentTypes = await db.orm.public.DocumentType.all();

  return suggestions
    .map((suggestion) => {
      const documentType = documentTypes.find(
        (type) =>
          type.name === suggestion.documentType &&
          type.domain === suggestion.domain
      );

      if (!documentType) {
        return null;
      }

      return {
        documentTypeId: documentType.id,
        documentType: documentType.name,
        domain: documentType.domain,
        score: suggestion.score,
        matchedKeywords: suggestion.matchedKeywords,
      };
    })
    .filter((suggestion) => suggestion !== null);
}