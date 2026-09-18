import { DOCUMENT_TYPE_RULES } from "./rules";
import type { ClassificationSuggestion } from "./types";

export function classifyDocument(
  text: string
): ClassificationSuggestion[] {
  const normalizedText = text.toLowerCase();

  const suggestions: ClassificationSuggestion[] = [];

  for (const ruleSet of DOCUMENT_TYPE_RULES) {
    let score = 0;
    const matchedKeywords: string[] = [];

    for (const rule of ruleSet.rules) {
      if (normalizedText.includes(rule.keyword.toLowerCase())) {
        score += rule.weight;
        matchedKeywords.push(rule.keyword);
      }
    }

    if (score >= 4) {
      suggestions.push({
        domain: ruleSet.domain,
        documentType: ruleSet.documentType,
        score,
        matchedKeywords,
      });
    }
  }

  return suggestions.sort(
    (a, b) => b.score - a.score
  );
}