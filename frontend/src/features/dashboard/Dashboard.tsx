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
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Welcome back
        </h1>

        <p className="mt-2 text-slate-500">
          Manage your documents and turn them into structured JSON.
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => onNavigate("upload")}
          className="group rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
        >
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-900 text-xl text-white">
            ↑
          </div>

          <h2 className="text-lg font-semibold text-slate-900">
            Upload Document
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Upload a PDF, Word document, CSV, or image.
          </p>

          <span className="mt-4 inline-block text-sm font-medium text-slate-900">
            Upload →
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("batch-upload")}
          className="group rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
        >
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-xl text-slate-700">
            ≡
          </div>

          <h2 className="text-lg font-semibold text-slate-900">
            Batch Upload
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Process multiple documents at once.
          </p>

          <span className="mt-4 inline-block text-sm font-medium text-slate-900">
            Upload batch →
          </span>
        </button>
      </div>

      {/* Statistics */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
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
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
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
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
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
      <p className="text-xs font-bold tracking-wider text-slate-400">
        {number}
      </p>

      <h3 className="mt-2 font-semibold text-slate-900">
        {title}
      </h3>

      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}