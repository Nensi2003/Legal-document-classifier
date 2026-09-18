import { readFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";
import type { ParsedDocument } from "./types";

export async function parseCsv(
  filePath: string
): Promise<ParsedDocument> {
  const file = await readFile(filePath, "utf-8");

  const records = parse(file, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  return {
    text: JSON.stringify(records, null, 2),
    metadata: {
      rows: records.length,
      columns:
        records.length > 0
          ? Object.keys(records[0]).length
          : 0,
    },
  };
}