export interface DetectionRule {
  name: string;
  weight: number;
  matches: (text: string) => boolean;
}

export const detectionRules: DetectionRule[] = [
  {
    name: "document heading",
    weight: 3,
    matches: (text) =>
      /\b(contract|agreement|employment contract|lease agreement)\b/i.test(
        text
      ),
  },

  {
    name: "contract number",
    weight: 3,
    matches: (text) =>
      /\b(contract|agreement)\s*(no\.?|number|#)\s*[:\-]?\s*[A-Z0-9-]+/i.test(
        text
      ),
  },

  {
    name: "document number",
    weight: 2,
    matches: (text) =>
      /\b(document|reference|ref|protocol)\s*(no\.?|number|#)\s*[:\-]?\s*[A-Z0-9-]+/i.test(
        text
      ),
  },

  {
    name: "party information",
    weight: 2,
    matches: (text) =>
      /\b(parties|employer|employee|tenant|landlord|client|contractor)\b/i.test(
        text
      ),
  },
];