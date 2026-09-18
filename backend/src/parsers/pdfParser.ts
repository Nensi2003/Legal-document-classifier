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
    mergePages: true,
  });

  return {
    text: result.text.trim(),
    metadata: {
      pages: result.totalPages,
    },
  };
}