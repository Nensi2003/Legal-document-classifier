import type { ReactNode } from "react";
import { useTheme } from "../../../hooks/useTheme";

interface AppLayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  userName?: string | null;
  onLogout: () => void;
}

export function AppLayout({
  children,
  currentPage,
  onNavigate,
  userName,
  onLogout,
}: AppLayoutProps) {
  const { theme, toggleTheme } = useTheme();

  const navigation = [
    {
      label: "Dashboard",
      page: "dashboard",
    },
    {
      label: "My Documents",
      page: "documents",
    },
    {
      label: "My Drafts",
      page: "drafts",
    },
    {
      label: "Templates",
      page: "templates",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="flex min-h-screen">

        {/* Sidebar */}
        <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white transition-colors dark:border-slate-800 dark:bg-slate-900 md:flex">

          {/* Logo */}
          <div className="flex h-20 items-center border-b border-slate-200 px-6 dark:border-slate-800">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                LegalDoc
              </h1>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Document Intelligence
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">

            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Workspace
            </p>

            <div className="space-y-1">
              {navigation.map((item) => {
                const active = currentPage === item.page;

                return (
                  <button
                    key={item.page}
                    type="button"
                    onClick={() => onNavigate(item.page)}
                    className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                      active
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="my-6 border-t border-slate-200 dark:border-slate-800" />

            {/* Actions */}
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Actions
            </p>

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => onNavigate("upload")}
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                + Upload Document
              </button>

              <button
                type="button"
                onClick={() => onNavigate("batch-upload")}
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                + Batch Upload
              </button>
            </div>
          </nav>

          {/* User section */}
          <div className="border-t border-slate-200 p-4 dark:border-slate-800">

            <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                {userName || "User"}
              </p>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
            >
              Log out
            </button>
          </div>
        </aside>

        {/* Main area */}
        <div className="flex min-w-0 flex-1 flex-col">

          {/* Top bar */}
          <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-6 transition-colors dark:border-slate-800 dark:bg-slate-900">

            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Document management
              </p>

              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {getPageTitle(currentPage)}
              </h2>
            </div>

            <div className="flex items-center gap-3">

              {/* Upload */}
              <button
                type="button"
                onClick={() => onNavigate("upload")}
                className="hidden rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 sm:block"
              >
                + Upload
              </button>

              {/* Theme toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={
                  theme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
                title={
                  theme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {theme === "dark" ? "☀️" : "🌙"}
              </button>

              {/* User avatar */}
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                {getInitial(userName)}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 p-6 transition-colors dark:bg-slate-950 lg:p-8">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function getPageTitle(page: string): string {
  switch (page) {
    case "dashboard":
      return "Dashboard";

    case "documents":
      return "My Documents";

    case "drafts":
      return "My Drafts";

    case "templates":
      return "Templates";

    case "upload":
      return "Upload Document";

    case "batch-upload":
      return "Batch Upload";

    case "document":
      return "Document Workspace";

    default:
      return "LegalDoc";
  }
}

function getInitial(name?: string | null): string {
  if (!name) {
    return "U";
  }

  return name.charAt(0).toUpperCase();
}