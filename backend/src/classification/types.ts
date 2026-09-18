export interface ClassificationRule {
  keyword: string;
  weight: number;
}

export interface DocumentTypeRuleSet {
  domain: string;
  documentType: string;
  rules: ClassificationRule[];
}

export interface ClassificationSuggestion {
  domain: string;
  documentType: string;
  score: number;
  matchedKeywords: string[];
}