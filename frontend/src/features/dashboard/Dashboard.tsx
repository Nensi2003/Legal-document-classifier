import { useEffect, useState } from "react";
import {
  getDocuments,
  type Document,
} from "../documents/api";
 interface DashboardProps {
  onNavigate: (page: string) => void;
}

export function Dashboard({
  onNavigate,
}: DashboardProps) {
 
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    async function loadStatistics() {
      try {
        const documents = await getDocuments();
        setDocuments(documents);
      } catch (error) {
        console.error("Failed to load dashboard statistics:", error);
      } finally {
        setLoadingStats(false);
      }
    }

    loadStatistics();
  }, []);

  const totalDocuments = documents.length;

  const totalDrafts = documents.filter(
    (document) => document.status === "DRAFT"
  ).length;

  const totalCompleted = documents.filter(
    (document) => document.status === "COMPLETED"
  ).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome back
          </h1>

          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Manage your documents and turn them into structured JSON.
          </p>
        </div>

      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Upload Document */}
        <button
          type="button"
          onClick={() => onNavigate("upload")}
          className="
            group
            rounded-xl
            border
            border-slate-200
            bg-white
            p-6
            text-left
            shadow-sm
            transition
            hover:-translate-y-0.5
            hover:border-slate-300
            hover:shadow-md

            dark:border-slate-700
            dark:bg-slate-800
            dark:hover:border-slate-600
          "
        >
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-900 text-xl text-white dark:bg-slate-100 dark:text-slate-900">
            ↑
          </div>

          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Upload Document
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Upload a PDF, Word document, CSV, or image.
          </p>

          <span className="mt-4 inline-block text-sm font-medium text-slate-900 dark:text-slate-100">
            Upload →
          </span>
        </button>

        {/* Batch Upload */}
        <button
          type="button"
          onClick={() => onNavigate("batch-upload")}
          className="
            group
            rounded-xl
            border
            border-slate-200
            bg-white
            p-6
            text-left
            shadow-sm
            transition
            hover:-translate-y-0.5
            hover:border-slate-300
            hover:shadow-md

            dark:border-slate-700
            dark:bg-slate-800
            dark:hover:border-slate-600
          "
        >
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-xl text-slate-700 dark:bg-slate-700 dark:text-slate-200">
            ≡
          </div>

          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Batch Upload
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Process multiple documents at once.
          </p>

          <span className="mt-4 inline-block text-sm font-medium text-slate-900 dark:text-slate-100">
            Upload batch →
          </span>
        </button>
      </div>

      {/* Statistics */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
          Overview
        </h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Documents"
            value={loadingStats ? "—" : totalDocuments}
            description="Uploaded documents"
          />

          <StatCard
            label="Drafts"
            value={loadingStats ? "—" : totalDrafts}
            description="Documents in progress"
          />

          <StatCard
            label="Completed"
            value={loadingStats ? "—" : totalCompleted}
            description="Generated JSON files"
          />
        </div>
      </div>

      {/* Getting started */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          How it works
        </h2>

        <div className="mt-6 grid gap-6 md:grid-cols-4">
          <Step
            number="01"
            title="Upload"
            description="Upload your document."
          />

          <Step
            number="02"
            title="Classify"
            description="Choose the appropriate document type."
          />

          <Step
            number="03"
            title="Complete"
            description="Fill in the structured information."
          />

          <Step
            number="04"
            title="Generate"
            description="Validate and generate JSON."
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
        {description}
      </p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500">
        {number}
      </p>

      <h3 className="mt-2 font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>

      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}