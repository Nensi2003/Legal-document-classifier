import { execFile } from "child_process";
import { promisify } from "util";
import { join, extname } from "path";
import { mkdtemp, readdir, rm } from "fs/promises";
import { tmpdir } from "os";

const execFileAsync = promisify(execFile);

const SOFFICE_PATH =
  process.env.SOFFICE_PATH ??
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe";

export async function withConvertedDocx<T>(
  filePath: string,
  callback: (docxPath: string) => Promise<T>
): Promise<T> {
  const outputDirectory = await mkdtemp(
    join(tmpdir(), "legal-doc-")
  );

  try {
    await execFileAsync(SOFFICE_PATH, [
      "--headless",
      "--convert-to",
      "docx",
      "--outdir",
      outputDirectory,
      filePath,
    ]);

    const outputFiles = await readdir(outputDirectory);

    const convertedFile = outputFiles.find(
      (file) => extname(file).toLowerCase() === ".docx"
    );

    if (!convertedFile) {
      throw new Error(
        "LibreOffice did not produce a DOCX file."
      );
    }

    const convertedPath = join(
      outputDirectory,
      convertedFile
    );

    return await callback(convertedPath);
  } finally {
    await rm(outputDirectory, {
      recursive: true,
      force: true,
    });
  }
}