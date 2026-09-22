import type { ParsedDocument } from "./types";
import { parsePdf } from "./pdfParser";
import { parseDocx } from "./docxParser";
import { parseCsv } from "./csvParser";
import { UnsupportedDocumentTypeError } from "./parserErrors";
import { parseImage } from "./imageParser";
import { parseDoc } from "./docParser";

export async function parseDocument(
  filePath: string,
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
  return parseDoc(filePath);

    default:
      throw new UnsupportedDocumentTypeError(mimeType);
  }
}