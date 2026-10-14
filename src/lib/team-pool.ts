export const POOL_TEAM_NOTES_MAX_LENGTH = 100;
export const TEAM_POOL_DETAIL_CLOSE_MS = 300;

export type TeamSource =
  | { type: "pool"; label: "Teams pool" }
  | { type: "event"; label: string; eventId?: string };

export type LastEventRef =
  | { status: "none" }
  | { status: "active"; eventId: string; eventName: string }
  | { status: "unavailable" };

export interface TopFragger {
  name: string;
  kills: number;
}

export interface PoolTeam {
  id: string;
  name: string;
  logo: string | null;
  tags: string[];
  contactMobile: string;
  notes: string;
  lastUpdatedAt: string;
  matchesPlayed: number;
  lastEvent: LastEventRef;
  topFraggers: TopFragger[];
  addedAt: string;
  addedFrom: TeamSource;
}

/** Event IDs that still exist (for last-event link validation). */
export const KNOWN_EVENT_IDS = new Set(["1", "2", "3", "4", "5", "6"]);

export function formatPoolDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatPoolDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function teamSourceLabel(source: TeamSource): string {
  return source.label;
}

export function resolveLastEvent(
  lastEvent: LastEventRef,
  knownEventIds: Set<string> = KNOWN_EVENT_IDS,
): LastEventRef {
  if (lastEvent.status !== "active") return lastEvent;
  if (!knownEventIds.has(lastEvent.eventId)) {
    return { status: "unavailable" };
  }
  return lastEvent;
}
