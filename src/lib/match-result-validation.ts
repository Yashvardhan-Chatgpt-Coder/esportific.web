import type { ResultEntry, TeamData } from "@/components/dashboard/AddResultModal";

export function findDuplicatePlacement(results: ResultEntry[], teams: TeamData[]) {
  const placementTeams = new Map<number, string[]>();

  results.forEach((result) => {
    if (typeof result.position !== "number") return;
    const teamName = teams.find((team) => team.id === result.teamId)?.name || "Unknown team";
    placementTeams.set(result.position, [...(placementTeams.get(result.position) || []), teamName]);
  });

  const duplicate = [...placementTeams.entries()].find(([, teamNames]) => teamNames.length > 1);
  if (!duplicate) return null;

  const [position, teamNames] = duplicate;
  return { position, teamNames };
}

export function duplicatePlacementMessage(duplicate: { position: number; teamNames: string[] }) {
  return `Position #${duplicate.position} is used by ${duplicate.teamNames.join(" and ")}. Each team must have a unique placement.`;
}
