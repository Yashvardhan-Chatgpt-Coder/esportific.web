"use client";

import { useEffect, useRef, useState } from "react";
import { CornerDownLeft, Download, Import, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { queue } from "@/components/ui/Toast";
import { downloadTeamImportTemplate, parsePoolTeamsExcelFile, parseTeamsExcelFile } from "@/lib/team-excel-import";
import type { Team } from "@/components/dashboard/AddTeamModal";
import type { AddPoolTeamInput } from "@/components/dashboard/AddPoolTeamModal";

type EventTeamExcelImportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "event";
  onImport: (teams: Team[]) => void | Promise<void>;
};

type PoolTeamExcelImportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "pool";
  onImport: (teams: AddPoolTeamInput[]) => void | Promise<void>;
};

type TeamExcelImportModalProps = EventTeamExcelImportModalProps | PoolTeamExcelImportModalProps;

type PreviewTeam = Team | AddPoolTeamInput;

function isEventTeam(team: PreviewTeam): team is Team {
  return "players" in team;
}

export function TeamExcelImportModal({ open, onOpenChange, onImport, mode = "event" }: TeamExcelImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [teams, setTeams] = useState<PreviewTeam[]>([]);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const isPoolMode = mode === "pool";

  const reset = () => {
    setTeams([]);
    setFileName("");
    setIsDragging(false);
    setIsParsing(false);
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const close = () => {
    reset();
    onOpenChange(false);
  };

  const handleFile = async (file: File) => {
    setIsParsing(true);
    try {
      const parsedTeams = isPoolMode ? await parsePoolTeamsExcelFile(file) : await parseTeamsExcelFile(file);
      setTeams(parsedTeams);
      setFileName(file.name);
      queue.add(
        {
          title: "Excel ready",
          description: `${parsedTeams.length} team${parsedTeams.length === 1 ? "" : "s"} found. Review and click Import.`,
          variant: "success",
        },
        { timeout: 3500 },
      );
    } catch (err) {
      setTeams([]);
      setFileName("");
      queue.add(
        {
          title: "Could not read Excel",
          description: err instanceof Error ? err.message : "Check the file and try again.",
          variant: "error",
        },
        { timeout: 6000 },
      );
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadTeamImportTemplate(mode);
      queue.add(
        {
          title: "Template downloaded",
          description: "Fill the Excel file and upload it here.",
          variant: "success",
        },
        { timeout: 3000 },
      );
    } catch (err) {
      queue.add(
        {
          title: "Could not download template",
          description: err instanceof Error ? err.message : "Please try again.",
          variant: "error",
        },
        { timeout: 5000 },
      );
    }
  };

  const importTeams = async () => {
    if (teams.length === 0) {
      queue.add(
        { title: "No teams ready", description: "Upload an Excel file before importing.", variant: "error" },
        { timeout: 4000 },
      );
      return;
    }

    setIsImporting(true);
    try {
      if (isPoolMode) {
        await (onImport as (items: AddPoolTeamInput[]) => void | Promise<void>)(teams as AddPoolTeamInput[]);
      } else {
        await (onImport as (items: Team[]) => void | Promise<void>)(teams as Team[]);
      }
      queue.add(
        {
          title: "Teams imported",
          description: `${teams.length} team${teams.length === 1 ? "" : "s"} added from Excel.`,
          variant: "success",
        },
        { timeout: 4000 },
      );
      close();
    } catch (err) {
      queue.add(
        {
          title: "Could not import teams",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "error",
        },
        { timeout: 6000 },
      );
    } finally {
      setIsImporting(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (!event.ctrlKey || event.key !== "Enter") return;
      event.preventDefault();
      if (isImporting || isParsing) return;
      void importTeams();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, teams.length, isImporting, isParsing]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())}>
      <DialogContent
        overlayClassName="z-[100]"
        className="z-[110] flex w-[calc(100vw-48px)] max-w-[980px] flex-col gap-0 overflow-hidden rounded-[16px] border border-[#e2e5ec] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.12)]"
      >
        <DialogTitle className="sr-only">Import from Excel</DialogTitle>

        <div className="flex items-center justify-between border-b border-[#f0f1f3] px-6 py-4">
          <h2 className="text-[18px] font-semibold text-[#000000]">Import from Excel</h2>
          <div className="mr-8 flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex h-[34px] cursor-pointer items-center gap-2 rounded-[7px] bg-transparent px-3 text-[13px] font-medium text-[#000000] hover:bg-[#f0f1f3]"
            >
              <Download className="h-4 w-4" />
              Download Template
            </button>
          </div>
        </div>

        <div className="flex h-[420px] min-h-0 flex-col bg-white px-6 pb-6 pt-4">
          {teams.length === 0 ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex min-h-0 flex-1 cursor-pointer flex-col items-center justify-center rounded-[10px] border border-dashed px-8 text-center transition-colors ${
                isDragging ? "border-[#000000] bg-[#f0f1f3]" : "border-[#c8cdd5] bg-[#f9fbfc] hover:border-[#000000] hover:bg-[#f7f8fb]"
              }`}
            >
              <Import className="h-9 w-9 stroke-[1.75] text-[#4b5563]" />
              <p className="mt-4 text-[16px] font-semibold text-[#000000]">
                {isParsing ? "Reading your file..." : "Drag and drop your file here"}
              </p>
              <p className="mt-1 text-[13px] text-[#9aa1b0]">or click to browse - Supports .xlsx, .xls, .csv</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleFile(file);
                }}
                className="hidden"
              />
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[16px] font-semibold text-[#000000]">
                    {teams.length} team{teams.length === 1 ? "" : "s"} ready
                  </p>
                  <p className="mt-0.5 text-[13px] text-[#9aa1b0]">{fileName || "No file selected"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-[34px] cursor-pointer items-center gap-2 rounded-[7px] border border-[#e2e5ec] bg-white px-3 text-[12px] font-medium text-[#4b5563] hover:bg-[#f7f8fb] hover:text-[#000000]"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Replace file
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="flex h-[34px] cursor-pointer items-center gap-2 rounded-[7px] border border-[#e2e5ec] bg-white px-3 text-[12px] font-medium text-[#4b5563] hover:bg-[#f7f8fb] hover:text-[#000000]"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden rounded-[10px] border border-[#e2e5ec] bg-white">
                <div className="h-full overflow-auto">
                  <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
                    <thead className="sticky top-0 z-10 border-b border-[#e2e5ec] bg-[#f7f8fb]">
                      <tr>
                        {isPoolMode ? null : <th className="w-[80px] px-4 py-3 font-medium text-[#4b5563]">Slot</th>}
                        <th className="w-[200px] px-4 py-3 font-medium text-[#4b5563]">Team Name</th>
                        <th className="w-[140px] px-4 py-3 font-medium text-[#4b5563]">Tags</th>
                        <th className="w-[160px] px-4 py-3 font-medium text-[#4b5563]">Mobile Number</th>
                        {isPoolMode ? null : (
                          <>
                            <th className="px-4 py-3 font-medium text-[#4b5563]">Players</th>
                            <th className="w-[110px] px-4 py-3 font-medium text-[#4b5563]">Save DB</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f1f3]">
                      {teams.map((team, index) => (
                        <tr key={isEventTeam(team) ? team.id : `${team.name}-${index}`} className="hover:bg-[#fcfdfd]">
                          {isPoolMode ? null : (
                            <td className="px-4 py-3 font-semibold text-[#000000]">
                              {isEventTeam(team) ? team.slotNumber || index + 1 : index + 1}
                            </td>
                          )}
                          <td className="px-4 py-3 font-semibold text-[#000000]">{team.name}</td>
                          <td className="px-4 py-3 text-[#666666]">{team.tags.length ? team.tags.join(", ") : "-"}</td>
                          <td className="px-4 py-3 text-[#666666]">
                            {"contactMobile" in team && team.contactMobile ? team.contactMobile : "-"}
                          </td>
                          {isPoolMode ? null : (
                            <>
                              <td className="px-4 py-3 text-[#666666]">
                                {isEventTeam(team) && team.players.length ? team.players.join(", ") : "-"}
                              </td>
                              <td className="px-4 py-3 text-[#666666]">{isEventTeam(team) && team.addToDatabase ? "Yes" : "No"}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleFile(file);
                }}
                className="hidden"
              />
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#f0f1f3] bg-white px-6 py-4">
          <button
            type="button"
            onClick={close}
            className="h-[38px] cursor-pointer rounded-[8px] border border-[#e2e5ec] bg-white px-4 text-[13px] font-medium text-[#666666] hover:bg-[#f7f8fb]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void importTeams()}
            disabled={isImporting}
            className="flex h-[38px] cursor-pointer items-center gap-2 rounded-[8px] !bg-[#000000] px-5 text-[13px] font-medium !text-white hover:!bg-[#333333] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Import className="h-4 w-4" />
            {isImporting ? "Importing..." : "Import"}
            <div className="flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">
              Ctrl + <CornerDownLeft className="h-3 w-3" />
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
