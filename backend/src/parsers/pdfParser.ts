import { readFile } from "node:fs/promises";
import { extractText, getDocumentProxy } from "unpdf";
import type { ParsedDocument } from "./types";

export async function parsePdf(
  filePath: string
): Promise<ParsedDocument> {
  const buffer = await readFile(filePath);

  const pdf = await getDocumentProxy(
    new Uint8Array(buffer)
  );

  const result = await extractText(pdf, {
    mergePages: false,
  });

  const pages = result.text.map((text, index) => ({
    pageNumber: index + 1,
    text: text.trim(),
  }));

  return {
    text: pages.map((page) => page.text).join("\n\n").trim(),
    pages,
    metadata: {
      pages: result.totalPages,
    },
  };
}