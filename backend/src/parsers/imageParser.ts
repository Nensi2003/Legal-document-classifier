import { readFile } from "node:fs/promises";
import path from "node:path";
import { createWorker } from "tesseract.js";
import type { ParsedDocument } from "./types";

export async function parseImage(
  filePath: string
): Promise<ParsedDocument> {
  const image = await readFile(filePath);

  const workerPath = path.join(
    process.cwd(),
    "node_modules",
    "tesseract.js",
    "src",
    "worker-script",
    "node",
    "index.js"
  );

  const worker = await createWorker("eng", 1, {
    workerPath,
  });

  try {
    const result = await worker.recognize(image);

    return {
      text: result.data.text.trim(),
      metadata: {
        confidence: result.data.confidence,
      },
    };
  } finally {
    await worker.terminate();
  }
}