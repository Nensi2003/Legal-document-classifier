export interface DetectionPage {
  pageNumber: number;
  text: string;
}

export interface DetectedDocument {
  position: number;
  startPage: number;
  endPage: number;
  score: number;
  matchedRules: string[];
}