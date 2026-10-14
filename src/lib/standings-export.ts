export type StandingsExportMode = "points" | "shooters";
export type StandingsExportScope = "overall" | "single-match" | "till-match";

export type PointsTableExportRow = {
  rank: number;
  team: string;
  position: number | string;
  matchesPlayed: number;
  wins: number;
  positionPoints: number;
  killPoints: number;
  totalPoints: number;
};

export type TopShooterExportRow = {
  rank: number;
  player: string;
  team: string;
  matchesPlayed: number;
  kills: number;
  averageKills: number;
};

type StandingsExportOptions = {
  mode: StandingsExportMode;
  scope: StandingsExportScope;
  eventName: string;
  selectedMatchLabel?: string;
  pointRows: PointsTableExportRow[];
  shooterRows: TopShooterExportRow[];
  onProgress?: (percent: number) => void;
};

function safeFilename(value: string) {
  return value.trim().replace(/[^\w-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") || "standings";
}

function scopeLabel(scope: StandingsExportScope) {
  if (scope === "single-match") return "Single Match";
  if (scope === "till-match") return "Till Match";
  return "Overall";
}

function scopeDescription(scope: StandingsExportScope, matchLabel: string) {
  if (scope === "single-match") {
    return `SINGLE MATCH: Results for ${matchLabel} only. Pending matches are excluded.`;
  }
  if (scope === "till-match") {
    return `TILL MATCH: Includes completed matches up to and including ${matchLabel}. Pending matches are excluded.`;
  }
  return "OVERALL: Includes all completed matches. Pending matches are excluded.";
}

function downloadWorkbook(blob: Blob, filename: string, onProgress?: (percent: number) => void) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  onProgress?.(95);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  onProgress?.(100);
}

export async function exportStandingsToExcel({
  mode,
  scope,
  eventName,
  selectedMatchLabel = "—",
  pointRows,
  shooterRows,
  onProgress,
}: StandingsExportOptions): Promise<void> {
  const rows = mode === "points" ? pointRows : shooterRows;
  if (rows.length === 0) throw new Error("There are no standings to export for this selection.");

  onProgress?.(10);
  const response = await fetch(`${import.meta.env.BASE_URL}Templates/standings-export-template.xlsx`);
  if (!response.ok) throw new Error("The standings export template could not be loaded.");

  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await response.arrayBuffer());

  const selectedSheet = mode === "points" ? "Points Table" : "Top Shooters";
  const worksheet = workbook.getWorksheet(selectedSheet);
  if (!worksheet) throw new Error(`The standings export template is missing its ${selectedSheet} sheet.`);

  onProgress?.(40);
  const columnCount = mode === "points" ? 8 : 6;
  const firstDataRow = 12;
  const templateDataRowCount = 53;
  const lastDataRow = firstDataRow + rows.length - 1;
  const extraRows = Math.max(0, rows.length - templateDataRowCount);

  worksheet.getCell("B5").value = eventName || "—";
  worksheet.getCell("B6").value = mode === "points" ? "Points Table" : "Top Shooters";
  worksheet.getCell("B7").value = scopeLabel(scope);
  worksheet.getCell("B8").value = scope === "overall" ? "—" : selectedMatchLabel;
  worksheet.getCell("A9").value = scopeDescription(scope, selectedMatchLabel);
  worksheet.unMergeCells(mode === "points" ? "A66:H66" : "A66:F66");
  worksheet.getCell("A66").value = null;

  // The supplied sheets format 53 result rows. Match that alternating row style if an event exceeds it.
  for (let index = templateDataRowCount; index < rows.length; index += 1) {
    const target = worksheet.getRow(firstDataRow + index);
    const styleSource = worksheet.getRow(index % 2 === 1 ? 15 : 16);
    for (let column = 1; column <= columnCount; column += 1) {
      target.getCell(column).style = { ...styleSource.getCell(column).style };
    }
    target.height = styleSource.height;
  }

  const lastFormattedRow = Math.max(66, lastDataRow);
  for (let rowNumber = firstDataRow; rowNumber <= lastFormattedRow; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    row.hidden = rowNumber > lastDataRow;
    if (row.hidden) {
      for (let column = 1; column <= columnCount; column += 1) row.getCell(column).value = null;
    }
  }

  if (mode === "points") {
    pointRows.forEach((row, index) => {
      const target = worksheet.getRow(firstDataRow + index);
      [
        row.rank,
        row.team,
        scope === "single-match" ? row.position : "—",
        row.matchesPlayed,
        row.wins,
        row.positionPoints,
        row.killPoints,
        row.totalPoints,
      ].forEach((value, column) => {
        target.getCell(column + 1).value = value;
      });
    });
  } else {
    shooterRows.forEach((row, index) => {
      const target = worksheet.getRow(firstDataRow + index);
      [row.rank, row.player, row.team, row.matchesPlayed, row.kills, row.averageKills].forEach(
        (value, column) => {
          target.getCell(column + 1).value = value;
        },
      );
    });
  }

  worksheet.autoFilter = {
    from: { row: 11, column: 1 },
    to: { row: lastDataRow, column: columnCount },
  };
  worksheet.views = [{ state: "frozen", ySplit: 2 }];
  worksheet.pageSetup.printArea = `A1:${mode === "points" ? "H" : "F"}${lastDataRow}`;

  workbook.worksheets
    .filter((sheet) => sheet.id !== worksheet.id)
    .forEach((sheet) => workbook.removeWorksheet(sheet.id));
  if (workbook.views[0]) {
    workbook.views[0].activeTab = 0;
    workbook.views[0].firstSheet = 0;
  }

  onProgress?.(75);
  const output = await workbook.xlsx.writeBuffer();
  const blob = new Blob([new Uint8Array(output)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const filename = [
    eventName,
    scope === "overall" ? "" : selectedMatchLabel,
    scopeLabel(scope),
    selectedSheet,
  ]
    .filter((part) => part && !(scope === "overall" && part === "—"))
    .map(safeFilename)
    .join("_");
  downloadWorkbook(blob, `${filename}.xlsx`, onProgress);
}
