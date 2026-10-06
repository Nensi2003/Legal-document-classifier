import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getStoredFilePath } from "@/lib/fileStorage";
import { db } from "@/prisma/db";
import { getAccessibleDocumentById } from "@/services/documentAccessService";

export const runtime = "nodejs";
const execFileAsync = promisify(execFile);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; instanceId: string }> },
) {
  let temporaryDirectory: string | undefined;
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { id, instanceId: instanceIdParam } = await params;
    const documentId = Number(id);
    const instanceId = Number(instanceIdParam);
    const page = Number(request.nextUrl.searchParams.get("page"));
    if (![documentId, instanceId, page].every(Number.isInteger) || documentId <= 0 || instanceId <= 0 || page <= 0) {
      return NextResponse.json({ error: "Invalid document, instance, or page" }, { status: 400 });
    }

    const document = await getAccessibleDocumentById(documentId, user.id);
    if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
    if (document.mimeType !== "application/pdf") {
      return NextResponse.json({ error: "Page-range preview is only available for PDF documents. Open the original file to review it." }, { status: 415 });
    }

    const instance = await db.orm.public.DocumentInstance
      .where({ id: instanceId, documentId }).first();
    if (!instance) return NextResponse.json({ error: "Document instance not found" }, { status: 404 });
    if (page < instance.startPage || page > instance.endPage) {
      return NextResponse.json({ error: `Choose a page from ${instance.startPage} to ${instance.endPage}.` }, { status: 400 });
    }

    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "document-instance-preview-"));
    const outputPrefix = path.join(temporaryDirectory, "page");
    await execFileAsync("pdftoppm", [
      "-f", String(page), "-l", String(page), "-scale-to", "1600", "-png", "-singlefile",
      getStoredFilePath(document.filePath), outputPrefix,
    ], { timeout: 20_000, maxBuffer: 1024 * 1024 });

    const image = await readFile(`${outputPrefix}.png`);
    return new NextResponse(new Uint8Array(image), {
      status: 200,
      headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Instance page preview error:", error);
    return NextResponse.json({ error: "Could not render this page preview. Open the original PDF to review it." }, { status: 500 });
  } finally {
    if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true }).catch(() => undefined);
  }
}
