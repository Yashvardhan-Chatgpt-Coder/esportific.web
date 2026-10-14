import { pageMeta } from "@/lib/route-meta";
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Headset, RefreshCw } from "lucide-react";
import { SoftwareHeader } from "@/components/dashboard/SoftwareHeader";
import { AppSelect } from "@/components/dashboard/AppSelect";
import { GlobalPageLoader } from "@/components/ui/GlobalPageLoader";
import { queue } from "@/components/ui/Toast";
import { adminApi, type ApiSupportRequest } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/support")({
  head: () => pageMeta('Support', 'Review and manage Esportific support requests.'),
  component: AdminSupportPage,
});

const STATUS_OPTIONS = [
  { label: "New", value: "New" },
  { label: "In review", value: "In review" },
  { label: "Resolved", value: "Resolved" },
];

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusClass(status: ApiSupportRequest["status"]) {
  if (status === "Resolved") return "bg-[#e2f5ec] text-[#059669]";
  if (status === "In review") return "bg-[#fff7ed] text-[#c2410c]";
  return "bg-[#f0f1f3] text-[#4b5563]";
}

function AdminSupportPage() {
  const [requests, setRequests] = useState<ApiSupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadRequests = async () => {
    setLoading(true);
    try {
      setRequests(await adminApi.getSupportRequests());
    } catch (error) {
      queue.add(
        {
          title: "Could not load support requests",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "error",
        },
        { timeout: 4000 },
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return requests;
    return requests.filter((request) =>
      [request.name, request.email, request.subject, request.message, request.status]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [requests, searchQuery]);

  const updateStatus = async (request: ApiSupportRequest, status: ApiSupportRequest["status"]) => {
    if (request.status === status) return;
    setUpdatingId(request._id);
    try {
      const updated = await adminApi.updateSupportRequest(request._id, { status });
      setRequests((current) => current.map((item) => (item._id === updated._id ? updated : item)));
      queue.add(
        {
          title: "Support request updated",
          description: `Status changed to ${status}.`,
          variant: "success",
        },
        { timeout: 3000 },
      );
    } catch (error) {
      queue.add(
        {
          title: "Update failed",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "error",
        },
        { timeout: 4000 },
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <>
      <SoftwareHeader
        title="Support"
        variant="admin"
        searchValue={searchQuery}
        searchPlaceholder="Search support requests..."
        onSearchChange={setSearchQuery}
      />

      <main className="min-h-0 flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[28px] font-semibold tracking-tight text-[#000000]">
                Support requests
              </h1>
              <p className="mt-1 text-[14px] text-[#666666]">
                Review contact form submissions from users.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadRequests()}
              className="flex h-8 cursor-pointer items-center gap-2 rounded-[6px] border border-[#e2e5ec] bg-white px-3 text-[12px] font-medium text-[#000000] transition-colors hover:bg-[#f7f8fb]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          <div className="overflow-hidden rounded-[10px] border border-[#e2e5ec] bg-white">
            {loading ? (
              <GlobalPageLoader label="Loading support requests" variant="section" />
            ) : filteredRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-3 grid h-12 w-12 place-items-center rounded-[10px] bg-[#f7f8fb] text-[#9aa1b0]">
                  <Headset className="h-5 w-5" />
                </div>
                <p className="text-[15px] font-semibold text-[#000000]">
                  No support requests found
                </p>
                <p className="mt-1 text-[13px] text-[#666666]">
                  New contact form submissions will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] table-fixed text-left">
                  <thead>
                    <tr className="border-b border-[#e2e5ec] bg-[#f9fbfc] text-[11px] font-medium uppercase tracking-wide text-[#8a93a3]">
                      <th className="w-[18%] px-4 py-2.5">User</th>
                      <th className="w-[15%] px-4 py-2.5">Subject</th>
                      <th className="w-[34%] px-4 py-2.5">Message</th>
                      <th className="w-[13%] px-4 py-2.5">Created</th>
                      <th className="w-[12%] px-4 py-2.5">Status</th>
                      <th className="w-[8%] px-4 py-2.5">Update</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f1f3]">
                    {filteredRequests.map((request) => (
                      <tr key={request._id} className="align-top hover:bg-[#f9fafb]">
                        <td className="px-4 py-3">
                          <p className="truncate text-[13px] font-medium text-[#000000]">
                            {request.name}
                          </p>
                          <p className="mt-0.5 truncate text-[12px] text-[#666666]">
                            {request.email}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-[12px] font-medium text-[#4b5563]">
                          {request.subject}
                        </td>
                        <td className="px-4 py-3">
                          <p className="line-clamp-3 text-[12px] leading-5 text-[#4b5563]">
                            {request.message}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[#666666]">
                          {formatDateTime(request.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                              statusClass(request.status),
                            )}
                          >
                            {request.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <AppSelect
                            value={request.status}
                            options={STATUS_OPTIONS}
                            disabled={updatingId === request._id}
                            onChange={(status) =>
                              void updateStatus(request, status as ApiSupportRequest["status"])
                            }
                            className="w-[118px] [&_button]:h-8 [&_button]:rounded-[6px] [&_button]:border [&_button]:border-[#e2e5ec] [&_button]:text-[12px]"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
