import { pageMeta } from "@/lib/route-meta";
import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { OrganizerLayout } from "@/components/dashboard/OrganizerLayout";
import { SoftwareHeader } from "@/components/dashboard/SoftwareHeader";
import { ChevronLeft, ChevronRight, Search, Trash2, Trophy } from "lucide-react";
import { eventsApi } from "@/lib/api";
import { apiEventToRow } from "@/lib/mappers";
import { cn } from "@/lib/utils";
import { queue } from "@/components/ui/Toast";
import { GameLabel } from "@/components/dashboard/GameLabel";
import { ThemedConfirmDialog } from "@/components/ui/dialog";
import { EventsTableSkeleton } from "@/components/dashboard/PageSkeletons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/events/")({
  head: () => pageMeta('Events', 'Browse and manage your esports tournaments.'),
  component: EventsPage,
});

const PAGE_SIZE = 20;

type EventRow = ReturnType<typeof apiEventToRow>;

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

function EventsPagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (totalItems <= pageSize) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <PaginationBar
      start={start}
      end={end}
      totalItems={totalItems}
      page={page}
      totalPages={totalPages}
      pageNumbers={pageNumbers}
      onPageChange={onPageChange}
    />
  );
}

function PaginationBar({
  start,
  end,
  totalItems,
  page,
  totalPages,
  pageNumbers,
  onPageChange,
}: {
  start: number;
  end: number;
  totalItems: number;
  page: number;
  totalPages: number;
  pageNumbers: (number | "ellipsis")[];
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4 border-t border-[#f0f1f3] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[13px] text-[#666666]">
        Showing <span className="font-medium text-[#000000]">{start}</span>–
        <span className="font-medium text-[#000000]">{end}</span> of{" "}
        <span className="font-medium text-[#000000]">{totalItems}</span> events
      </p>
      <nav className="flex items-center gap-1" aria-label="Events pagination">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="flex h-8 cursor-pointer items-center gap-1 rounded-[6px] border border-[#e2e5ec] bg-white px-2.5 text-[13px] font-medium text-[#000000] transition-colors hover:bg-[#f7f8fb] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>
        {pageNumbers.map((item, index) =>
          item === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="grid h-8 w-8 place-items-center text-[13px] text-[#9aa1b0]"
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={cn(
                "grid h-8 min-w-8 cursor-pointer place-items-center rounded-[6px] px-2 text-[13px] font-medium transition-colors",
                page === item
                  ? "bg-[#000000] text-white"
                  : "border border-[#e2e5ec] bg-white text-[#000000] hover:bg-[#f7f8fb]",
              )}
              aria-current={page === item ? "page" : undefined}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="flex h-8 cursor-pointer items-center gap-1 rounded-[6px] border border-[#e2e5ec] bg-white px-2.5 text-[13px] font-medium text-[#000000] transition-colors hover:bg-[#f7f8fb] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}

function EventTableRow({ event, onDelete }: { event: EventRow; onDelete: () => void }) {
  return (
    <tr className="group border-t border-[#f0f1f3] transition-colors hover:bg-[#f9fafb]">
      <td className="w-[38%] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[6px] bg-[#eef3f8] text-[#4b5563]">
            <Trophy className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium leading-tight text-[#000000]">
              {event.name}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-[#9aa1b0]">{event.format}</p>
          </div>
        </div>
      </td>
      <td className="w-[18%] px-4 py-3">
        <GameLabel
          name={event.game}
          logo={event.gameLogo}
          className="max-w-[112px] text-[12px] font-medium text-[#4b5563]"
          iconClassName="h-4 w-10"
        />
      </td>
      <td className="w-[18%] px-4 py-3">
        <EventDateRange date={event.date} />
      </td>
      <td className="w-[10%] px-4 py-3">
        <p className="whitespace-nowrap text-[12px] font-medium text-[#000000]">
          {event.teams} teams
        </p>
        <p className="mt-0.5 whitespace-nowrap text-[11px] text-[#9aa1b0]">
          {event.matches} matches
        </p>
      </td>
      <td className="w-[140px] px-4 py-3">
        <div className="flex items-center justify-end gap-1.5">
          <Link to="/events/$eventId" params={{ eventId: event.id }}>
            <button
              type="button"
              className="mr-5 h-7 cursor-pointer rounded-[6px] border border-[#e2e5ec] bg-white px-2.5 text-[12px] font-medium text-[#000000] transition-colors hover:bg-[#f7f8fb]"
            >
              Manage
            </button>
          </Link>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onDelete}
                  className="grid h-7 w-7 cursor-pointer place-items-center rounded-[6px] text-[#9aa1b0] transition-colors hover:bg-[#fee2e2] hover:text-[#ef4444]"
                  aria-label={`Delete ${event.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Delete event</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </td>
    </tr>
  );
}

export function EventsPage() {
  const [cachedInitialPage] = useState(() => eventsApi.getCachedPage({ page: 1, limit: PAGE_SIZE }));
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [events, setEvents] = useState<EventRow[]>(() => cachedInitialPage?.items.map(apiEventToRow) ?? []);
  const [totalEvents, setTotalEvents] = useState(cachedInitialPage?.total ?? 0);
  const [loading, setLoading] = useState(!cachedInitialPage);
  const [deleteTarget, setDeleteTarget] = useState<EventRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const requestId = useRef(0);

  const loadEvents = useCallback(async (targetPage = page, targetSearch = appliedSearchQuery) => {
    const currentRequest = ++requestId.current;
    const cached = eventsApi.getCachedPage({ page: targetPage, limit: PAGE_SIZE, search: targetSearch });
    setLoading(!cached);
    try {
      const result = await eventsApi.getPage({ page: targetPage, limit: PAGE_SIZE, search: targetSearch });
      if (currentRequest !== requestId.current) return;
      setEvents(result.items.map(apiEventToRow));
      setTotalEvents(result.total);
    } catch (err) {
      if (currentRequest !== requestId.current) return;
      queue.add(
        {
          title: "Could not load events",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "error",
        },
        { timeout: 5000 },
      );
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [page, appliedSearchQuery]);

  useEffect(() => {
    loadEvents();
    const onRefresh = () => loadEvents();
    window.addEventListener("esports:events-changed", onRefresh);
    return () => window.removeEventListener("esports:events-changed", onRefresh);
  }, [loadEvents]);

  useEffect(() => {
    const timer = window.setTimeout(() => setAppliedSearchQuery(searchQuery.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => setPage(1), [appliedSearchQuery]);

  const totalPages = Math.max(1, Math.ceil(totalEvents / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    const removedIndex = events.findIndex((event) => event.id === target.id);
    setDeleting(true);
    setEvents((current) => current.filter((event) => event.id !== target.id));
    setTotalEvents((current) => Math.max(0, current - 1));
    try {
      await eventsApi.delete(target.id);
      queue.add(
        {
          title: "Event deleted",
          description: `${target.name} has been removed.`,
          variant: "success",
        },
        { timeout: 5000 },
      );
      setDeleteTarget(null);
      if (page > 1 && events.length === 1) {
        setPage((current) => Math.max(1, current - 1));
      } else {
        await loadEvents(page, appliedSearchQuery);
      }
    } catch (err) {
      setEvents((current) => {
        if (current.some((event) => event.id === target.id)) return current;
        const restored = [...current];
        restored.splice(Math.max(0, removedIndex), 0, target);
        return restored;
      });
      setTotalEvents((current) => current + 1);
      queue.add(
        {
          title: "Delete failed",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "error",
        },
        { timeout: 5000 },
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <OrganizerLayout
      header={
        <SoftwareHeader
          title="Events"
          searchValue={searchQuery}
          searchPlaceholder="Search events or games..."
          onSearchChange={setSearchQuery}
        />
      }
    >
      <main className="min-h-0 flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-8">
            <h1 className="text-[28px] font-semibold tracking-tight text-[#000000]">All Events</h1>
            <p className="mt-1 text-[14px] text-[#666666]">
              Manage and oversee your tournament events
            </p>
          </div>

          {loading ? (
            <EventsTableSkeleton />
          ) : events.length > 0 ? (
            <div className="overflow-hidden rounded-[10px] border border-[#e2e5ec] bg-white">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] table-fixed text-left">
                  <thead>
                    <tr className="bg-[#f9fbfc] text-[11px] font-medium uppercase tracking-wide text-[#8a93a3]">
                      <th className="w-[38%] px-4 py-2.5">Event</th>
                      <th className="w-[18%] px-4 py-2.5">Game</th>
                      <th className="w-[18%] px-4 py-2.5">Schedule</th>
                      <th className="w-[10%] px-4 py-2.5">Stats</th>
                      <th className="w-[140px] px-4 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <EventTableRow
                        key={event.id}
                        event={event}
                        onDelete={() => setDeleteTarget(event)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <EventsPagination
                page={currentPage}
                totalPages={totalPages}
                totalItems={totalEvents}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[16px] border border-dashed border-[#d1d5db] bg-white py-24 text-center">
              <h3 className="text-[16px] font-semibold text-[#000000]">No events yet</h3>
              <p className="mt-1 max-w-[300px] text-[14px] text-[#666666]">
                Create your first tournament using the Create Event button above.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-[16px] border border-dashed border-[#d1d5db] bg-white py-24 text-center">
              <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#f9fbfc]">
                <Search className="h-6 w-6 text-[#9aa1b0]" />
              </div>
              <h3 className="text-[16px] font-semibold text-[#000000]">No events found</h3>
              <p className="mt-1 max-w-[300px] text-[14px] text-[#666666]">
                We couldn't find any events matching your search.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-6 text-[13px] font-medium text-[#000000] underline underline-offset-4"
              >
                Clear search
              </button>
            </div>
          )}
        </div>
      </main>

      <ThemedConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete event?"
        description={
          deleteTarget
            ? `This will permanently delete "${deleteTarget.name}" and all of its matches and results.`
            : ""
        }
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        onConfirm={confirmDelete}
      />
    </OrganizerLayout>
  );
}
