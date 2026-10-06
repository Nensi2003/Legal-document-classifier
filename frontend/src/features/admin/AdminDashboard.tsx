import { useEffect, useState } from "react";
import {
  getAdminStats,
  getAdminUsers,
  type AdminStats,
  type AdminUser,
} from "./api";

interface AdminDashboardProps {
  onNavigate: (page: string) => void;
}

export function AdminDashboard({
  onNavigate,
}: AdminDashboardProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAdminData() {
      try {
        setLoading(true);
        setError(null);

        const [statsData, usersData] =
          await Promise.all([
            getAdminStats(),
            getAdminUsers(),
          ]);

        setStats(statsData);
        setUsers(usersData);
      } catch (error) {
        console.error("Failed to load admin data:", error);
        setError("Failed to load admin dashboard data.");
      } finally {
        setLoading(false);
      }
    }

    loadAdminData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

          <p className="text-sm text-slate-500">
            Loading admin dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h2 className="font-semibold text-red-800">
          Error
        </h2>

        <p className="mt-2 text-sm text-red-600">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Admin Dashboard
        </h1>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage users and publish documents for ordinary users to process.
        </p>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

        <StatCard
          title="Total Users"
          value={stats?.totalUsers ?? 0}
        />

        <StatCard
          title="Total Documents"
          value={stats?.totalDocuments ?? 0}
        />

        <StatCard
          title="Document Types"
          value={stats?.totalDocumentTypes ?? 0}
        />

        <StatCard
          title="Completed"
          value={stats?.completedDocuments ?? 0}
        />

        <StatCard
          title="Drafts"
          value={stats?.draftDocuments ?? 0}
        />

        <StatCard
          title="Pending"
          value={stats?.pendingDocuments ?? 0}
        />

      </div>

      {/* Quick actions */}
      {/* Quick actions */}
<div>
  <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
    Administration
  </h2>

  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">

    <AdminAction
      title="Users"
      description="View registered users and their roles."
      onClick={() => onNavigate("admin-users")}
    />

    <AdminAction
      title="Documents"
      description="View published documents and upload activity."
      onClick={() => onNavigate("admin-documents")}
    />

    <AdminAction
      title="Document Types"
      description="View document types and export combined JSON data."
      onClick={() => onNavigate("admin-document-types")}
    />

    <AdminAction
      title="Publish Document"
      description="Make one document available for users to process."
      onClick={() => onNavigate("upload")}
    />

    <AdminAction
      title="Publish Batch"
      description="Make several documents available together."
      onClick={() => onNavigate("batch-upload")}
    />

  </div>
</div>

      {/* Users preview */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">

          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">
              Recent Users
            </h2>

            <p className="text-sm text-slate-500">
              Registered users in the system
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate("admin-users")}
            className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            View all
          </button>

        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">

          {users.slice(0, 5).map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-5"
            >
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  {user.name || "Unnamed user"}
                </p>

                <p className="text-sm text-slate-500">
                  {user.email}
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {user.role}
              </span>
            </div>
          ))}

          {users.length === 0 && (
            <div className="p-6 text-center text-sm text-slate-500">
              No users found.
            </div>
          )}

        </div>
      </div>

    </div>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

      <p className="text-sm text-slate-500 dark:text-slate-400">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
        {value}
      </p>

    </div>
  );
}

function AdminAction({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-slate-400 hover:shadow dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-600"
    >
      <h3 className="font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>

      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </button>
  );
}
