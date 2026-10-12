import path from "path";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { decodeSharePointFileReference, readSharePointFile } from "@/lib/sharePointStorage";

export function getStoredFilePath(filePath: string): string {
  if (decodeSharePointFileReference(filePath)) {
    throw new Error("SharePoint-backed documents must be read through the storage adapter");
  }
  if (path.isAbsolute(filePath)) {
    return filePath;
  }

  return path.join(process.cwd(), filePath);
}

export async function readStoredFile(filePath: string): Promise<Buffer> {
  if (decodeSharePointFileReference(filePath)) return readSharePointFile(filePath);
  return readFile(getStoredFilePath(filePath));
}

/** Materialize a remote file only for tools that require a filesystem path. */
export async function withStoredFilePath<T>(filePath: string, useFile: (localPath: string) => Promise<T>, fileName?: string): Promise<T> {
  if (!decodeSharePointFileReference(filePath)) return useFile(getStoredFilePath(filePath));

  const directory = await mkdtemp(path.join(tmpdir(), "legal-document-"));
  const extension = fileName ? path.extname(fileName) : "";
  const localPath = path.join(directory, `source${extension}`);
  try {
    await writeFile(localPath, await readSharePointFile(filePath));
    return await useFile(localPath);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
