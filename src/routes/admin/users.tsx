import { pageMeta } from "@/lib/route-meta";
import { useEffect, useMemo, useState } from "react";
import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { SoftwareHeader } from "@/components/dashboard/SoftwareHeader";
import { queue } from "@/components/ui/Toast";
import { GlobalPageLoader } from "@/components/ui/GlobalPageLoader";
import { adminApi, type ApiUser } from "@/lib/api";

export const Route = createFileRoute("/admin/users")({
  head: () => pageMeta('Manage users', 'Review and manage Esportific organizer accounts.'),
  component: AdminUsersPage,
});

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function AdminUsersPage() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (state) => state.location.pathname });
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getUsers()
      .then(setUsers)
      .catch((err) => {
        queue.add(
          {
            title: "Could not load users",
            description: err instanceof Error ? err.message : "Unknown error",
            variant: "error",
          },
          { timeout: 5000 },
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) =>
      [
        user.name,
        user.email,
        user.phone || "",
        user.timezone || "",
      ].some((value) => value.toLowerCase().includes(q)),
    );
  }, [search, users]);

  if (path !== "/admin/users") {
    return <Outlet />;
  }

  return (
    <>
      <SoftwareHeader title="Users" variant="admin" />
      <main className="min-h-0 flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <h1 className="text-[28px] font-semibold tracking-tight text-[#000000]">Users</h1>
              <p className="mt-1 max-w-[540px] text-[14px] text-[#666666]">
                View all registered users on the platform.
              </p>
            </div>
          </div>

          <div className="relative mb-6 max-w-[360px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1b0]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search users..."
              className="h-[40px] w-full rounded-[8px] border-2 border-[#eef0f4] bg-white pl-9 pr-3 text-[14px] outline-none placeholder:text-[#9aa1b0] focus:border-[#000000]"
            />
          </div>

          <div className="overflow-hidden rounded-[10px] border border-[#e2e5ec] bg-white">
            {loading ? (
              <GlobalPageLoader label="Loading users" variant="section" />
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-[15px] font-semibold text-[#000000]">No users found</p>
                <p className="mt-1 text-[14px] text-[#666666]">Try a different search.</p>
              </div>
            ) : (
              <table className="w-full table-fixed text-left text-[13px]">
                <colgroup>
                  <col />
                  <col className="w-[260px]" />
                  <col className="w-[160px]" />
                  <col className="w-[150px]" />
                </colgroup>
                <thead className="border-b border-[#e2e5ec] bg-[#f9fbfc]">
                  <tr>
                    <th className="px-5 py-3 font-medium uppercase tracking-wider text-[#4b5563]">User</th>
                    <th className="px-5 py-3 font-medium uppercase tracking-wider text-[#4b5563]">Contact</th>
                    <th className="px-5 py-3 font-medium uppercase tracking-wider text-[#4b5563]">Timezone</th>
                    <th className="px-5 py-3 text-right font-medium uppercase tracking-wider text-[#4b5563]">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f1f3]">
                  {filtered.map((user) => (
                    <tr
                      key={user._id}
                      onClick={() => navigate({ to: "/admin/users/$userId", params: { userId: user._id } })}
                      className="cursor-pointer hover:bg-[#fcfdfd]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f0f1f3] text-[13px] font-semibold text-[#4b5563]">
                            {(user.name || user.email).slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-semibold text-[#000000]">{user.name}</p>
                            <p className="truncate text-[12px] text-[#9aa1b0]">{user._id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="truncate font-medium text-[#000000]">{user.email}</p>
                        <p className="mt-0.5 truncate text-[12px] text-[#9aa1b0]">{user.phone || "No phone"}</p>
                      </td>
                      <td className="px-5 py-4 text-[#4b5563]">{user.timezone || "-"}</td>
                      <td className="px-5 py-4 text-right text-[#4b5563]">{formatDate(user.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
