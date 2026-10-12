import type { ParsedDocument } from "./types";
import { parsePdf } from "./pdfParser";
import { parseDocx } from "./docxParser";
import { parseCsv } from "./csvParser";
import { UnsupportedDocumentTypeError } from "./parserErrors";
import { parseImage } from "./imageParser";
import { parseDoc } from "./docParser";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export async function parseDocument(
  filePath: string | Buffer,
  mimeType: string
): Promise<ParsedDocument> {
  switch (mimeType) {
    case "application/pdf":
      return parsePdf(filePath);

    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return parseDocx(filePath);

    case "text/csv":
      return parseCsv(filePath);

    case "image/jpeg":
    case "image/png":
      return parseImage(filePath);

    case "application/msword":
      if (typeof filePath === "string") return parseDoc(filePath);
      {
        const directory = await mkdtemp(path.join(tmpdir(), "legal-document-doc-"));
        const temporaryPath = path.join(directory, "source.doc");
        try {
          await writeFile(temporaryPath, filePath);
          return await parseDoc(temporaryPath);
        } finally {
          await rm(directory, { recursive: true, force: true });
        }
      }

    default:
      throw new UnsupportedDocumentTypeError(mimeType);
  }
}
