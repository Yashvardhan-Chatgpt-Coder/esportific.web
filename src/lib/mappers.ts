import type {
  ApiEvent,
  ApiLeaderboardRow,
  ApiMatch,
  ApiMatchResult,
  ApiScoringRule,
  ApiTeam,
} from "@/lib/api";
import type { ResultEntry, TeamData } from "@/components/dashboard/AddResultModal";
import type { PoolTeam } from "@/lib/team-pool";
import type { ScoringRuleDraft, ScoringRuleTemplate } from "@/lib/scoring-rule-templates";
import { optimizeCloudinaryUrl } from "@/lib/utils";
import { getCodeDefinedGameLogo } from "@/lib/games-catalog";

const MONGO_ID_RE = /^[a-f\d]{24}$/i;

export function isMongoId(id: string): boolean {
  return MONGO_ID_RE.test(id);
}

function normalizeScoringRuleFormat(format?: string | null): string {
  const normalized = String(format || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (normalized === "battle_royale" || normalized === "br" || normalized.includes("battle")) {
    return "battle_royale";
  }
  if (
    normalized === "elimination" ||
    normalized === "head_to_head" ||
    normalized === "tdm" ||
    normalized.includes("elimination")
  ) {
    return "elimination";
  }

  return normalized || "battle_royale";
}

export function placementArrayToMap(points: number[]): Record<string, number> {
  const map: Record<string, number> = {};
  points.forEach((pts, index) => {
    if (pts > 0) map[String(index + 1)] = pts;
  });
  return map;
}

export function placementMapToArray(
  placementPoints: Record<string, number> | Map<string, number> | undefined,
  minLength = 20,
): number[] {
  const obj =
    placementPoints instanceof Map ? Object.fromEntries(placementPoints) : placementPoints || {};
  const keys = Object.keys(obj)
    .map((k) => parseInt(k, 10))
    .filter((n) => !Number.isNaN(n));
  const maxKey = keys.length ? Math.max(...keys) : 0;
  const length = Math.max(maxKey, minLength, 3);
  const arr = Array.from({ length }, () => 0);
  for (const [key, value] of Object.entries(obj)) {
    const idx = parseInt(key, 10) - 1;
    if (idx >= 0 && idx < arr.length) arr[idx] = value;
  }
  return arr;
}

export function apiScoringRuleToTemplate(rule: ApiScoringRule): ScoringRuleTemplate {
  const gameId =
    rule.gameId && typeof rule.gameId === "object" ? rule.gameId._id : rule.gameId || null;
  const gameName =
    rule.gameId && typeof rule.gameId === "object" ? rule.gameId.name : rule.gameName || "";
  return {
    id: rule._id,
    name: rule.name,
    description: rule.description || "",
    format: normalizeScoringRuleFormat(rule.format),
    gameId,
    gameName,
    isGeneric: rule.isGeneric !== false && !gameId,
    scoringFields: rule.scoringFields,
    isBuiltIn: false,
    isPlatform: Boolean(rule.isPlatform),
    placementPoints: placementMapToArray(rule.placementPoints, 1),
    killPointsPerKill: rule.killPoints ?? 1,
    winPoints: rule.winPoints ?? 0,
    drawPoints: rule.drawPoints ?? 0,
    lossPoints: rule.lossPoints ?? 0,
    updatedAt: rule.updatedAt,
  };
}

export function draftToApiPayload(draft: ScoringRuleDraft) {
  return {
    name: draft.name.trim(),
    format: draft.format,
    gameId: draft.gameId || null,
    gameName: draft.gameId ? draft.gameName || "" : "",
    isGeneric: !draft.gameId,
    scoringFields: draft.scoringFields,
    description: draft.description,
    killPoints: draft.killPointsPerKill,
    winPoints: draft.winPoints,
    drawPoints: draft.drawPoints,
    lossPoints: draft.lossPoints,
    placementPoints: placementArrayToMap(draft.placementPoints),
  };
}

export function apiTeamToPoolTeam(team: ApiTeam): PoolTeam {
  const hasEventSource =
    team.source === "event" || Boolean(team.sourceEventId || team.sourceEventName);
  const sourceLabel = team.sourceEventName ? `Event: ${team.sourceEventName}` : "Event";

  return {
    id: team._id,
    name: team.name,
    logo: team.logoUrl ? optimizeCloudinaryUrl(team.logoUrl) : null,
    tags: team.tags || [],
    contactMobile: team.contactMobile || "",
    notes: team.notes || "",
    lastUpdatedAt: team.updatedAt,
    matchesPlayed: 0,
    lastEvent: { status: "none" },
    topFraggers: (team.players || []).slice(0, 3).map((p) => ({ name: p.name, kills: 0 })),
    addedAt: team.createdAt,
    addedFrom: hasEventSource
      ? { type: "event", label: sourceLabel, eventId: team.sourceEventId || undefined }
      : { type: "pool", label: "Teams pool" },
  };
}

export function playersFromNames(names: string[]) {
  return names
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name, index) => ({
      playerId: `p${index + 1}`,
      name,
      inGameId: "",
    }));
}

export function dataUrlToFile(dataUrl: string, filename = "logo.png"): File | null {
  try {
    const [header, base64] = dataUrl.split(",");
    if (!base64) return null;
    const mime = header.match(/:(.*?);/)?.[1] || "image/png";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], filename, { type: mime });
  } catch {
    return null;
  }
}

export function formatEventDate(startDate?: string, endDate?: string): string {
  if (!startDate && !endDate) return "—";
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (startDate && endDate && startDate !== endDate) {
    return `${fmt(startDate)} - ${fmt(endDate)}`;
  }
  return startDate ? fmt(startDate) : endDate ? fmt(endDate) : "—";
}

export function getEventGame(event: ApiEvent) {
  const game = event.gameId && typeof event.gameId !== "string" ? event.gameId : null;
  const name = game?.name || event.game || "—";
  return {
    name,
    logo: game?.logoLight || game?.logoDark || game?.logo || getCodeDefinedGameLogo(name),
  };
}

export function apiEventToRow(event: ApiEvent) {
  const teams = Array.isArray(event.teams) ? event.teams : [];
  const teamCount = teams.length;
  const game = getEventGame(event);
  return {
    id: event._id,
    name: event.name,
    game: game.name,
    gameLogo: game.logo,
    format: event.format || "—",
    date: formatEventDate(event.startDate, event.endDate),
    teams: teamCount,
    matches: event.matchCount ?? 0,
    status: event.status,
  };
}

export function apiTeamsToTeamData(teams: ApiTeam[]): TeamData[] {
  return teams.map((team) => ({
    id: team._id,
    name: team.name,
    players: (team.players || []).map((p) => ({
      id: p.playerId || p.name,
      name: p.name,
    })),
  }));
}

export function apiMatchResultsToEntries(results: ApiMatchResult[]): ResultEntry[] {
  return results.map((r) => {
    const teamId = typeof r.teamId === "string" ? r.teamId : r.teamId._id;
    const playerKills: Record<string, number | ""> = {};
    if (r.playerKills) {
      const raw = r.playerKills instanceof Map ? Object.fromEntries(r.playerKills) : r.playerKills;
      for (const [key, val] of Object.entries(raw)) {
        playerKills[key] = typeof val === "number" ? val : Number(val) || "";
      }
    }
    return {
      id: r._id,
      teamId,
      position: r.placement,
      totalKills: r.kills,
      playerKills,
    };
  });
}

export function resultEntriesToPayload(entries: ResultEntry[]) {
  return entries
    .filter((e) => e.teamId && e.position !== "" && e.totalKills !== "")
    .map((e) => {
      const playerKills: Record<string, number> = {};
      for (const [key, val] of Object.entries(e.playerKills)) {
        if (typeof val === "number") playerKills[key] = val;
      }
      return {
        teamId: e.teamId,
        placement: Number(e.position),
        kills: Number(e.totalKills),
        playerKills,
      };
    });
}

export function leaderboardToStandingsPreview(rows: ApiLeaderboardRow[]) {
  return rows.slice(0, 5).map((row) => ({
    rank: row.rank,
    name: row.team?.name || "Unknown",
    pts: row.totalPoints,
  }));
}
