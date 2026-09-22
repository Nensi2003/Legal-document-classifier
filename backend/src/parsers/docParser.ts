import { parseDocx } from "./docxParser";
import { withConvertedDocx } from "./docConverter";

export async function parseDoc(filePath: string) {
  return withConvertedDocx(filePath, (docxPath) =>
    parseDocx(docxPath)
  );
}