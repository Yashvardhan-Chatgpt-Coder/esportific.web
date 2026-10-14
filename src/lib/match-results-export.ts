import type { ResultEntry, TeamData } from "@/components/dashboard/AddResultModal";
import {
  buildMatchResultRows,
  type EventScoringRules,
  DEFAULT_MATCH_SCORING,
} from "@/lib/match-scoring";

function downloadBlob(blob: Blob, filename: string, onProgress?: (percent: number) => void) {
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

function safeFilename(name: string) {
  return name.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_");
}

export async function exportMatchResultsToExcel(
  match: { name: string },
  results: ResultEntry[],
  teams: TeamData[],
  scoring: EventScoringRules = DEFAULT_MATCH_SCORING,
  organizerName?: string,
  eventName?: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  if (results.length === 0) throw new Error("There are no match results to export.");

  onProgress?.(15);
  const templateUrl = `${import.meta.env.BASE_URL}Templates/match-results-export-template.xlsx`;
  const templateResponse = await fetch(templateUrl);
  if (!templateResponse.ok) throw new Error("The match results export template could not be loaded.");

  const templateBuffer = await templateResponse.arrayBuffer();
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(templateBuffer);

  const worksheet = workbook.getWorksheet("Match Results Export");
  if (!worksheet) throw new Error("The match results export template is missing its results sheet.");

  onProgress?.(35);
  const rows = buildMatchResultRows(results, teams, scoring);
  worksheet.name = "Match Results";
  worksheet.getCell("B5").value = eventName || "—";
  worksheet.getCell("B6").value = match.name;
  worksheet.getCell("B7").value = organizerName || "—";

  const firstDataRow = 10;
  const templateDataRowCount = 53;
  const extraRows = Math.max(0, rows.length - templateDataRowCount);
  for (let index = templateDataRowCount; index < rows.length; index += 1) {
    const target = worksheet.getRow(firstDataRow + index);
    const styleSource = worksheet.getRow(index % 2 === 1 ? 13 : 14);
    for (let column = 1; column <= 6; column += 1) {
      target.getCell(column).style = { ...styleSource.getCell(column).style };
    }
    target.height = styleSource.height;
  }

  // Remove every template sample value before writing live data, and hide unused styled rows.
  const lastFormattedRow = Math.max(64, firstDataRow + rows.length - 1);
  worksheet.unMergeCells("A64:F64");
  worksheet.getCell("A64").value = null;
  for (let rowNumber = firstDataRow; rowNumber <= lastFormattedRow; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    row.hidden = rowNumber >= firstDataRow + rows.length;
    if (row.hidden) {
      for (let column = 1; column <= 6; column += 1) row.getCell(column).value = null;
    }
  }

  rows.forEach((row, index) => {
    const target = worksheet.getRow(firstDataRow + index);
    target.getCell(1).value = row.rank;
    target.getCell(2).value = row.teamName;
    target.getCell(3).value = row.wins;
    target.getCell(4).value = row.placementPoints;
    target.getCell(5).value = row.killPoints;
    target.getCell(6).value = row.totalPoints;
  });

  const firstUnusedRow = firstDataRow + rows.length;
  const lastDataRow = firstUnusedRow - 1;

  worksheet.autoFilter = {
    from: { row: 9, column: 1 },
    to: { row: 9 + rows.length, column: 6 },
  };
  worksheet.views = [{ state: "frozen", ySplit: 2 }];
  worksheet.pageSetup.printArea = `A1:F${lastDataRow}`;

  const guideSheet = workbook.getWorksheet("Export Guide");
  if (guideSheet) workbook.removeWorksheet(guideSheet.id);

  onProgress?.(70);
  const output = await workbook.xlsx.writeBuffer();
  const blob = new Blob([new Uint8Array(output)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const filenameParts = [eventName, match.name, "results"].filter(Boolean).join("-");
  downloadBlob(blob, `${safeFilename(filenameParts)}.xlsx`, onProgress);
}

export async function exportMatchResultsToImage(
  element: HTMLElement,
  match: { name: string },
  onProgress?: (percent: number) => void,
) {
  onProgress?.(15);
  const { toPng } = await import("html-to-image");
  const dataUrl = await toPng(element, {
    backgroundColor: "#ffffff",
    pixelRatio: 2,
    cacheBust: true,
  });
  onProgress?.(90);

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${safeFilename(match.name)}-results.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  onProgress?.(100);
}

async function loadLogoDataUrl(): Promise<string> {
  const logoUrl = "/Brand/new-logo.png";
  try {
    const res = await fetch(logoUrl);
    if (!res.ok) return logoUrl;
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : logoUrl);
      reader.onerror = () => resolve(logoUrl);
      reader.readAsDataURL(blob);
    });
  } catch {
    return logoUrl;
  }
}

export async function exportMatchResultsPlainImage(
  match: { name: string; map?: string },
  results: ResultEntry[],
  teams: TeamData[],
  scoring: EventScoringRules = DEFAULT_MATCH_SCORING,
  organizerName?: string,
  eventName?: string,
  onProgress?: (percent: number) => void,
) {
  onProgress?.(10);
  const { toPng } = await import("html-to-image");
  const logoSrc = await loadLogoDataUrl();
  const rows = buildMatchResultRows(results, teams, scoring);
  onProgress?.(25);
  const width = 1080;
  const height = Math.max(1350, 72 * 2 + 140 + 62 + rows.length * 58 + 80);
  const canvas = document.createElement("div");
  canvas.style.position = "absolute";
  canvas.style.left = "0";
  canvas.style.top = "0";
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.background = "#ffffff";
  canvas.style.padding = "72px";
  canvas.style.boxSizing = "border-box";
  canvas.style.fontFamily = "Plus Jakarta Sans, Arial, sans-serif";
  canvas.style.color = "#000000";
  canvas.style.zIndex = "-1";
  canvas.style.pointerEvents = "none";

  const safe = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char] || char);

  canvas.innerHTML = `
    <div style="height:100%; display:flex; flex-direction:column;">
      <div style="display:flex; justify-content:space-between; align-items:flex-end; gap:24px; margin-bottom:36px;">
        <div>
          <div style="font-size:20px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:#666;">
            ${eventName ? `${safe(eventName)} &nbsp;•&nbsp; ` : ""}Match Results
          </div>
          <div style="font-size:52px; font-weight:800; line-height:1.05; margin-top:8px;">${safe(match.name)}</div>
        </div>
        <div style="text-align:right; display:flex; flex-direction:column; align-items:flex-end; justify-content:flex-end;">
          ${match.map ? `<div style="font-size:24px; font-weight:700; color:#111; text-transform:uppercase; letter-spacing:0.5px;">${safe(match.map)}</div>` : ""}
          ${organizerName ? `<div style="font-size:18px; font-weight:600; color:#666; margin-top:6px;">Organized by <span style="color:#000; font-weight:800;">${safe(organizerName)}</span></div>` : ""}
        </div>
      </div>
      <div style="overflow:hidden; border:1px solid #e2e5ec; border-radius:14px;">
        <table style="width:100%; border-collapse:collapse; table-layout:fixed; font-size:24px;">
          <thead>
            <tr style="height:62px; background:#000; color:#fff;">
              <th style="width:10%; text-align:center;">#</th>
              <th style="width:34%; text-align:left; padding:0 18px;">Team</th>
              <th style="width:14%; text-align:center;">Wins</th>
              <th style="width:16%; text-align:center;">Place Pts</th>
              <th style="width:14%; text-align:center;">Kill Pts</th>
              <th style="width:12%; text-align:center;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row, index) => `
                  <tr style="height:58px; background:${index % 2 ? "#f7f8fb" : "#ffffff"};">
                    <td style="text-align:center; font-weight:800; border-top:1px solid #e2e5ec;">${safe(row.rank)}</td>
                    <td style="padding:0 18px; font-weight:800; text-transform:uppercase; border-top:1px solid #e2e5ec; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${safe(row.teamName)}</td>
                    <td style="text-align:center; font-weight:700; border-top:1px solid #e2e5ec;">${row.position === 1 ? 1 : 0}</td>
                    <td style="text-align:center; font-weight:700; border-top:1px solid #e2e5ec;">${safe(row.placementPoints)}</td>
                    <td style="text-align:center; font-weight:700; border-top:1px solid #e2e5ec;">${safe(row.killPoints)}</td>
                    <td style="text-align:center; font-weight:900; border-top:1px solid #e2e5ec;">${safe(row.totalPoints)}</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
      <div style="margin-top:auto; display:flex; justify-content:space-between; align-items:center; border-top:1px solid #e2e5ec; padding-top:24px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="color:#666; font-size:20px; font-weight:700;">Made With</span>
          <img src="${logoSrc}" alt="Esportific" style="height:32px; width:auto; max-width:220px; object-fit:contain; display:block;" />
        </div>
        <span style="color:#666; font-size:20px; font-weight:700;">${rows.length} teams</span>
      </div>
    </div>
  `;

  document.body.appendChild(canvas);
  try {
    if ("fonts" in document) {
      await document.fonts.ready.catch(() => undefined);
    }
    const imgs = Array.from(canvas.querySelectorAll("img"));
    await Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }),
      ),
    );
    onProgress?.(45);
    const dataUrl = await toPng(canvas, {
      backgroundColor: "#ffffff",
      width,
      height,
      pixelRatio: 2,
      cacheBust: true,
      style: {
        margin: "0",
        transform: "none",
      },
    });
    onProgress?.(90);

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${safeFilename(match.name)}-results.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    onProgress?.(100);
  } finally {
    canvas.remove();
  }
}

export { buildMatchResultRows };
