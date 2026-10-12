import { readFile } from "node:fs/promises";
import mammoth from "mammoth";
import type { ParsedDocument } from "./types";

export async function parseDocx(
  filePath: string | Buffer
): Promise<ParsedDocument> {
  const buffer = typeof filePath === "string" ? await readFile(filePath) : filePath;

  const result = await mammoth.extractRawText({
    buffer,
  });

  return {
    text: result.value.trim(),
    warnings: result.messages.map((message) => message.message),
  };
}
