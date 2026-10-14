"use client";

import { Dialog, DialogContent, DialogTitle, ThemedConfirmDialog } from "@/components/ui/dialog";
import { Link } from "@tanstack/react-router";
import {
  Calendar,
  Clock,
  Crosshair,
  Database,
  FileText,
  Pencil,
  Phone,
  Swords,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  formatPoolDate,
  formatPoolDateTime,
  resolveLastEvent,
  teamSourceLabel,
  TEAM_POOL_DETAIL_CLOSE_MS,
  type LastEventRef,
  type PoolTeam,
} from "@/lib/team-pool";
import { queue } from "@/components/ui/Toast";
import { optimizeCloudinaryUrl } from "@/lib/utils";
import { teamsApi } from "@/lib/api";

type TeamPoolDetailModalProps = {
  open: boolean;
  team: PoolTeam | null;
  onOpenChange: (open: boolean) => void;
  onEdit: (team: PoolTeam) => void;
  onDelete: (teamId: string) => void;
};

function TeamAvatar({ team }: { team: PoolTeam }) {
  if (team.logo) {
    return (
      <img
        src={optimizeCloudinaryUrl(team.logo, 192, 192)}
        alt={team.name}
        className="h-24 w-24 shrink-0 rounded-full border border-[#e2e5ec] object-cover"
      />
    );
  }

  return (
    <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full border border-[#e2e5ec] bg-[#f0f1f3] text-[28px] font-semibold text-[#4b5563]">
      {team.name.charAt(0).toUpperCase()}
    </div>
  );
}

function LastEventDisplay({
  lastEvent,
  liveLastEvent,
  loading,
  onNavigate,
}: {
  lastEvent: LastEventRef;
  liveLastEvent?: { eventId: string | null; eventName: string } | null;
  loading?: boolean;
  onNavigate?: () => void;
}) {
  if (loading) {
    return <span className="text-[14px] font-semibold text-[#9aa1b0]">...</span>;
  }

  if (liveLastEvent?.eventName && liveLastEvent.eventId) {
    return (
      <Link
        to="/events/$eventId"
        params={{ eventId: liveLastEvent.eventId }}
        onClick={onNavigate}
        className="text-[14px] font-semibold text-[#000000] underline decoration-[#e2e5ec] underline-offset-2 transition-colors hover:text-[#4b5563] hover:decoration-[#9aa1b0]"
      >
        {liveLastEvent.eventName}
      </Link>
    );
  }

  if (liveLastEvent?.eventName) {
    return <span className="text-[14px] font-semibold text-[#000000]">{liveLastEvent.eventName}</span>;
  }

  const resolved = resolveLastEvent(lastEvent);

  if (resolved.status === "none") {
    return <span className="text-[14px] font-semibold text-[#9aa1b0]">No participations</span>;
  }

  if (resolved.status === "unavailable") {
    return <span className="text-[14px] font-semibold text-[#9aa1b0]">Data unavailable</span>;
  }

  return (
    <Link
      to="/events/$eventId"
      params={{ eventId: resolved.eventId }}
      onClick={onNavigate}
      className="text-[14px] font-semibold text-[#000000] underline decoration-[#e2e5ec] underline-offset-2 transition-colors hover:text-[#4b5563] hover:decoration-[#9aa1b0]"
    >
      {resolved.eventName}
    </Link>
  );
}

export function TeamPoolDetailModal({
  open,
  team,
  onOpenChange,
  onEdit,
  onDelete,
}: TeamPoolDetailModalProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const teamRef = useRef<PoolTeam | null>(null);

  const [liveStats, setLiveStats] = useState<{
    matchesPlayed: number;
    lastEvent: { eventId: string | null; eventName: string } | null;
    topFraggers: Array<{ playerId: string; name: string; kills: number }>;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  if (team) {
    teamRef.current = team;
  }

  const viewTeam = team ?? teamRef.current;

  useEffect(() => {
    if (open && viewTeam?.id) {
      setLoadingStats(true);
      teamsApi
        .getStats(viewTeam.id)
        .then((res) => setLiveStats(res))
        .catch(() => setLiveStats(null))
        .finally(() => setLoadingStats(false));
    } else if (!open) {
      setLiveStats(null);
    }
  }, [open, viewTeam?.id]);

  useEffect(() => {
    if (open) return;
    const timer = window.setTimeout(() => {
      teamRef.current = null;
    }, TEAM_POOL_DETAIL_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!viewTeam) return null;

  const handleDelete = () => {
    onDelete(viewTeam.id);
    setConfirmDelete(false);
    onOpenChange(false);
    queue.add(
      {
        title: "Team removed",
        description: `${viewTeam.name} has been removed from your teams pool.`,
        variant: "success",
      },
      { timeout: 5000 },
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          hideCloseButton
          onOpenAutoFocus={(e) => e.preventDefault()}
          overlayClassName="data-[state=closed]:duration-300 data-[state=open]:duration-300"
          className="flex max-h-[92vh] w-[92vw] max-w-[960px] flex-col gap-0 overflow-hidden rounded-[16px] border border-[#e2e5ec] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.12)] data-[state=closed]:duration-300 data-[state=open]:duration-300 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-top-[2%] data-[state=open]:slide-in-from-top-[2%] outline-none focus:outline-none"
        >
          <DialogTitle className="sr-only">{viewTeam.name} — team details</DialogTitle>

          <div className="flex items-start justify-between gap-6 border-b border-[#f0f1f3] px-8 py-6">
            <div className="flex min-w-0 items-center gap-5">
              <TeamAvatar team={viewTeam} />
              <div className="min-w-0">
                <h2 className="text-[24px] font-semibold text-[#000000]">{viewTeam.name}</h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {viewTeam.tags.length > 0 ? (
                    viewTeam.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-[4px] bg-[#f0f1f3] px-2 py-0.5 text-[11px] font-semibold text-[#4b5563]"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-[13px] text-[#9aa1b0]">No tags</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => onEdit(viewTeam)}
                className="flex h-[36px] cursor-pointer items-center gap-2 rounded-[8px] border border-[#e2e5ec] bg-white px-4 text-[13px] font-medium text-[#000000] outline-none transition-colors hover:bg-[#f7f8fb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#000000] focus-visible:ring-offset-2"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex h-[36px] cursor-pointer items-center gap-2 rounded-[8px] border border-[#fecaca] bg-white px-4 text-[13px] font-medium text-[#ef4444] outline-none transition-colors hover:bg-[#fff5f5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ef4444] focus-visible:ring-offset-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="grid h-[36px] w-[36px] cursor-pointer place-items-center rounded-[8px] text-[#9aa1b0] outline-none transition-colors hover:bg-[#f7f8fb] hover:text-[#000000] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#000000] focus-visible:ring-offset-2"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                icon={<Swords className="h-4 w-4" />}
                label="Matches played"
                value={loadingStats ? "..." : String(liveStats ? liveStats.matchesPlayed : (viewTeam.matchesPlayed || 0))}
              />
              <StatCard
                icon={<Calendar className="h-4 w-4" />}
                label="Last event"
              >
                <LastEventDisplay
                  lastEvent={viewTeam.lastEvent}
                  liveLastEvent={liveStats?.lastEvent}
                  loading={loadingStats}
                  onNavigate={() => onOpenChange(false)}
                />
              </StatCard>
              <StatCard
                icon={<Database className="h-4 w-4" />}
                label="Added from"
                value={teamSourceLabel(viewTeam.addedFrom)}
              />
              <StatCard
                icon={<Calendar className="h-4 w-4" />}
                label="Added to pool"
                value={formatPoolDate(viewTeam.addedAt)}
              />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <DetailBlock
                icon={<Phone className="h-4 w-4" />}
                label="Contact info"
              >
                <p className="text-[14px] font-medium text-[#000000]">
                  {viewTeam.contactMobile.trim() || "—"}
                </p>
              </DetailBlock>
              <DetailBlock
                icon={<Clock className="h-4 w-4" />}
                label="Last updated"
              >
                <p className="text-[14px] font-medium text-[#000000]">
                  {formatPoolDateTime(viewTeam.lastUpdatedAt)}
                </p>
              </DetailBlock>
              <DetailBlock
                icon={<FileText className="h-4 w-4" />}
                label="Notes"
                className="lg:col-span-1"
              >
                <p className="text-[14px] leading-relaxed text-[#4b5563] whitespace-pre-wrap">
                  {viewTeam.notes.trim() || "No notes added yet."}
                </p>
              </DetailBlock>
            </div>

            <div className="mt-8">
              <div className="mb-4 flex items-center gap-2">
                <Crosshair className="h-4 w-4 text-[#4b5563]" />
                <h3 className="text-[15px] font-semibold text-[#000000]">Top shooters</h3>
              </div>
              {(() => {
                const fraggers = liveStats?.topFraggers && liveStats.topFraggers.length > 0
                  ? liveStats.topFraggers
                  : viewTeam.topFraggers || [];

                if (loadingStats) {
                  return (
                    <p className="rounded-[10px] border border-dashed border-[#e2e5ec] bg-[#f9fbfc] px-6 py-8 text-center text-[14px] text-[#9aa1b0]">
                      Loading match stats...
                    </p>
                  );
                }

                if (fraggers.length === 0) {
                  return (
                    <p className="rounded-[10px] border border-dashed border-[#e2e5ec] bg-[#f9fbfc] px-6 py-8 text-center text-[14px] text-[#9aa1b0]">
                      No match stats yet. Top shooters appear after this team plays in scored matches.
                    </p>
                  );
                }

                return (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {fraggers.slice(0, 3).map((fragger, index) => (
                      <div
                        key={fragger.name}
                        className="flex items-center justify-between rounded-[10px] border border-[#eef0f4] bg-[#f9fbfc] px-5 py-4"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`grid h-8 w-8 place-items-center rounded-full text-[13px] font-bold ${
                              index === 0
                                ? "bg-[#000000] text-white"
                                : "bg-[#e8eef7] text-[#4b5563]"
                            }`}
                          >
                            {index + 1}
                          </span>
                          <span className="text-[15px] font-medium text-[#000000]">
                            {fragger.name}
                          </span>
                        </div>
                        <span className="text-[13px] font-semibold text-[#4b5563]">
                          {fragger.kills} {fragger.kills === 1 ? "kill" : "kills"}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ThemedConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Remove team from pool?"
        description={`${viewTeam.name} will be removed from your teams pool. Teams already added to events are not affected.`}
        confirmLabel="Delete team"
        cancelLabel="Cancel"
        onConfirm={handleDelete}
      />
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-[10px] border border-[#eef0f4] bg-[#f9fbfc] px-5 py-4">
      <div className="mb-2 flex items-center gap-1.5 text-[#9aa1b0]">{icon}</div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-[#9aa1b0]">{label}</p>
      <div className="mt-1.5">
        {children ?? <p className="text-[14px] font-semibold text-[#000000]">{value}</p>}
      </div>
    </div>
  );
}

function DetailBlock({
  icon,
  label,
  children,
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[10px] border border-[#eef0f4] bg-white px-5 py-4 ${className}`}
    >
      <div className="mb-2 flex items-center gap-2 text-[#9aa1b0]">
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      {children}
    </div>
  );
}
