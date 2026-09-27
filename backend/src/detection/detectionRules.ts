export interface DetectionRule {
  name: string;
  weight: number;
  matches: (text: string) => boolean;
}

export const detectionRules: DetectionRule[] = [
  /*
   * =========================================================
   * 1. DOCUMENT IDENTITY
   * =========================================================
   */

  {
    name: "document title",
    weight: 4,
    matches: (text) =>
      /\b(resume|curriculum\s+vitae|invoice|receipt|application|report|statement|certificate|letter|agreement|contract|form|claim|proposal|assessment|order|notice)\b/i.test(
        text
      ),
  },

  /*
   * =========================================================
   * 2. STRUCTURAL MARKERS
   * =========================================================
   */

  {
    name: "document section heading",
    weight: 1,
    matches: (text) =>
      /\b(personal\s+information|contact\s+information|professional\s+experience|education|employment\s+history|work\s+experience|summary|introduction|description|details|parties|applicant\s+information|customer\s+information)\b/i.test(
        text
      ),
  },

  {
    name: "date marker",
    weight: 1,
    matches: (text) =>
      /\b(date|issued|issue\s+date|effective\s+date|submitted)\s*[:\-]/i.test(
        text
      ),
  },

  {
    name: "prepared/submitted marker",
    weight: 1,
    matches: (text) =>
      /\b(prepared\s+by|submitted\s+by|created\s+by|issued\s+by)\s*[:\-]/i.test(
        text
      ),
  },

  /*
   * =========================================================
   * 3. DOCUMENT METADATA / NUMBERING
   * =========================================================
   */

  {
    name: "document number",
    weight: 3,
    matches: (text) =>
      /\b(document|reference|ref|case|application|invoice|claim|order)\s*(no\.?|number|#)\s*[:\-]?\s*[A-Z0-9][A-Z0-9\-\/]*/i.test(
        text
      ),
  },

  {
    name: "identifier marker",
    weight: 2,
    matches: (text) =>
      /\b(ID|identifier|reference\s+ID|record\s+ID)\s*[:\-]\s*[A-Z0-9][A-Z0-9\-\/]*/i.test(
        text
      ),
  },

  /*
   * =========================================================
   * 4. PARTY / CONTACT INFORMATION
   * =========================================================
   */

  {
    name: "party information",
    weight: 2,
    matches: (text) =>
      /\b(employer|employee|tenant|landlord|client|contractor|applicant|customer|patient|recipient|sender)\s*[:\-]/i.test(
        text
      ),
  },

  {
    name: "contact details",
    weight: 2,
    matches: (text) =>
      /\b(email|e-mail|phone|telephone|mobile|address)\s*[:\-]/i.test(
        text
      ),
  },
];