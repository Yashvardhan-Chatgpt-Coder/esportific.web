import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Calendar, SlidersHorizontal, Trash2, Trophy, UsersRound } from "lucide-react";
import { eventsApi, type ApiEvent } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { formatEventDate, getEventGame } from "@/lib/mappers";
import { getFirstName, getIndianTimeGreeting } from "@/lib/utils";
import { GameLabel } from "@/components/dashboard/GameLabel";
import { DashboardSkeleton } from "@/components/dashboard/PageSkeletons";
import { ThemedConfirmDialog } from "@/components/ui/dialog";
import { queue } from "@/components/ui/Toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type DashboardData = {
  eventsCount: number;
  scoringRulesCount: number;
  teamsCount: number;
  recentEvents: ApiEvent[];
};

function SummaryCard({
  card,
}: {
  card: { icon: typeof Trophy; iconClass: string; label: string; note: string };
}) {
  const Icon = card.icon;
  return (
    <div className="flex h-[54px] items-center justify-between rounded-[8px] border border-[#e2e6ed] bg-white px-4">
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${card.iconClass}`} />
        <div className="text-[16px] font-medium text-[#2b2f3a]">{card.label}</div>
      </div>
      <div className="text-[13px] font-medium text-[#333]">{card.note}</div>
    </div>
  );
}

function TournamentRow({
  item,
  onDelete,
}: {
  item: {
    id: string;
    title: string;
    game: string;
    gameLogo?: string | null;
    date: string;
    teamsCount: number;
  };
  onDelete: () => void;
}) {
  return (
    <tr className="group border-t border-[#f0f1f3] transition-colors hover:bg-[#f9fafb]">
      <td className="w-[32%] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[6px] bg-[#eef3f8] text-[#4b5563]">
            <Trophy className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium leading-tight text-[#000000]">
              {item.title}
            </p>
          </div>
        </div>
      </td>
      <td className="w-[18%] px-4 py-3">
        <GameLabel
          name={item.game || "Event"}
          logo={item.gameLogo}
          className="max-w-[112px] text-[12px] font-medium text-[#4b5563]"
          iconClassName="h-4 w-10"
        />
      </td>
      <td className="w-[22%] whitespace-nowrap px-4 py-3 text-[12px] text-[#666666]">
        {item.date}
      </td>
      <td className="w-[11%] whitespace-nowrap px-4 py-3 text-[12px] text-[#666666]">
        {item.teamsCount} Teams
      </td>
      <td className="w-[17%] px-4 py-3">
        <div className="flex items-center justify-end gap-1.5">
          <Link to="/events/$eventId" params={{ eventId: item.id }}>
            <button className="h-7 cursor-pointer rounded-[6px] border border-[#e2e5ec] bg-white px-2.5 text-[12px] font-medium text-[#000000] transition-colors hover:bg-[#f7f8fb]">
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
                  aria-label={`Delete ${item.title}`}
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

export function Dashboard() {
  const { displayName } = useCurrentUser();
  const [cachedDashboard] = useState(() => eventsApi.getCachedDashboardStats());
  const [data, setData] = useState<DashboardData | null>(cachedDashboard ?? null);
  const [loading, setLoading] = useState(!cachedDashboard);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const greeting = getIndianTimeGreeting();
  const firstName = getFirstName(displayName);

  useEffect(() => {
    eventsApi
      .getDashboardStats()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const summaryCards = [
    {
      icon: Trophy,
      iconClass: "text-[#4fd398]",
      label: `${data?.eventsCount ?? 0} Events`,
      note: "Active now",
    },
    {
      icon: SlidersHorizontal,
      iconClass: "text-[#efad6d]",
      label: `${data?.scoringRulesCount ?? 0} Scoring rules`,
      note: "Ready",
    },
    {
      icon: UsersRound,
      iconClass: "text-[#e58bc3]",
      label: `${data?.teamsCount ?? 0} Teams`,
      note: "In your pool",
    },
  ];

  const recentTournaments =
    data?.recentEvents.map((event) => {
      const game = getEventGame(event);
      return {
        id: event._id,
        title: event.name,
        game: game.name || "Event",
        gameLogo: game.logo,
        date: formatEventDate(event.startDate),
        teamsCount: Array.isArray(event.teams) ? event.teams.length : 0,
      };
    }) ?? [];

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    const targetEvent = data?.recentEvents.find((event) => event._id === target.id);
    setDeleting(true);
    setData((current) => current && ({
      ...current,
      eventsCount: Math.max(0, current.eventsCount - 1),
      recentEvents: current.recentEvents.filter((event) => event._id !== target.id),
    }));
    try {
      await eventsApi.delete(target.id);
      queue.add(
        {
          title: "Event deleted",
          description: `${target.title} has been removed.`,
          variant: "success",
        },
        { timeout: 5000 },
      );
      setDeleteTarget(null);
    } catch (err) {
      setData((current) => {
        if (!current) return current;
        const recentEvents = !targetEvent || current.recentEvents.some((event) => event._id === target.id)
          ? current.recentEvents
          : [...current.recentEvents, targetEvent].sort((a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            );
        return { ...current, eventsCount: current.eventsCount + 1, recentEvents };
      });
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

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[1200px] flex-col gap-6 overflow-hidden p-6">
      <div className="shrink-0">
        <h1 className="text-[28px] font-semibold tracking-tight text-[#000000]">
          {greeting}, {firstName}
        </h1>
        <p className="mt-1 text-[14px] text-[#666666]">Overview of your tournaments and teams</p>
      </div>

      <div className="grid shrink-0 gap-4 md:grid-cols-3">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} card={card} />
        ))}
      </div>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] border border-[#e2e5ec] bg-white">
        <div className="flex shrink-0 items-center justify-between border-b border-[#f0f1f3] px-6 py-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#666666]" />
            <h2 className="text-[16px] font-semibold text-[#000000]">Recent tournaments</h2>
          </div>
          <Link
            to="/events"
            className="text-[13px] font-medium text-[#666666] hover:text-[#000000]"
          >
            View all
          </Link>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          {recentTournaments.length > 0 ? (
            <table className="h-full w-full min-w-[680px] table-fixed text-left">
              <thead>
                <tr className="bg-[#f9fbfc] text-[11px] font-medium uppercase tracking-wide text-[#8a93a3]">
                  <th className="w-[32%] px-4 py-2.5">Event</th>
                  <th className="w-[18%] px-4 py-2.5">Game</th>
                  <th className="w-[22%] px-4 py-2.5">Date</th>
                  <th className="w-[11%] px-4 py-2.5">Teams</th>
                  <th className="w-[17%] px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentTournaments.map((item) => (
                  <TournamentRow
                    key={item.id}
                    item={item}
                    onDelete={() => setDeleteTarget({ id: item.id, title: item.title })}
                  />
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-4 py-10 text-center text-[14px] text-[#666666]">
              No events yet. Create your first tournament to get started.
            </div>
          )}
        </div>
      </section>

      <ThemedConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
        title="Delete event?"
        description={
          <>
            This will permanently delete{" "}
            <span className="font-semibold text-[#000000]">{deleteTarget?.title}</span>. Matches,
            results, event teams, and event logs connected to this event will also be removed.
          </>
        }
        cancelLabel="Cancel"
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
