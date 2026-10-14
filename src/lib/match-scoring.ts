import type { ResultEntry, TeamData } from "@/components/dashboard/AddResultModal";

export type EventScoringRules = {
  placementPoints: number[];
  killPointsPerKill: number;
};

/** Fallback scoring used only when an event has no saved scoring rule. */
export const DEFAULT_MATCH_SCORING: EventScoringRules = {
  placementPoints: [15, 12, 10, 8, 6, 4, 2, 1],
  killPointsPerKill: 1,
};

export type MatchResultRow = {
  rank: number;
  teamId: string;
  teamName: string;
  position: number | "";
  wins: number;
  placementPoints: number;
  killPoints: number;
  totalPoints: number;
};

function teamName(teams: TeamData[], teamId: string) {
  return teams.find((team) => team.id === teamId)?.name ?? "Unknown team";
}

export function getPlacementPoints(position: number, rules: EventScoringRules) {
  if (position < 1) return 0;
  return rules.placementPoints[position - 1] ?? 0;
}

export function getKillPoints(totalKills: number | "", rules: EventScoringRules) {
  if (totalKills === "" || totalKills < 0) return 0;
  return totalKills * rules.killPointsPerKill;
}

export function buildMatchResultRows(
  results: ResultEntry[],
  teams: TeamData[],
  rules: EventScoringRules = DEFAULT_MATCH_SCORING,
): MatchResultRow[] {
  const rows = results.map((row) => {
    const position = typeof row.position === "number" ? row.position : null;
    const wins = position === 1 ? 1 : 0;
    const placementPoints = position ? getPlacementPoints(position, rules) : 0;
    const killPoints = getKillPoints(row.totalKills, rules);
    return {
      teamId: row.teamId,
      teamName: teamName(teams, row.teamId),
      position: row.position,
      wins,
      placementPoints,
      killPoints,
      totalPoints: placementPoints + killPoints,
    };
  });

  rows.sort(
    (a, b) =>
      b.totalPoints - a.totalPoints ||
      (typeof a.position === "number" ? a.position : 999) -
        (typeof b.position === "number" ? b.position : 999),
  );

  return rows.map((row, index) => ({
    ...row,
    rank: index + 1,
  }));
}
