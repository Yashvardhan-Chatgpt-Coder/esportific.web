export type EventTeamsExportRow = {
  slot: string | number;
  name: string;
  players: string[];
  tags: string[];
};

export type FullEventExportData = {
  name: string;
  game: string;
  format: string;
  startDate?: string;
  endDate?: string;
  scoringPreset: string;
  teams: Array<{
    id: string;
    slot: string;
    name: string;
    players: Array<{ id: string; name: string }>;
    tags: string[];
    contactMobile?: string;
  }>;
  matches: Array<{
    name: string;
    map: string;
    status: string;
    results: Array<{
      teamId: string;
      position: number | "";
      totalKills: number | "";
      playerKills: Record<string, number | "">;
    }>;
  }>;
  scoring: { placementPoints: number[]; killPointsPerKill: number };
};

function safeFilename(value: string) {
  return value.trim().replace(/[^\w-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") || "event";
}

export async function exportEventTeamsToExcel(
  eventName: string,
  teams: EventTeamsExportRow[],
  onProgress?: (percent: number) => void,
) {
  if (teams.length === 0) throw new Error("There are no event teams to export.");

  onProgress?.(10);
  const response = await fetch(`${import.meta.env.BASE_URL}Templates/event-export-template.xlsx`);
  if (!response.ok) throw new Error("The event export template could not be loaded.");

  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await response.arrayBuffer());

  const worksheet = workbook.getWorksheet("Teams");
  if (!worksheet) throw new Error("The event export template is missing its Teams sheet.");
  onProgress?.(45);

  // The supplied workbook is a full-event template. This action is specifically for
  // the Teams panel, so retain its formatted Teams sheet only.
  workbook.worksheets
    .filter((sheet) => sheet.id !== worksheet.id)
    .forEach((sheet) => workbook.removeWorksheet(sheet.id));

  worksheet.getCell("A2").value = `${eventName || "Event"} • participating teams`;
  worksheet.getCell("A4").value = `Teams registered for ${eventName || "this event"}.`;

  const headerRow = 6;
  const firstDataRow = headerRow + 1;
  const templateRowCount = 1;
  const lastDataRow = firstDataRow + teams.length - 1;

  // Extend the supplied row styling when a roster exceeds its sample row.
  for (let index = templateRowCount; index < teams.length; index += 1) {
    const target = worksheet.getRow(firstDataRow + index);
    const styleSource = worksheet.getRow(firstDataRow);
    for (let column = 1; column <= 6; column += 1) {
      target.getCell(column).style = { ...styleSource.getCell(column).style };
    }
    target.height = styleSource.height;
  }

  teams.forEach((team, index) => {
    const row = worksheet.getRow(firstDataRow + index);
    [
      Number(team.slot) || index + 1,
      team.name,
      team.players.join(", "),
      team.tags.join(", "),
      "",
      "",
    ].forEach((value, column) => {
      row.getCell(column + 1).value = value;
    });
  });

  worksheet.autoFilter = {
    from: { row: headerRow, column: 1 },
    to: { row: lastDataRow, column: 6 },
  };
  worksheet.views = [{ state: "frozen", ySplit: 2 }];
  worksheet.pageSetup.printArea = `A1:F${lastDataRow}`;
  if (workbook.views[0]) {
    workbook.views[0].activeTab = 0;
    workbook.views[0].firstSheet = 0;
  }

  onProgress?.(75);
  const output = await workbook.xlsx.writeBuffer();
  const blob = new Blob([new Uint8Array(output)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFilename(eventName)}_Teams.xlsx`;
  link.style.display = "none";
  document.body.appendChild(link);
  onProgress?.(95);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  onProgress?.(100);
}

export async function exportFullEventToExcel(
  event: FullEventExportData,
  onProgress?: (percent: number) => void,
) {
  onProgress?.(10);
  const response = await fetch(`${import.meta.env.BASE_URL}Templates/event-export-template.xlsx`);
  if (!response.ok) throw new Error("The event export template could not be loaded.");
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await response.arrayBuffer());

  const getSheet = (name: string) => {
    const sheet = workbook.getWorksheet(name);
    if (!sheet) throw new Error(`The event export template is missing its ${name} sheet.`);
    return sheet;
  };
  const fillSheet = (sheetName: string, headersAt: number, rows: unknown[][], columns: number) => {
    const sheet = getSheet(sheetName);
    // The provided workbook contains lengthy instructions and sample content.
    // Hide those template-only rows so the exported file opens on the actual data.
    [2, 3, 4, 5].forEach((rowNumber) => {
      sheet.getRow(rowNumber).hidden = true;
      for (let column = 1; column <= columns; column += 1) sheet.getRow(rowNumber).getCell(column).value = null;
    });
    const firstRow = headersAt + 1;
    const sampleRow = firstRow;
    const existingLastRow = Math.max(sheet.rowCount, firstRow);
    const lastRow = Math.max(firstRow + rows.length - 1, existingLastRow);
    for (let rowNumber = firstRow; rowNumber <= lastRow; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      row.hidden = rowNumber >= firstRow + rows.length;
      if (row.hidden) for (let col = 1; col <= columns; col += 1) row.getCell(col).value = null;
    }
    for (let index = 1; index < rows.length; index += 1) {
      const target = sheet.getRow(firstRow + index);
      const styleSource = sheet.getRow(sampleRow);
      for (let col = 1; col <= columns; col += 1) target.getCell(col).style = structuredClone(styleSource.getCell(col).style);
      target.height = styleSource.height;
    }
    // The template's example row uses italic placeholder text. Reset it to normal
    // live-data styling and isolate each cell's alignment so one merged label
    // cannot rotate or otherwise alter the rest of the workbook.
    for (let rowNumber = firstRow; rowNumber < firstRow + rows.length; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      for (let col = 1; col <= columns; col += 1) {
        const cell = row.getCell(col);
        cell.font = { ...structuredClone(cell.font), italic: false };
        cell.alignment = { ...structuredClone(cell.alignment), textRotation: 0 };
      }
    }
    rows.forEach((values, index) => values.forEach((value, col) => {
      sheet.getRow(firstRow + index).getCell(col + 1).value = value as never;
    }));
    sheet.autoFilter = rows.length ? {
      from: { row: headersAt, column: 1 },
      to: { row: headersAt + rows.length, column: columns },
    } : undefined;
    sheet.views = [{ state: "frozen", ySplit: 2 }];
    if (rows.length) sheet.pageSetup.printArea = `A1:${String.fromCharCode(64 + columns)}${firstRow + rows.length - 1}`;
  };
  const info = getSheet("Event Info");
  info.getCell("A1").value = "ESPORTIFIC  |  FULL EVENT EXPORT";
  [2, 3, 4, 5, 13, 14, 15, 16, 17, 18, 19].forEach((rowNumber) => {
    info.getRow(rowNumber).hidden = true;
    for (let column = 1; column <= 6; column += 1) info.getRow(rowNumber).getCell(column).value = null;
  });
  for (let rowNumber = 6; rowNumber <= 12; rowNumber += 1) {
    for (let column = 3; column <= 6; column += 1) info.getRow(rowNumber).getCell(column).value = null;
  }
  info.getCell("B7").value = event.name;
  info.getCell("B8").value = event.game;
  info.getCell("B9").value = event.format;
  info.getCell("B10").value = event.startDate || "";
  info.getCell("B11").value = event.endDate || "";
  info.getCell("B12").value = event.scoringPreset || "—";

  fillSheet("Teams", 6, event.teams.map((team, index) => [
    Number(team.slot) || index + 1,
    team.name,
    team.players.map((player) => player.name).join(", "),
    team.tags.join(", "),
    "",
    team.contactMobile || "",
  ]), 6);
  fillSheet("Matches", 6, event.matches.map((match, index) => [
    index + 1,
    match.name,
    match.map,
    match.status === "Completed" ? "Completed" : "Scheduled",
    "",
    "",
  ]), 6);

  const matchResultRows: unknown[][] = [];
  const matchNameRanges: Array<{ start: number; end: number }> = [];
  let resultRowNumber = 7;
  const playerKillMatchGroups: Array<{ rows: unknown[][] }> = [];
  event.matches.forEach((match, matchIndex) => {
    const calculated = match.results.map((result) => {
      const team = event.teams.find((candidate) => candidate.id === result.teamId);
      const position = typeof result.position === "number" ? result.position : 0;
      const kills = typeof result.totalKills === "number" ? result.totalKills : 0;
      const placement = position > 0 ? event.scoring.placementPoints[position - 1] || 0 : 0;
      const killPoints = kills * event.scoring.killPointsPerKill;
      return { result, team, position, kills, placement, killPoints, total: placement + killPoints };
    }).sort((a, b) => b.total - a.total || (a.position || 999) - (b.position || 999));
    const matchRows: unknown[][] = [];
    const matchPlayerKillRows: unknown[][] = [];
    calculated.forEach((item, index) => {
      matchRows.push([matchIndex + 1, match.name, index + 1, item.team?.name || "", item.position === 1 ? 1 : 0, item.placement, item.killPoints, item.total]);
      item.team?.players.forEach((player) => {
        const kills = item.result.playerKills[player.id] ?? item.result.playerKills[player.name];
        if (typeof kills === "number") matchPlayerKillRows.push([matchIndex + 1, match.name, item.team?.name || "", player.name, kills]);
      });
    });
    if (matchPlayerKillRows.length) {
      playerKillMatchGroups.push({ rows: matchPlayerKillRows });
    }
    if (matchRows.length) {
      const start = resultRowNumber;
      matchResultRows.push(...matchRows);
      resultRowNumber += matchRows.length;
      if (matchRows.length > 1) matchNameRanges.push({ start, end: resultRowNumber - 1 });
      if (matchIndex < event.matches.length - 1) {
        matchResultRows.push([]);
        resultRowNumber += 1;
      }
    }
  });
  const playerKillRows: unknown[][] = [];
  const playerKillNameRanges: Array<{ start: number; end: number }> = [];
  let playerKillRowNumber = 7;
  playerKillMatchGroups.forEach((group, index) => {
    const start = playerKillRowNumber;
    playerKillRows.push(...group.rows);
    playerKillRowNumber += group.rows.length;
    if (group.rows.length > 1) playerKillNameRanges.push({ start, end: playerKillRowNumber - 1 });
    if (index < playerKillMatchGroups.length - 1) {
      playerKillRows.push([]);
      playerKillRowNumber += 1;
    }
  });
  fillSheet("Match Results", 6, matchResultRows, 8);
  const matchResultsSheet = getSheet("Match Results");
  matchNameRanges.forEach(({ start, end }) => {
    matchResultsSheet.mergeCells(start, 2, end, 2);
    const matchName = matchResultsSheet.getCell(start, 2);
    matchName.style = structuredClone(matchName.style);
    matchName.alignment = { ...structuredClone(matchName.alignment), horizontal: "center", vertical: "middle", textRotation: 90, wrapText: true };
    matchName.font = { ...structuredClone(matchName.font), size: 10, bold: true, italic: false };
  });
  fillSheet("Player Kills", 6, playerKillRows, 5);
  const playerKillsSheet = getSheet("Player Kills");
  playerKillNameRanges.forEach(({ start, end }) => {
    playerKillsSheet.mergeCells(start, 2, end, 2);
    const matchName = playerKillsSheet.getCell(start, 2);
    matchName.style = structuredClone(matchName.style);
    matchName.alignment = { ...structuredClone(matchName.alignment), horizontal: "center", vertical: "middle", textRotation: 90, wrapText: true };
    matchName.font = { ...structuredClone(matchName.font), size: 10, bold: true, italic: false };
  });

  // Keep event info as the first visible sheet in the final workbook.
  workbook.views[0] = { ...workbook.views[0], activeTab: 0, firstSheet: 0 };
  onProgress?.(75);
  const output = await workbook.xlsx.writeBuffer();
  const blob = new Blob([new Uint8Array(output)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFilename(event.name)}_Full_Event_Export.xlsx`;
  link.style.display = "none";
  document.body.appendChild(link);
  onProgress?.(95);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  onProgress?.(100);
}
