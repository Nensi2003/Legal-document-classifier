import type {
  DetectionPage,
  DetectedDocument,
} from "./types";

import {
  detectionRules,
} from "./detectionRules";

function scorePage(page: DetectionPage) {
  const matchedRules: string[] = [];

  let score = 0;

  for (const rule of detectionRules) {
    if (rule.matches(page.text)) {
      score += rule.weight;
      matchedRules.push(rule.name);
    }
  }

  return {
    score,
    matchedRules,
  };
}

export function detectDocumentBoundaries(
  pages: DetectionPage[]
): DetectedDocument[] {
  if (pages.length === 0) {
    return [];
  }

  const scoredPages = pages.map((page) => ({
    ...page,
    ...scorePage(page),
  }));

  /*
   * A page with a sufficiently strong document-start
   * signal becomes a potential new document.
   */
  const startPages = scoredPages.filter(
    (page) => page.score >= 3
  );

  /*
   * If no boundaries are detected, treat the entire
   * uploaded file as one document.
   */
  if (startPages.length === 0) {
    return [
      {
        position: 1,
        startPage: pages[0].pageNumber,
        endPage: pages[pages.length - 1].pageNumber,
        score: 0,
        matchedRules: [],
      },
    ];
  }

  /*
   * Remove duplicate/nearby starts.
   *
   * Two consecutive pages may both contain the same
   * keywords without representing two documents.
   */
  const filteredStarts: typeof startPages = [];

  for (const page of startPages) {
    const previous =
      filteredStarts[filteredStarts.length - 1];

    if (!previous) {
      filteredStarts.push(page);
      continue;
    }

    if (page.pageNumber - previous.pageNumber <= 1) {
      if (page.score > previous.score) {
        filteredStarts[filteredStarts.length - 1] = page;
      }

      continue;
    }

    filteredStarts.push(page);
  }

  return filteredStarts.map((startPage, index) => {
    const nextStart = filteredStarts[index + 1];

    const endPage = nextStart
      ? nextStart.pageNumber - 1
      : pages[pages.length - 1].pageNumber;

    return {
      position: index + 1,
      startPage: startPage.pageNumber,
      endPage,
      score: startPage.score,
      matchedRules: startPage.matchedRules,
    };
  });
}