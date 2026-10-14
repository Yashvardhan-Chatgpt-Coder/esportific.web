import { pageMeta } from "@/lib/route-meta";
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SoftwareHeader } from "@/components/dashboard/SoftwareHeader";
import { GameLabel } from "@/components/dashboard/GameLabel";
import { eventsApi } from "@/lib/api";
import { apiEventToRow } from "@/lib/mappers";
import { ChevronLeft, ChevronRight, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlobalPageLoader } from "@/components/ui/GlobalPageLoader";

export const Route = createFileRoute("/admin/events/")({
  head: () => pageMeta('Manage events', 'Review and manage events across the Esportific platform.'),
  component: AdminEventsPage,
});

const PAGE_SIZE = 20;

type AdminEventRow = ReturnType<typeof apiEventToRow>;

function EventDateRange({ date }: { date: string }) {
  const [start, end] = date.split(" - ");

  if (!end) return <span className="text-[12px] text-[#666666]">{date}</span>;

  return (
    <div className="space-y-0.5">
      <p className="truncate text-[12px] font-medium text-[#000000]">{start}</p>
      <p className="truncate text-[11px] text-[#9aa1b0]">to {end}</p>
    </div>
  );
}

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "ellipsis", total];
  if (current >= total - 3)
    return [1, "ellipsis", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}

export function AdminEventsPage() {
  const [events, setEvents] = useState<AdminEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    eventsApi
      .getAll()
      .then((data) => {
        if (!cancelled) setEvents(data.map(apiEventToRow));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load events");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredEvents = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return events;
    return events.filter(
      (event) =>
        event.name.toLowerCase().includes(query) ||
        event.game.toLowerCase().includes(query) ||
        event.format.toLowerCase().includes(query) ||
        event.status.toLowerCase().includes(query),
    );
  }, [events, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEvents.slice(start, start + PAGE_SIZE);
  }, [filteredEvents, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <>
      <SoftwareHeader
        title="Events"
        variant="admin"
        searchValue={searchQuery}
        searchPlaceholder="Search events, games, formats, or status..."
        onSearchChange={setSearchQuery}
      />

      <main className="min-h-0 flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-8">
            <h1 className="text-[28px] font-semibold tracking-tight text-[#000000]">All events</h1>
            <p className="mt-1 text-[14px] text-[#666666]">
              Live events available to the current admin account.
            </p>
          </div>

          <div className="overflow-hidden rounded-[10px] border border-[#e2e5ec] bg-white">
            {loading ? (
              <GlobalPageLoader label="Loading events" variant="section" />
            ) : error ? (
              <div className="px-6 py-16 text-center text-[14px] text-[#dc2626]">{error}</div>
            ) : filteredEvents.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-[15px] font-semibold text-[#000000]">No events found</p>
                <p className="mt-1 text-[14px] text-[#666666]">Create an event to see it here.</p>
              </div>
            ) : (
              <table className="w-full min-w-[840px] table-fixed border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#e2e5ec] bg-[#f9fbfc] text-[11px] font-medium uppercase tracking-wide text-[#8a93a3]">
                    <th className="w-[38%] px-4 py-2.5">Event</th>
                    <th className="w-[18%] px-4 py-2.5">Game</th>
                    <th className="w-[18%] px-4 py-2.5">Schedule</th>
                    <th className="w-[10%] px-4 py-2.5">Stats</th>
                    <th className="w-[96px] px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f1f3]">
                  {paginatedEvents.map((event) => (
                    <tr key={event.id} className="group hover:bg-[#f9fafb]">
                      <td className="px-4 py-3">
                        <p className="truncate text-[14px] font-medium leading-tight text-[#000000]">
                          {event.name}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-[#9aa1b0]">
                          {event.format} / {event.status}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <GameLabel
                          name={event.game}
                          logo={event.gameLogo}
                          className="max-w-[112px] text-[12px] font-medium text-[#4b5563]"
                          iconClassName="h-4 w-10"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <EventDateRange date={event.date} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="whitespace-nowrap text-[12px] font-medium text-[#000000]">
                          {event.teams} teams
                        </p>
                        <p className="mt-0.5 whitespace-nowrap text-[11px] text-[#9aa1b0]">
                          {event.matches} matches
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right opacity-0 group-hover:opacity-100">
                        <button
                          type="button"
                          className="rounded-[4px] p-1.5 text-[#9aa1b0] hover:bg-[#f7f8fb]"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {!loading && !error && filteredEvents.length > PAGE_SIZE && (
              <AdminEventsPagination
                page={currentPage}
                totalPages={totalPages}
                totalItems={filteredEvents.length}
                onPageChange={setPage}
              />
            )}
          </div>
        </div>
      </main>
    </>
  );
}

function AdminEventsPagination({
  page,
  totalPages,
  totalItems,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (p: number) => void;
}) {
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, totalItems);
  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div className="flex flex-col gap-4 border-t border-[#f0f1f3] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[13px] text-[#666666]">
        Showing {start}-{end} of {totalItems}
      </p>
      <nav className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="flex h-8 cursor-pointer items-center gap-1 rounded-[6px] border border-[#e2e5ec] px-2.5 text-[13px] disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>
        {pageNumbers.map((item, index) =>
          item === "ellipsis" ? (
            <span key={`e-${index}`} className="px-2 text-[#9aa1b0]">
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={cn(
                "grid h-8 min-w-8 cursor-pointer place-items-center rounded-[6px] px-2 text-[13px] font-medium",
                page === item ? "bg-[#000000] text-white" : "border border-[#e2e5ec] bg-white",
              )}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="flex h-8 cursor-pointer items-center gap-1 rounded-[6px] border border-[#e2e5ec] px-2.5 text-[13px] disabled:opacity-40"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}
