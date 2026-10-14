import { pageMeta } from "@/lib/route-meta";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { OrganizerLayout } from "@/components/dashboard/OrganizerLayout";
import { SoftwareHeader } from "@/components/dashboard/SoftwareHeader";
import type { AddPoolTeamInput } from "@/components/dashboard/AddPoolTeamModal";
import {
  formatPoolDate,
  resolveLastEvent,
  teamSourceLabel,
  TEAM_POOL_DETAIL_CLOSE_MS,
  type LastEventRef,
  type PoolTeam,
} from "@/lib/team-pool";
import { teamsApi } from "@/lib/api";
import { apiTeamToPoolTeam, dataUrlToFile } from "@/lib/mappers";
import { exportPoolTeamsToExcel } from "@/lib/team-excel-import";
import { beginExportProgress } from "@/lib/export-progress";
import { cn, optimizeCloudinaryUrl } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  FileDown,
  Import,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { ThemedConfirmDialog } from "@/components/ui/dialog";
import { queue } from "@/components/ui/Toast";
import { TeamsTableSkeleton } from "@/components/dashboard/PageSkeletons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const TeamExcelImportModal = lazy(() =>
  import("@/components/dashboard/TeamExcelImportModal").then((module) => ({
    default: module.TeamExcelImportModal,
  })),
);
const BulkAddTeamsModal = lazy(() =>
  import("@/components/dashboard/BulkAddTeamsModal").then((module) => ({
    default: module.BulkAddTeamsModal,
  })),
);
const AddPoolTeamModal = lazy(() =>
  import("@/components/dashboard/AddPoolTeamModal").then((module) => ({
    default: module.AddPoolTeamModal,
  })),
);
const EditPoolTeamModal = lazy(() =>
  import("@/components/dashboard/EditPoolTeamModal").then((module) => ({
    default: module.EditPoolTeamModal,
  })),
);
const TeamPoolDetailModal = lazy(() =>
  import("@/components/dashboard/TeamPoolDetailModal").then((module) => ({
    default: module.TeamPoolDetailModal,
  })),
);

export const Route = createFileRoute("/teams")({
  head: () => pageMeta('Teams', 'Manage your teams pool, team details, and event participation.'),
  validateSearch: (search: Record<string, unknown>) => ({
    teamId: typeof search.teamId === "string" ? search.teamId : undefined,
  }),
  component: TeamsPoolPage,
});

type ParticipationFilter = "all" | "participated" | "none";
type SourceFilter = "all" | "pool" | "event";
type MatchesFilter = "all" | "zero" | "1-10" | "11-20" | "21+";
const TEAM_PAGE_SIZE = 40;

function getLastEventTableLabel(lastEvent: LastEventRef): string {
  const resolved = resolveLastEvent(lastEvent);
  if (resolved.status === "none") return "No participations";
  if (resolved.status === "unavailable") return "Data unavailable";
  return resolved.eventName;
}

function teamMatchesFilter(count: number, filter: MatchesFilter) {
  if (filter === "all") return true;
  if (filter === "zero") return count === 0;
  if (filter === "1-10") return count >= 1 && count <= 10;
  if (filter === "11-20") return count >= 11 && count <= 20;
  return count >= 21;
}

function TeamsPoolPage() {
  const navigate = useNavigate();
  const { teamId } = Route.useSearch();
  const [cachedInitialPage] = useState(() =>
    teamsApi.getCachedPage({ page: 1, limit: TEAM_PAGE_SIZE }),
  );
  const [poolSearch, setPoolSearch] = useState("");
  const [appliedPoolSearch, setAppliedPoolSearch] = useState("");
  const [participationFilter, setParticipationFilter] = useState<ParticipationFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [matchesFilter, setMatchesFilter] = useState<MatchesFilter>("all");
  const [teams, setTeams] = useState<PoolTeam[]>(() => cachedInitialPage?.items.map(apiTeamToPoolTeam) ?? []);
  const [totalTeams, setTotalTeams] = useState(cachedInitialPage?.total ?? 0);
  const [loading, setLoading] = useState(!cachedInitialPage);
  const [loadingMore, setLoadingMore] = useState(false);
  const [detailTeam, setDetailTeam] = useState<PoolTeam | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<PoolTeam | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  const [teamPendingDelete, setTeamPendingDelete] = useState<PoolTeam | null>(null);
  const detailCloseTimerRef = useRef<number | null>(null);
  const teamRequestId = useRef(0);
  const loadingMoreRef = useRef(false);
  const teamPageRef = useRef(cachedInitialPage?.page ?? 0);
  const loadedTeamCountRef = useRef(cachedInitialPage?.items.length ?? 0);
  const totalTeamCountRef = useRef(cachedInitialPage?.total ?? 0);
  const teamsScrollRef = useRef<HTMLDivElement>(null);
  const teamsSentinelRef = useRef<HTMLDivElement>(null);

  const loadTeams = useCallback(async (reset = true) => {
    if (!reset && (loadingMoreRef.current || loadedTeamCountRef.current >= totalTeamCountRef.current)) return;
    const requestId = reset ? ++teamRequestId.current : teamRequestId.current;
    const nextPage = reset ? 1 : teamPageRef.current + 1;
    const options = {
      page: nextPage,
      limit: TEAM_PAGE_SIZE,
      search: appliedPoolSearch,
      source: sourceFilter === "all" ? undefined : sourceFilter,
    };
    const cached = reset ? teamsApi.getCachedPage(options) : undefined;
    if (reset) {
      setLoading(!cached);
      if (!cached) {
        setTeams([]);
        setTotalTeams(0);
      }
      teamPageRef.current = 0;
      loadedTeamCountRef.current = 0;
      totalTeamCountRef.current = 0;
      loadingMoreRef.current = false;
      setLoadingMore(false);
    } else {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    }
    try {
      const result = await teamsApi.getPage(options);
      if (requestId !== teamRequestId.current) return;
      const rows = result.items.map(apiTeamToPoolTeam);
      setTeams((current) => reset ? rows : [...current, ...rows]);
      setTotalTeams(result.total);
      teamPageRef.current = result.page;
      loadedTeamCountRef.current = reset ? rows.length : loadedTeamCountRef.current + rows.length;
      totalTeamCountRef.current = result.total;
    } catch (err) {
      if (requestId !== teamRequestId.current) return;
      queue.add(
        {
          title: "Could not load teams",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "error",
        },
        { timeout: 5000 },
      );
    } finally {
      if (reset && requestId === teamRequestId.current) setLoading(false);
      if (!reset) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [appliedPoolSearch, sourceFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => setAppliedPoolSearch(poolSearch.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [poolSearch]);

  useEffect(() => {
    void loadTeams(true);
  }, [loadTeams]);

  useEffect(() => {
    const sentinel = teamsSentinelRef.current;
    const root = teamsScrollRef.current;
    if (!sentinel || !root || loading || loadingMore || teams.length >= totalTeams) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadTeams(false);
    }, { root, rootMargin: "240px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadTeams, loading, loadingMore, teams.length, totalTeams]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        showAddModal ||
        showBulkModal ||
        showExcelImportModal ||
        detailOpen ||
        editingTeam ||
        teamPendingDelete ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target?.isContentEditable
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "n") {
        event.preventDefault();
        setShowAddModal(true);
      } else if (key === "b") {
        event.preventDefault();
        setShowBulkModal(true);
      } else if (key === "i") {
        event.preventDefault();
        setShowExcelImportModal(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    detailOpen,
    editingTeam,
    showAddModal,
    showBulkModal,
    showExcelImportModal,
    teamPendingDelete,
  ]);

  const clearDetailCloseTimer = useCallback(() => {
    if (detailCloseTimerRef.current !== null) {
      window.clearTimeout(detailCloseTimerRef.current);
      detailCloseTimerRef.current = null;
    }
  }, []);

  const scheduleDetailTeamClear = useCallback(() => {
    clearDetailCloseTimer();
    detailCloseTimerRef.current = window.setTimeout(() => {
      setDetailTeam(null);
      detailCloseTimerRef.current = null;
    }, TEAM_POOL_DETAIL_CLOSE_MS);
  }, [clearDetailCloseTimer]);

  const openTeamDetail = useCallback(
    (team: PoolTeam) => {
      clearDetailCloseTimer();
      setDetailTeam(team);
      setDetailOpen(true);
    },
    [clearDetailCloseTimer],
  );

  useEffect(() => {
    if (loading || !teamId) return;
    const team = teams.find((item) => item.id === teamId);
    if (team) {
      openTeamDetail(team);
      return;
    }
    let active = true;
    teamsApi.getById(teamId).then((row) => {
      if (active) openTeamDetail(apiTeamToPoolTeam(row));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [loading, openTeamDetail, teamId, teams]);

  const clearTeamSearchParam = () => {
    if (!teamId) return;
    navigate({ to: "/teams", search: { teamId: undefined }, replace: true });
  };

  const hasActiveFilters =
    participationFilter !== "all" ||
    sourceFilter !== "all" ||
    matchesFilter !== "all" ||
    poolSearch.trim() !== "";

  const filteredTeams = useMemo(() => {
    const query = poolSearch.toLowerCase().trim();

    return teams.filter((team) => {
      const matchesSearch =
        !query ||
        team.name.toLowerCase().includes(query) ||
        team.contactMobile.toLowerCase().includes(query) ||
        team.notes.toLowerCase().includes(query) ||
        team.tags.some((tag) => tag.toLowerCase().includes(query));

      const hasParticipated = team.lastEvent.status !== "none";
      const matchesParticipation =
        participationFilter === "all" ||
        (participationFilter === "participated" && hasParticipated) ||
        (participationFilter === "none" && !hasParticipated);

      const matchesSource =
        sourceFilter === "all" ||
        (sourceFilter === "pool" && team.addedFrom.type === "pool") ||
        (sourceFilter === "event" && team.addedFrom.type === "event");

      const matchesCountFilter = teamMatchesFilter(team.matchesPlayed, matchesFilter);

      return matchesSearch && matchesParticipation && matchesSource && matchesCountFilter;
    });
  }, [teams, poolSearch, participationFilter, sourceFilter, matchesFilter]);

  const handleAddTeam = async (input: AddPoolTeamInput) => {
    try {
      const logoFile = input.logo ? dataUrlToFile(input.logo) : null;
      const created = logoFile
        ? await teamsApi.createWithLogo({
            name: input.name,
            tags: input.tags,
            logoFile,
            contactMobile: input.contactMobile,
            notes: input.notes,
          })
        : await teamsApi.create({
            name: input.name,
            tags: input.tags,
            contactMobile: input.contactMobile,
            notes: input.notes,
          });
      setTeams((current) => [...current, apiTeamToPoolTeam(created)]);
      setTotalTeams((current) => current + 1);
      totalTeamCountRef.current += 1;
      queue.add(
        { title: "Team added", description: `${input.name} is in your pool.`, variant: "success" },
        { timeout: 5000 },
      );
    } catch (err) {
      queue.add(
        {
          title: "Could not add team",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "error",
        },
        { timeout: 5000 },
      );
    }
  };

  const handleAddTeams = async (inputs: AddPoolTeamInput[]) => {
    try {
      const created = await teamsApi.createBulk(inputs.map((input) => ({
        name: input.name,
        tags: input.tags,
        contactMobile: input.contactMobile,
        notes: input.notes,
      })));
      setTeams((current) => [...current, ...created.map(apiTeamToPoolTeam)]);
      setTotalTeams((current) => current + created.length);
      totalTeamCountRef.current += created.length;
      queue.add(
        {
          title: "Teams added",
          description: `${created.length} ${created.length === 1 ? "team has" : "teams have"} been added to your pool.`,
          variant: "success",
        },
        { timeout: 5000 },
      );
    } catch (err) {
      queue.add(
        {
          title: "Could not add teams",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "error",
        },
        { timeout: 5000 },
      );
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    const removedIndex = teams.findIndex((team) => team.id === teamId);
    const removed = removedIndex >= 0 ? teams[removedIndex] : undefined;
    setTeams((current) => current.filter((team) => team.id !== teamId));
    if (removed) {
      setTotalTeams((current) => Math.max(0, current - 1));
      loadedTeamCountRef.current = Math.max(0, loadedTeamCountRef.current - 1);
      totalTeamCountRef.current = Math.max(0, totalTeamCountRef.current - 1);
    }
    try {
      const result = await teamsApi.delete(teamId);
      if (detailTeam?.id === teamId) {
        setDetailOpen(false);
        scheduleDetailTeamClear();
      }
      if (editingTeam?.id === teamId) setEditingTeam(null);
      if (removed) {
        queue.add(
          {
            title: result.removedFromPoolOnly ? "Removed from pool" : "Team deleted",
            description: result.removedFromPoolOnly
              ? `${removed.name} was removed from the pool, but existing event and match records were kept.`
              : `${removed.name} has been deleted.`,
            variant: "success",
          },
          { timeout: 5000 },
        );
      }
    } catch (err) {
      if (removed) {
        setTeams((current) => {
          if (current.some((team) => team.id === teamId)) return current;
          const restored = [...current];
          restored.splice(Math.max(0, removedIndex), 0, removed);
          return restored;
        });
        setTotalTeams((current) => current + 1);
        loadedTeamCountRef.current += 1;
        totalTeamCountRef.current += 1;
      }
      queue.add(
        {
          title: "Delete failed",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "error",
        },
        { timeout: 5000 },
      );
    }
  };

  const confirmDeleteFromTable = () => {
    if (!teamPendingDelete) return;
    handleDeleteTeam(teamPendingDelete.id);
    setTeamPendingDelete(null);
  };

  const clearFilters = () => {
    setPoolSearch("");
    setParticipationFilter("all");
    setSourceFilter("all");
    setMatchesFilter("all");
  };

  const handleExportExcel = async () => {
    if (totalTeams === 0) {
      queue.add(
        {
          title: "No teams to export",
          description: "There are no teams in the current view.",
          variant: "error",
        },
        { timeout: 4000 },
      );
      return;
    }

    const progress = await beginExportProgress();
    try {
      const exportRows: PoolTeam[] = [];
      const totalPages = Math.ceil(totalTeams / 100);
      for (let page = 1; page <= totalPages; page += 1) {
        const result = await teamsApi.getPage({
          page,
          limit: 100,
          search: appliedPoolSearch,
          source: sourceFilter === "all" ? undefined : sourceFilter,
        });
        exportRows.push(...result.items.map(apiTeamToPoolTeam));
        progress.update(Math.round((page / Math.max(totalPages, 1)) * 70));
      }
      const exportFiltered = exportRows.filter((team) => {
        const hasParticipated = team.lastEvent.status !== "none";
        const matchesParticipation = participationFilter === "all" ||
          (participationFilter === "participated" && hasParticipated) ||
          (participationFilter === "none" && !hasParticipated);
        return matchesParticipation && teamMatchesFilter(team.matchesPlayed, matchesFilter);
      });
      await exportPoolTeamsToExcel(exportFiltered, {
        filename: hasActiveFilters ? "teams-pool-filtered" : "teams-pool",
        getLastEventLabel: (team) => getLastEventTableLabel(team.lastEvent),
        onProgress: (percent) => progress.update(70 + Math.round(percent * 0.3)),
      });
      progress.complete();
      queue.add(
        {
          title: "Teams exported",
          description: `${exportFiltered.length} team${exportFiltered.length === 1 ? "" : "s"} exported to Excel.`,
          variant: "success",
        },
        { timeout: 4000 },
      );
    } catch (err) {
      progress.dismiss();
      queue.add(
        {
          title: "Could not export teams",
          description: err instanceof Error ? err.message : "Please try again.",
          variant: "error",
        },
        { timeout: 5000 },
      );
    }
  };

  return (
    <OrganizerLayout header={<SoftwareHeader title="Teams" />}>
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-8">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-[1200px] flex-col">
          <div className="mb-8 flex shrink-0 items-end justify-between gap-6">
            <div>
              <h1 className="text-[28px] font-semibold tracking-tight text-[#000000]">
                Teams Pool
              </h1>
              <p className="mt-1 text-[14px] text-[#666666]">
                Reusable teams you can quickly add to any event
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleExportExcel}
                className="flex h-[38px] cursor-pointer items-center gap-2 rounded-[8px] border border-[#e2e5ec] bg-white px-5 text-[14px] font-medium text-[#000000] transition-colors hover:bg-[#f7f8fb]"
              >
                <FileDown className="h-4 w-4" />
                Export excel
              </button>
              <button
                type="button"
                onClick={() => setShowBulkModal(true)}
                className="flex h-[38px] cursor-pointer items-center gap-2 rounded-[8px] border border-[#e2e5ec] bg-white px-5 text-[14px] font-medium text-[#000000] transition-colors hover:bg-[#f7f8fb]"
              >
                <Users className="h-4 w-4" />
                Bulk add
              </button>
              <button
                type="button"
                onClick={() => setShowExcelImportModal(true)}
                className="flex h-[38px] cursor-pointer items-center gap-2 rounded-[8px] border border-[#e2e5ec] bg-white px-5 text-[14px] font-medium text-[#000000] transition-colors hover:bg-[#f7f8fb]"
              >
                <Import className="h-4 w-4" />
                Import excel
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="flex h-[38px] cursor-pointer items-center gap-2 rounded-[8px] bg-[#000000] px-5 text-[14px] font-medium text-white transition-colors hover:bg-[#333]"
              >
                <Plus className="h-4 w-4" />
                Add team
              </button>
            </div>
          </div>

          <div className="mb-5 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-[400px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1b0]" />
              <input
                value={poolSearch}
                onChange={(e) => setPoolSearch(e.target.value)}
                placeholder="Search teams pool..."
                className="h-[40px] w-full rounded-[8px] border-2 border-[#eef0f4] bg-white pl-9 pr-3 text-[14px] outline-none placeholder:text-[#9aa1b0] transition-all duration-200 focus:border-[#000000]"
              />
            </div>
            <p className="text-[13px] text-[#666666]">
              {filteredTeams.length} shown · {totalTeams} total teams
            </p>
          </div>

          <div className="min-h-0 flex-1">
            {loading ? (
              <TeamsTableSkeleton />
            ) : filteredTeams.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center rounded-[12px] border border-dashed border-[#d1d5db] bg-white px-6 text-center">
                <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-[#f0f1f3]">
                  <Users className="h-6 w-6 text-[#9aa1b0]" />
                </div>
                <h3 className="text-[17px] font-semibold text-[#000000]">No teams found</h3>
                <p className="mt-2 max-w-[340px] text-[14px] text-[#666666]">
                  {totalTeams === 0
                    ? "Add your first team to build a reusable pool for future events."
                    : "Try a different search or column filter."}
                </p>
                {totalTeams > 0 && hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-6 text-[13px] font-medium text-[#000000] underline underline-offset-4"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[10px] border border-[#e2e5ec] bg-white">
                <div ref={teamsScrollRef} className="min-h-0 flex-1 overflow-y-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead className="sticky top-0 z-10 border-b border-[#e2e5ec] bg-[#f9fbfc]">
                      <tr>
                        <th className="px-6 py-3 font-medium uppercase tracking-wider text-[#4b5563]">
                          Team
                        </th>
                        <th className="px-6 py-3">
                          <TableColumnFilter
                            label="Matches"
                            value={matchesFilter}
                            active={matchesFilter !== "all"}
                            options={[
                              { value: "all", label: "All" },
                              { value: "zero", label: "No matches (0)" },
                              { value: "1-10", label: "1–10 matches" },
                              { value: "11-20", label: "11–20 matches" },
                              { value: "21+", label: "21+ matches" },
                            ]}
                            onChange={(v) => setMatchesFilter(v as MatchesFilter)}
                          />
                        </th>
                        <th className="px-6 py-3">
                          <TableColumnFilter
                            label="Last event"
                            value={participationFilter}
                            active={participationFilter !== "all"}
                            options={[
                              { value: "all", label: "All" },
                              { value: "participated", label: "Participated" },
                              { value: "none", label: "No participations" },
                            ]}
                            onChange={(v) => setParticipationFilter(v as ParticipationFilter)}
                          />
                        </th>
                        <th className="px-6 py-3">
                          <TableColumnFilter
                            label="Added from"
                            value={sourceFilter}
                            active={sourceFilter !== "all"}
                            options={[
                              { value: "all", label: "All" },
                              { value: "pool", label: "Teams pool" },
                              { value: "event", label: "From event" },
                            ]}
                            onChange={(v) => setSourceFilter(v as SourceFilter)}
                          />
                        </th>
                        <th className="px-6 py-3 font-medium uppercase tracking-wider text-[#4b5563]">
                          Added
                        </th>
                        <th className="w-[100px] px-4 py-3 text-right font-medium uppercase tracking-wider text-[#4b5563]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f1f3]">
                      {filteredTeams.map((team) => (
                        <TeamPoolTableRow
                          key={team.id}
                          team={team}
                          onOpen={() => openTeamDetail(team)}
                          onEdit={() => setEditingTeam(team)}
                          onDelete={() => setTeamPendingDelete(team)}
                        />
                      ))}
                    </tbody>
                  </table>
                  {teams.length < totalTeams && (
                    <div ref={teamsSentinelRef} className="py-4 text-center text-[12px] text-[#8a93a3]">
                      {loadingMore ? "Loading more teams…" : "Scroll to load more teams"}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {detailTeam && (
        <Suspense fallback={null}>
          <TeamPoolDetailModal
            open={detailOpen}
            team={detailTeam}
            onOpenChange={(open) => {
              setDetailOpen(open);
              if (!open) {
                scheduleDetailTeamClear();
                clearTeamSearchParam();
              }
            }}
            onEdit={(team) => {
              setDetailOpen(false);
              scheduleDetailTeamClear();
              clearTeamSearchParam();
              setEditingTeam(team);
            }}
            onDelete={handleDeleteTeam}
          />
        </Suspense>
      )}

      {editingTeam && (
        <Suspense fallback={null}>
          <EditPoolTeamModal
            open
            team={editingTeam}
            onOpenChange={(open) => {
              if (!open) setEditingTeam(null);
            }}
            onSave={async (updated, logoFile, removeLogo) => {
              try {
                const saved = await teamsApi.update(updated.id, {
                  name: updated.name,
                  tags: updated.tags,
                  contactMobile: updated.contactMobile,
                  notes: updated.notes,
                  logoFile,
                  removeLogo,
                });
                const savedTeam = apiTeamToPoolTeam(saved);
                setTeams((current) =>
                  current.map((team) => (team.id === updated.id ? { ...team, ...savedTeam } : team)),
                );
                setEditingTeam(null);
              } catch (err) {
                queue.add(
                  {
                    title: "Update failed",
                    description: err instanceof Error ? err.message : "Unknown error",
                    variant: "error",
                  },
                  { timeout: 5000 },
                );
                throw err;
              }
            }}
          />
        </Suspense>
      )}

      {showAddModal && (
        <Suspense fallback={null}>
          <AddPoolTeamModal open onOpenChange={setShowAddModal} onAddTeam={handleAddTeam} />
        </Suspense>
      )}

      {showBulkModal && (
        <Suspense fallback={null}>
          <BulkAddTeamsModal
            open
            onOpenChange={setShowBulkModal}
            mode="pool"
            onAddPoolTeams={handleAddTeams}
          />
        </Suspense>
      )}

      {showExcelImportModal && (
        <Suspense fallback={null}>
          <TeamExcelImportModal
            open
            onOpenChange={setShowExcelImportModal}
            mode="pool"
            onImport={handleAddTeams}
          />
        </Suspense>
      )}

      <ThemedConfirmDialog
        open={Boolean(teamPendingDelete)}
        onOpenChange={(open) => {
          if (!open) setTeamPendingDelete(null);
        }}
        title="Remove team from pool?"
        description={
          teamPendingDelete
            ? `${teamPendingDelete.name} will be removed from your teams pool. Teams already added to events are not affected.`
            : ""
        }
        confirmLabel="Delete team"
        cancelLabel="Cancel"
        onConfirm={confirmDeleteFromTable}
      />
    </OrganizerLayout>
  );
}

function TableColumnFilter<T extends string>({
  label,
  value,
  options,
  onChange,
  active,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  active: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex cursor-pointer items-center gap-1 text-[12px] font-medium uppercase tracking-wider transition-colors",
            active ? "text-[#000000]" : "text-[#4b5563] hover:text-[#000000]",
          )}
        >
          {label}
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", active && "text-[#000000]")}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[180px] rounded-[10px] border border-[#e2e5ec] bg-white p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.1)]"
      >
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as T)}>
          {options.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              className="cursor-pointer rounded-[6px] py-2 pl-8 pr-3 text-[13px] text-[#4b5563] focus:bg-[#f7f8fb] focus:text-[#000000]"
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TeamPoolTableRow({
  team,
  onOpen,
  onEdit,
  onDelete,
}: {
  team: PoolTeam;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const resolvedEvent = resolveLastEvent(team.lastEvent);
  const lastEventLabel = getLastEventTableLabel(team.lastEvent);

  return (
    <tr onClick={onOpen} className="group cursor-pointer transition-colors hover:bg-[#f0f1f3]">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          {team.logo ? (
            <img
              src={optimizeCloudinaryUrl(team.logo, 72, 72)}
              alt={team.name}
              loading="lazy"
              className="h-9 w-9 shrink-0 rounded-full border border-[#e2e5ec] object-cover"
            />
          ) : (
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f0f1f3] text-[13px] font-semibold text-[#4b5563]">
              {team.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-[#000000]">{team.name}</p>
            <div className="mt-0.5 flex flex-wrap gap-1">
              {team.tags.length > 0 ? (
                team.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-[4px] bg-[#eef0f4] px-1.5 py-0.5 text-[10px] font-semibold text-[#4b5563]"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-[12px] text-[#9aa1b0]">—</span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 font-medium text-[#000000]">{team.matchesPlayed}</td>
      <td className="px-6 py-4">
        {resolvedEvent.status === "active" ? (
          <Link
            to="/events/$eventId"
            params={{ eventId: resolvedEvent.eventId }}
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-[#000000] underline decoration-[#e2e5ec] underline-offset-2 hover:text-[#4b5563]"
          >
            {lastEventLabel}
          </Link>
        ) : (
          <span
            className={cn(
              "font-medium",
              resolvedEvent.status === "none" || resolvedEvent.status === "unavailable"
                ? "text-[#9aa1b0]"
                : "text-[#000000]",
            )}
          >
            {lastEventLabel}
          </span>
        )}
      </td>
      <td className="px-6 py-4 text-[#4b5563]">{teamSourceLabel(team.addedFrom)}</td>
      <td className="px-6 py-4 text-[#4b5563]">{formatPoolDate(team.addedAt)}</td>
      <td className="px-4 py-4 text-right">
        <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="grid h-8 w-8 cursor-pointer place-items-center rounded-[6px] border border-[#e2e5ec] bg-white text-[#4b5563] transition-colors hover:bg-[#e8eaee] hover:text-[#000000]"
                  aria-label={`Edit ${team.name}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Edit team</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="grid h-8 w-8 cursor-pointer place-items-center rounded-[6px] border border-[#fecaca] bg-white text-[#ef4444] transition-colors hover:bg-[#fff5f5]"
                  aria-label={`Delete ${team.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Delete team</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </td>
    </tr>
  );
}
