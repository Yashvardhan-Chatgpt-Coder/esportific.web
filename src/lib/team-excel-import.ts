import type { Team } from "@/components/dashboard/AddTeamModal";
import type { AddPoolTeamInput } from "@/components/dashboard/AddPoolTeamModal";
import type { PoolTeam } from "@/lib/team-pool";

type ParsedTeamRow = {
  slotNumber: string;
  name: string;
  tags: string[];
  players: string[];
  addToDatabase: boolean;
  contactMobile: string;
};

const normalizeHeader = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const splitList = (value: unknown) =>
  String(value ?? "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

const parseBoolean = (value: unknown) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["yes", "y", "true", "1", "save"].includes(normalized);
};

const findColumnIndex = (headers: string[], aliases: string[]) => {
  const normalizedAliases = aliases.map(normalizeHeader);
  return headers.findIndex((header) => normalizedAliases.includes(normalizeHeader(header)));
};

function formatPhoneFromRow(countryCodeRaw: string, phoneNumberRaw: string): string {
  const cc = countryCodeRaw.trim();
  const phone = phoneNumberRaw.trim();

  if (!cc && !phone) return "";

  if (cc && phone) {
    const formattedCode = cc.startsWith("+") ? cc : `+${cc.replace(/^[^\d+]+/, "")}`;
    // If user already included dial code in phone number
    if (phone.startsWith("+")) {
      return phone;
    }
    return `${formattedCode} ${phone}`.trim();
  }

  if (phone) {
    return phone;
  }

  return cc;
}

function parseRows(rows: unknown[][]): ParsedTeamRow[] {
  const headerIndex = rows.findIndex((row) =>
    row.some((cell) => normalizeHeader(cell) === "teamname" || normalizeHeader(cell) === "team"),
  );

  if (headerIndex === -1) {
    throw new Error("Excel must include a Team Name column.");
  }

  const headers = rows[headerIndex].map((cell) => String(cell ?? "").trim());
  const dataRows = rows.slice(headerIndex + 1);
  const slotIndex = findColumnIndex(headers, ["Slot Number", "Slot", "Slot No", "Slot No."]);
  const nameIndex = findColumnIndex(headers, ["Team Name", "Team"]);
  const tagsIndex = findColumnIndex(headers, ["Tags", "Tag"]);
  const countryCodeIndex = findColumnIndex(headers, ["Country Code", "CountryCode", "Dial Code", "DialCode", "ISD Code", "Code"]);
  const phoneIndex = findColumnIndex(headers, [
    "Phone Number",
    "PhoneNumber",
    "Mobile Number",
    "MobileNumber",
    "Phone",
    "Mobile",
    "Contact Number",
    "Contact Mobile",
    "Number",
  ]);
  const playersIndex = findColumnIndex(headers, ["Players", "Player Names"]);
  const saveToDatabaseIndex = findColumnIndex(headers, ["Save to Database", "Add to Database", "Save Team", "Pool"]);

  if (nameIndex === -1) {
    throw new Error("Excel must include a Team Name column.");
  }

  return dataRows
    .map((row) => {
      const name = String(row[nameIndex] ?? "").trim();
      const rawCountryCode = countryCodeIndex >= 0 ? String(row[countryCodeIndex] ?? "").trim() : "";
      const rawPhone = phoneIndex >= 0 ? String(row[phoneIndex] ?? "").trim() : "";
      const contactMobile = formatPhoneFromRow(rawCountryCode, rawPhone);

      return {
        slotNumber: slotIndex >= 0 ? String(row[slotIndex] ?? "").trim() : "",
        name,
        tags: tagsIndex >= 0 ? splitList(row[tagsIndex]) : [],
        players: playersIndex >= 0 ? splitList(row[playersIndex]) : [],
        addToDatabase: saveToDatabaseIndex >= 0 ? parseBoolean(row[saveToDatabaseIndex]) : false,
        contactMobile,
      };
    })
    .filter((row) => row.name && !/^example\s+team(?:\s|$)/i.test(row.name));
}

export async function parseTeamsExcelFile(file: File): Promise<Team[]> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("Excel file does not contain a sheet.");
  }

  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    blankrows: false,
    defval: "",
  });
  const parsedRows = parseRows(rows);

  if (parsedRows.length === 0) {
    throw new Error("No valid teams found. Add at least one row with Team Name.");
  }

  return parsedRows.map((row) => ({
    id: crypto.randomUUID(),
    name: row.name,
    logo: null,
    slotNumber: row.slotNumber,
    tags: row.tags,
    contactMobile: row.contactMobile,
    addToDatabase: row.addToDatabase,
    players: row.players,
  }));
}

export async function parsePoolTeamsExcelFile(file: File): Promise<AddPoolTeamInput[]> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("Excel file does not contain a sheet.");
  }

  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    blankrows: false,
    defval: "",
  });
  const parsedRows = parseRows(rows);

  if (parsedRows.length === 0) {
    throw new Error("No valid teams found. Add at least one row with Team Name.");
  }

  return parsedRows.map((row) => ({
    name: row.name,
    logo: null,
    tags: row.tags,
    contactMobile: row.contactMobile,
  }));
}

export async function downloadTeamImportTemplate(mode: "event" | "pool" = "event") {
  const fileName = mode === "pool" ? "teams-pool-import-template.xlsx" : "teams-event-import-template.xlsx";
  const response = await fetch(`${import.meta.env.BASE_URL}Templates/${fileName}`);
  if (!response.ok) throw new Error("The Excel import template could not be loaded.");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = mode === "pool" ? "Esportific_Teams_Pool_Import.xlsx" : "Esportific_Event_Teams_Import.xlsx";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function safeFilename(value: string) {
  return value.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") || "teams-pool";
}

export async function exportPoolTeamsToExcel(
  teams: PoolTeam[],
  options: { filename?: string; getLastEventLabel?: (team: PoolTeam) => string; onProgress?: (percent: number) => void } = {},
) {
  options.onProgress?.(10);
  const XLSX = await import("xlsx");
  options.onProgress?.(30);
  const headers = [
    "Team Name",
    "Tags",
    "Mobile Number",
    "Matches Played",
    "Last Event",
    "Added From",
    "Added At",
  ];
  const rows = teams.map((team) => [
    team.name,
    team.tags.join(", "),
    team.contactMobile,
    team.matchesPlayed,
    options.getLastEventLabel?.(team) ?? "",
    team.addedFrom.label,
    team.addedAt ? new Date(team.addedAt).toLocaleString() : "",
  ]);
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  options.onProgress?.(70);
  worksheet["!cols"] = [
    { wch: 30 },
    { wch: 28 },
    { wch: 22 },
    { wch: 16 },
    { wch: 30 },
    { wch: 22 },
    { wch: 24 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Teams Pool");
  options.onProgress?.(90);
  XLSX.writeFile(workbook, `${safeFilename(options.filename || "teams-pool")}.xlsx`);
  options.onProgress?.(100);
}
