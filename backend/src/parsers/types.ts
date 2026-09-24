export interface ParsedPage {
  pageNumber: number;
  text: string;
}

export interface ParsedDocument {
  text: string;
  pages?: ParsedPage[];
  metadata?: Record<string, unknown>;
  warnings?: string[];
}