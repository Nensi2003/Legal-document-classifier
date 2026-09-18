import { useEffect, useState } from "react";

interface DocumentPreviewProps {
  documentId: number;
  fileName: string;
  mimeType: string;
}

interface DocxPreview {
  type: "docx";
  html: string;
}

interface CsvPreview {
  type: "csv";
  rows: unknown[][];
}

type PreviewData =
  | DocxPreview
  | CsvPreview;

export function DocumentPreview({
  documentId,
  fileName,
  mimeType,
}: DocumentPreviewProps) {
  const fileUrl =
    `http://localhost:3000/api/documents/${documentId}/file`;

  /*
   * ---------------------------------------------------------
   * DOCX / CSV state
   * ---------------------------------------------------------
   */
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const needsPreviewApi =
  mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
  mimeType === "text/csv";


  /*
   * ---------------------------------------------------------
   * Load DOCX / CSV preview
   * ---------------------------------------------------------
   */
 useEffect(() => {
  if (!needsPreviewApi) {
    return;
  }

  let cancelled = false;

  async function loadPreview() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `http://localhost:3000/api/documents/${documentId}/preview`,
        {
          credentials: "include",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to load preview");
      }

      if (!cancelled) {
        setPreviewData(result);
      }
    } catch (error) {
      if (!cancelled) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load document preview"
        );
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  loadPreview();

  return () => {
    cancelled = true;
  };
}, [documentId, needsPreviewApi]);


  /*
   * ---------------------------------------------------------
   * PDF
   * ---------------------------------------------------------
   */
  if (mimeType === "application/pdf") {
    return (
      <iframe
        src={fileUrl}
        title={fileName}
        className="h-full min-h-[650px] w-full border-0 bg-white"
      />
    );
  }


  /*
   * ---------------------------------------------------------
   * Images
   * ---------------------------------------------------------
   */
  if (mimeType.startsWith("image/")) {
    return (
      <div className="flex min-h-[650px] items-start justify-center bg-white p-6">

        <img
          src={fileUrl}
          alt={fileName}
          className="max-h-[620px] max-w-full rounded-lg object-contain shadow-sm"
        />

      </div>
    );
  }


  /*
   * ---------------------------------------------------------
   * Loading DOCX / CSV
   * ---------------------------------------------------------
   */
  if (loading) {
    return (
      <div className="flex min-h-[650px] items-center justify-center bg-white">

        <div className="text-center">

          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

          <p className="text-sm text-slate-500">
            Preparing document preview...
          </p>

        </div>

      </div>
    );
  }


  /*
   * ---------------------------------------------------------
   * Error
   * ---------------------------------------------------------
   */
  if (error) {
    return (
      <div className="flex min-h-[650px] items-center justify-center bg-white p-8 text-center">

        <div>

          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl">
            !
          </div>

          <h3 className="font-semibold text-slate-800">
            Preview unavailable
          </h3>

          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
            {error}
          </p>

        </div>

      </div>
    );
  }


  /*
   * ---------------------------------------------------------
   * DOCX
   * ---------------------------------------------------------
   */
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
    previewData?.type === "docx"
  ) {
    return (
      <div className="min-h-[650px] bg-slate-200 p-6">

        <article
          className="
            mx-auto
            min-h-[600px]
            max-w-[800px]
            bg-white
            px-12
            py-10
            shadow-sm
            sm:px-16
            sm:py-12
          "
        >
          <div
            className="
              prose
              prose-slate
              max-w-none
              text-sm
              leading-7
            "
            dangerouslySetInnerHTML={{
              __html: previewData.html,
            }}
          />
        </article>

      </div>
    );
  }


  /*
   * ---------------------------------------------------------
   * CSV
   * ---------------------------------------------------------
   */
  if (
    mimeType === "text/csv" &&
    previewData?.type === "csv"
  ) {
    return (
      <div className="min-h-[650px] bg-white p-5">

        {previewData.rows.length === 0 ? (
          <div className="flex min-h-[500px] items-center justify-center text-sm text-slate-500">
            The CSV file is empty.
          </div>
        ) : (
          <div className="overflow-auto rounded-lg border border-slate-200">

            <table className="min-w-full border-collapse text-sm">

              <thead className="sticky top-0 bg-slate-100">

                <tr>
                  {previewData.rows[0].map(
                    (_, index) => (
                      <th
                        key={index}
                        className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                      >
                        {String(
                          previewData.rows[0][index] ??
                            ""
                        )}
                      </th>
                    )
                  )}
                </tr>

              </thead>

              <tbody>

                {previewData.rows
                  .slice(1)
                  .map(
                    (row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        className="transition hover:bg-slate-50"
                      >

                        {row.map(
                          (
                            cell,
                            cellIndex
                          ) => (
                            <td
                              key={cellIndex}
                              className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-slate-700"
                            >
                              {String(
                                cell ?? ""
                              )}
                            </td>
                          )
                        )}

                      </tr>
                    )
                  )}

              </tbody>

            </table>

          </div>
        )}

      </div>
    );
  }


  /*
   * ---------------------------------------------------------
   * Unsupported
   * ---------------------------------------------------------
   */
  return (
    <div className="flex min-h-[650px] items-center justify-center bg-white p-8 text-center">

      <div>

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
          📄
        </div>

        <h3 className="font-semibold text-slate-800">
          Preview not available
        </h3>

        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
          This document format cannot be displayed
          in the preview.
        </p>

      </div>

    </div>
  );
}