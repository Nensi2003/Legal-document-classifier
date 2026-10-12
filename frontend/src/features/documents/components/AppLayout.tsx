import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useTheme } from "../../../hooks/useTheme";
import { changePassword } from "../../auth/api";

interface AppLayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  userName?: string | null;
  userRole?: string;
  onLogout: () => void;
}

export function AppLayout({
  children,
  currentPage,
  onNavigate,
  userName,
  userRole,
  onLogout,
}: AppLayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isAdmin = userRole === "ADMIN";

  useEffect(() => {
    function closeMenuOnOutsideClick(event: MouseEvent) {
      if (!userMenuRef.current?.contains(event.target as Node)) setUserMenuOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
        setChangePasswordOpen(false);
      }
    }
    document.addEventListener("mousedown", closeMenuOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenuOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  async function submitPasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPasswordError("");
    setPasswordSuccess("");
    const formData = new FormData(form);
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    if (newPassword !== confirmPassword) {
      setPasswordError("The new passwords do not match.");
      return;
    }
    setPasswordSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess("Your password has been changed.");
      form.reset();
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Unable to change password.");
    } finally {
      setPasswordSaving(false);
    }
  }

  const navigation =
  userRole === "ADMIN"
    ? [
        {
          label: "Admin Dashboard",
          page: "admin-dashboard",
        },
      ]
    : [
        {
          label: "Dashboard",
          page: "dashboard",
        },
        {
          label: "Documents",
          page: "documents",
        },
        {
          label: "Templates",
          page: "templates",
        },
      ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex min-h-screen">

        {/* =========================
            SIDEBAR
        ========================== */}
        <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">

          {/* Logo */}
          <div className="flex h-20 shrink-0 items-center border-b border-slate-200 px-6 dark:border-slate-800">
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
          <nav className="flex-1 overflow-y-auto p-4">

            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              {isAdmin ? "Administration" : "Workspace"}
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

            {/* User actions */}
            {!isAdmin && (
              <>
                <div className="my-6 border-t border-slate-200 dark:border-slate-800" />

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
              </>
            )}
          </nav>

          {/* User section */}
          <div className="shrink-0 border-t border-slate-200 p-4 dark:border-slate-800">

            <div className="mb-3 flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-3 dark:bg-slate-800">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                {getInitial(userName)}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                  {userName || "User"}
                </p>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isAdmin ? "Administrator" : "User"}
                </p>
              </div>
            </div>

          </div>
        </aside>

        {/* =========================
            MAIN AREA
        ========================== */}
        <div className="flex min-w-0 flex-1 flex-col">

          {/* Top bar */}
          <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900">

            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isAdmin
                  ? "Administration"
                  : "Document management"}
              </p>

              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {getPageTitle(currentPage)}
              </h2>
            </div>

            <div className="flex items-center gap-3">

              {/* Upload button for normal users */}
              {!isAdmin && (
                <button
                  type="button"
                  onClick={() => onNavigate("upload")}
                  className="hidden rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 sm:block"
                >
                  + Upload
                </button>
              )}

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

              {/* User menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  aria-label="Open user menu"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  onClick={() => setUserMenuOpen((open) => !open)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700 transition hover:ring-2 hover:ring-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:ring-slate-600"
                >
                  {getInitial(userName)}
                </button>
                {userMenuOpen && (
                  <div role="menu" className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    <p className="truncate px-3 py-2 text-xs text-slate-500 dark:text-slate-400">{userName || "User"}</p>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setPasswordError("");
                        setPasswordSuccess("");
                        setChangePasswordOpen(true);
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Change password
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { setUserMenuOpen(false); onLogout(); }}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto bg-slate-50 p-6 dark:bg-slate-950 lg:p-8">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
      {changePasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setChangePasswordOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="change-password-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="change-password-title" className="text-xl font-semibold text-slate-900 dark:text-white">Change password</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Enter your current password and choose a new one.</p>
              </div>
              <button type="button" aria-label="Close change password" onClick={() => setChangePasswordOpen(false)} className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">✕</button>
            </div>
            <form className="space-y-4" onSubmit={submitPasswordChange}>
              <PasswordInput name="currentPassword" label="Current password" autoComplete="current-password" />
              <PasswordInput name="newPassword" label="New password" autoComplete="new-password" minLength={8} />
              <PasswordInput name="confirmPassword" label="Confirm new password" autoComplete="new-password" minLength={8} />
              {passwordError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{passwordError}</p>}
              {passwordSuccess && <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-300">{passwordSuccess}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setChangePasswordOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Close</button>
                <button type="submit" disabled={passwordSaving} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-900">{passwordSaving ? "Saving…" : "Update password"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function PasswordInput({ name, label, autoComplete, minLength }: { name: string; label: string; autoComplete: string; minLength?: number }) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
      {label}
      <input name={name} type="password" required minLength={minLength} autoComplete={autoComplete} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-slate-700" />
    </label>
  );
}

function getPageTitle(page: string): string {
  switch (page) {
    case "dashboard":
      return "Dashboard";

    case "admin-dashboard":
      return "Admin Dashboard";

    case "documents":
      return "Documents";

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
