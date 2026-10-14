import type { ResultEntry, TeamData } from "@/components/dashboard/AddResultModal";

export type MatchResultsImportPreview = {
  results: ResultEntry[];
  mismatches: Array<{ teamName: string; entered: number; playerTotal: number }>;
};

const normalizeHeader = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
const normalizeName = (value: unknown) => String(value ?? "").trim().toLocaleLowerCase();
const isExample = (value: string) => /^example\s+(team|player)(?:\s|$)/i.test(value.trim());

function sheetRows(XLSX: typeof import("xlsx"), workbook: import("xlsx").WorkBook, name: string, required: boolean) {
  const sheetName = workbook.SheetNames.find((sheet) => normalizeHeader(sheet) === normalizeHeader(name));
  if (!sheetName) {
    if (!required) return [] as unknown[][];
    throw new Error(`The workbook is missing the “${name}” sheet.`);
  }
  return XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, blankrows: false, defval: "" });
}

function findHeaderRow(rows: unknown[][], requiredHeader: string) {
  const index = rows.findIndex((row) => row.some((cell) => normalizeHeader(cell) === normalizeHeader(requiredHeader)));
  if (index < 0) throw new Error(`The sheet must contain a “${requiredHeader}” column.`);
  return index;
}

function integerValue(value: unknown, label: string, options: { min: number; optional?: boolean }) {
  const text = String(value ?? "").trim();
  if (!text && options.optional) return "";
  if (!/^\d+$/.test(text)) throw new Error(`${label} must be a whole number${options.optional ? " or blank" : ""}.`);
  const number = Number(text);
  if (number < options.min) throw new Error(`${label} must be ${options.min === 0 ? "zero or greater" : "at least 1"}.`);
  return number;
}

export async function parseMatchResultsExcelFile(
  file: File,
  teams: TeamData[],
  existingResults: ResultEntry[],
): Promise<MatchResultsImportPreview> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const resultRows = sheetRows(XLSX, workbook, "Match Results", true);
  const playerRows = sheetRows(XLSX, workbook, "Player Kills", false);
  const resultHeaderIndex = findHeaderRow(resultRows, "Team Name *");
  const resultHeaders = resultRows[resultHeaderIndex].map(normalizeHeader);
  const teamNameCol = resultHeaders.findIndex((header) => ["teamname", "teamname"].includes(header));
  const positionCol = resultHeaders.findIndex((header) => header === "position" || header === "rank");
  const totalCol = resultHeaders.findIndex((header) => ["totalkills", "kills", "killtotal"].includes(header));
  if (teamNameCol < 0) throw new Error("The Match Results sheet needs a Team Name column.");

  const teamByName = new Map(teams.map((team) => [normalizeName(team.name), team]));
  const existingTeamIds = new Set(existingResults.map((result) => result.teamId));
  const resultByTeam = new Map<string, { team: TeamData; position: number | ""; totalKills: number | ""; playerKills: Record<string, number | "">; hasTotal: boolean }>();
  const usedPositions = new Set(existingResults.map((result) => result.position).filter((position): position is number => typeof position === "number"));
  const reservedPositions = new Set(usedPositions);
  resultRows.slice(resultHeaderIndex + 1).forEach((row) => {
    const name = String(row[teamNameCol] ?? "").trim();
    if (!name || isExample(name) || positionCol < 0) return;
    const position = integerValue(row[positionCol], `${name} position`, { min: 1, optional: true });
    if (typeof position === "number") reservedPositions.add(position);
  });

  resultRows.slice(resultHeaderIndex + 1).forEach((row) => {
    const name = String(row[teamNameCol] ?? "").trim();
    if (!name || isExample(name)) return;
    const team = teamByName.get(normalizeName(name));
    if (!team) throw new Error(`Team “${name}” is not part of this event.`);
    if (existingTeamIds.has(team.id)) throw new Error(`Results already exist for “${team.name}”. Remove the existing result before importing it again.`);
    if (resultByTeam.has(team.id)) throw new Error(`Team “${team.name}” appears more than once in the Match Results sheet.`);

    const position = positionCol < 0 ? "" : integerValue(row[positionCol], `${team.name} position`, { min: 1, optional: true });
    const totalKills = totalCol < 0 ? "" : integerValue(row[totalCol], `${team.name} total kills`, { min: 0, optional: true });
    let nextPosition = 1;
    while (reservedPositions.has(nextPosition) || usedPositions.has(nextPosition)) nextPosition += 1;
    const resolvedPosition = typeof position === "number" ? position : nextPosition;
    usedPositions.add(resolvedPosition);
    resultByTeam.set(team.id, { team, position: resolvedPosition, totalKills, playerKills: {}, hasTotal: totalKills !== "" });
  });

  if (resultByTeam.size === 0) throw new Error("No match results were found. Add at least one team row beneath the headers.");

  if (playerRows.length) {
    const playerHeaderIndex = findHeaderRow(playerRows, "Team Name *");
    const headers = playerRows[playerHeaderIndex].map(normalizeHeader);
    const teamCol = headers.findIndex((header) => header === "teamname");
    const playerCol = headers.findIndex((header) => header === "playername");
    const killsCol = headers.findIndex((header) => header === "kills" || header === "playerkills");
    if (teamCol < 0 || playerCol < 0 || killsCol < 0) throw new Error("The Player Kills sheet needs Team Name, Player Name, and Kills columns.");
    playerRows.slice(playerHeaderIndex + 1).forEach((row) => {
      const teamName = String(row[teamCol] ?? "").trim();
      const playerName = String(row[playerCol] ?? "").trim();
      if (!teamName && !playerName) return;
      if (isExample(teamName) || isExample(playerName)) return;
      if (!teamName || !playerName) throw new Error("Each player-kill row needs both a team name and a player name.");
      const team = teamByName.get(normalizeName(teamName));
      if (!team) throw new Error(`Team “${teamName}” in Player Kills is not part of this event.`);
      const result = resultByTeam.get(team.id);
      if (!result) throw new Error(`Add “${team.name}” to the Match Results sheet before entering its player kills.`);
      const player = team.players.find((candidate) => normalizeName(candidate.name) === normalizeName(playerName));
      if (!player) throw new Error(`Player “${playerName}” is not on “${team.name}” roster.`);
      const kills = integerValue(row[killsCol], `${player.name} kills`, { min: 0 });
      const previous = result.playerKills[player.id];
      result.playerKills[player.id] = (typeof previous === "number" ? previous : 0) + Number(kills);
    });
  }

  const mismatches: MatchResultsImportPreview["mismatches"] = [];
  const results = Array.from(resultByTeam.values()).map(({ team, position, totalKills, playerKills, hasTotal }) => {
    const playerTotal = Object.values(playerKills).reduce<number>((sum, value) => sum + (typeof value === "number" ? value : 0), 0);
    if (Object.keys(playerKills).length > 0 && hasTotal && Number(totalKills) !== playerTotal) {
      mismatches.push({ teamName: team.name, entered: Number(totalKills), playerTotal });
    }
    return {
      id: crypto.randomUUID(),
      teamId: team.id,
      position: typeof position === "number" ? position : 1,
      totalKills: hasTotal ? Number(totalKills) : playerTotal,
      playerKills,
    } satisfies ResultEntry;
  });

  return { results, mismatches };
}

export async function downloadMatchResultsImportTemplate() {
  const response = await fetch(`${import.meta.env.BASE_URL}Templates/match-results-import-template.xlsx`);
  if (!response.ok) throw new Error("The match results import template could not be loaded.");
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = "Esportific_Match_Results_Import.xlsx";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
