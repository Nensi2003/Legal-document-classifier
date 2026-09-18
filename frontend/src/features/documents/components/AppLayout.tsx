import type { ReactNode } from "react";

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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
          <div className="flex h-20 items-center border-b border-slate-200 px-6">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                LegalDoc
              </h1>
              <p className="text-xs text-slate-500">
                Document Intelligence
              </p>
            </div>
          </div>

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
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="my-6 border-t border-slate-200" />

            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Actions
            </p>

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => onNavigate("upload")}
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                + Upload Document
              </button>

              <button
                type="button"
                onClick={() => onNavigate("batch-upload")}
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                + Batch Upload
              </button>
            </div>
          </nav>

          {/* User section */}
          <div className="border-t border-slate-200 p-4">
            <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2">
              <p className="truncate text-sm font-medium text-slate-900">
                {userName || "User"}
              </p>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600"
            >
              Log out
            </button>
          </div>
        </aside>

        {/* Main area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-6">
            <div>
              <p className="text-sm text-slate-500">
                Document management
              </p>
              <h2 className="text-lg font-semibold">
                {getPageTitle(currentPage)}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate("upload")}
                className="hidden rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 sm:block"
              >
                + Upload
              </button>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
                {getInitial(userName)}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 p-6 lg:p-8">
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