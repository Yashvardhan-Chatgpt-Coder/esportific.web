"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Import, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, ThemedConfirmDialog } from "@/components/ui/dialog";
import { queue } from "@/components/ui/Toast";
import { downloadMatchResultsImportTemplate, parseMatchResultsExcelFile, type MatchResultsImportPreview } from "@/lib/match-results-excel-import";
import { duplicatePlacementMessage, findDuplicatePlacement } from "@/lib/match-result-validation";
import type { ResultEntry, TeamData } from "./AddResultModal";

export function MatchResultsExcelImportModal({
  open,
  onOpenChange,
  matchName,
  teams,
  existingResults,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchName: string;
  teams: TeamData[];
  existingResults: ResultEntry[];
  onImport: (results: ResultEntry[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<MatchResultsImportPreview | null>(null);
  const [fileName, setFileName] = useState("");
  const [isReading, setIsReading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [confirmMismatch, setConfirmMismatch] = useState(false);

  const reset = () => {
    setPreview(null);
    setFileName("");
    setConfirmMismatch(false);
    if (inputRef.current) inputRef.current.value = "";
  };
  const close = () => {
    if (isImporting) return;
    reset();
    onOpenChange(false);
  };
  const handleFile = async (file?: File) => {
    if (!file) return;
    setIsReading(true);
    try {
      const parsed = await parseMatchResultsExcelFile(file, teams, existingResults);
      const duplicate = findDuplicatePlacement([...existingResults, ...parsed.results], teams);
      if (duplicate) throw new Error(duplicatePlacementMessage(duplicate));
      setPreview(parsed);
      setFileName(file.name);
    } catch (error) {
      setPreview(null);
      setFileName("");
      queue.add({ title: "Could not read results", description: error instanceof Error ? error.message : "Check the workbook and try again.", variant: "error" }, { timeout: 6000 });
    } finally {
      setIsReading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };
  const importResults = async () => {
    if (!preview || isImporting) return;
    if (preview.mismatches.length && !confirmMismatch) {
      setConfirmMismatch(true);
      return;
    }
    setIsImporting(true);
    try {
      await onImport(preview.results);
      reset();
      onOpenChange(false);
    } finally {
      setIsImporting(false);
    }
  };

  const mismatchText = preview?.mismatches.map((item) => `${item.teamName}: entered ${item.entered}, player total ${item.playerTotal}`).join("; ");

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
        <DialogContent
          overlayClassName="z-[100]"
          className="z-[110] flex max-h-[min(82vh,820px)] w-[calc(100vw-32px)] max-w-[920px] flex-col gap-0 overflow-hidden rounded-[16px] border border-[#e2e5ec] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.14)]"
        >
          <DialogTitle className="sr-only">Import {matchName} results from Excel</DialogTitle>
          <div className="flex shrink-0 items-center justify-between border-b border-[#f0f1f3] px-6 py-4">
            <div>
              <h2 className="text-[18px] font-semibold text-[#000000]">Import Results from Excel</h2>
              <p className="mt-1 text-[13px] text-[#8a90a0]">{matchName} · review both sheets before importing</p>
            </div>
            <div className="flex items-center gap-2 pr-8">
              <button type="button" onClick={() => void downloadMatchResultsImportTemplate().catch((error) => queue.add({ title: "Template unavailable", description: error instanceof Error ? error.message : "Please try again.", variant: "error" }, { timeout: 5000 }))} className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[12px] font-medium text-[#30343b] hover:bg-[#f7f8fb]">
                <Download className="h-4 w-4" /> Download Template
              </button>
              <button type="button" onClick={close} aria-label="Close" className="absolute right-3 top-3 grid h-9 w-9 cursor-pointer place-items-center rounded-full text-[#8a90a0] hover:bg-[#f3f4f6] hover:text-[#111827]">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="min-h-[300px] flex-1 overflow-hidden px-6 py-5">
            {!preview ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => { event.preventDefault(); void handleFile(event.dataTransfer.files?.[0]); }}
                className="flex h-full min-h-[300px] w-full cursor-pointer flex-col items-center justify-center rounded-[12px] border border-dashed border-[#cbd0d8] bg-[#fafbfc] text-center transition-colors hover:border-[#111827] hover:bg-[#f7f8fb]"
              >
                <FileSpreadsheet className="h-9 w-9 text-[#5f6673]" />
                <span className="mt-4 text-[15px] font-semibold text-[#111827]">{isReading ? "Reading workbook…" : "Drop the match results workbook here"}</span>
                <span className="mt-1 text-[13px] text-[#8a90a0]">or click to browse · .xlsx or .xls</span>
              </button>
            ) : (
              <div className="flex h-full min-h-0 flex-col gap-3">
                <div className="flex shrink-0 items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#111827]">{preview.results.length} team results ready</p>
                    <p className="truncate text-[12px] text-[#8a90a0]">{fileName} · includes {preview.results.filter((result) => Object.keys(result.playerKills).length > 0).length} team player-kill breakdowns</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[7px] border border-[#e2e5ec] px-3 text-[12px] font-medium text-[#4b5563] hover:bg-[#f7f8fb]"><Upload className="h-3.5 w-3.5" />Replace</button>
                    <button type="button" onClick={reset} className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[7px] border border-[#e2e5ec] px-3 text-[12px] font-medium text-[#4b5563] hover:bg-[#f7f8fb]"><X className="h-3.5 w-3.5" />Clear</button>
                  </div>
                </div>
                {preview.mismatches.length > 0 && <div className="shrink-0 rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">{preview.mismatches.length} total-kills mismatch{preview.mismatches.length === 1 ? "" : "es"}. You’ll be asked to confirm before importing.</div>}
                <div className="min-h-0 flex-1 overflow-auto rounded-[10px] border border-[#e2e5ec]">
                  <table className="w-full min-w-[700px] border-collapse text-left text-[12px]">
                    <thead className="sticky top-0 z-10 bg-[#f7f8fb] text-[#626977]"><tr><th className="px-4 py-3 font-medium">Team</th><th className="px-4 py-3 font-medium">Position</th><th className="px-4 py-3 font-medium">Total Kills</th><th className="px-4 py-3 font-medium">Player kills</th><th className="px-4 py-3 font-medium">Check</th></tr></thead>
                    <tbody className="divide-y divide-[#eef0f4]">{preview.results.map((result) => {
                      const team = teams.find((item) => item.id === result.teamId);
                      const playerTotal = Object.values(result.playerKills).reduce<number>((sum, value) => sum + (typeof value === "number" ? value : 0), 0);
                      const mismatch = preview.mismatches.some((item) => item.teamName === team?.name);
                      return <tr key={result.id}><td className="px-4 py-3 font-medium text-[#111827]">{team?.name || "Unknown team"}</td><td className="px-4 py-3">{result.position || "—"}</td><td className="px-4 py-3">{result.totalKills}</td><td className="max-w-[320px] px-4 py-3 text-[#616875]">{team?.players.filter((player) => typeof result.playerKills[player.id] === "number").map((player) => `${player.name}: ${result.playerKills[player.id]}`).join(" · ") || "—"}</td><td className={`px-4 py-3 font-medium ${mismatch ? "text-amber-700" : "text-emerald-700"}`}>{mismatch ? `Mismatch (${playerTotal})` : "OK"}</td></tr>;
                    })}</tbody>
                  </table>
                </div>
              </div>
            )}
            <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(event) => void handleFile(event.target.files?.[0])} />
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#f0f1f3] bg-[#fbfcfd] px-6 py-4">
            <span className="text-[12px] text-[#8a90a0]">Player totals are used when Total Kills is blank.</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={close} className="h-9 cursor-pointer rounded-[8px] border border-[#e2e5ec] bg-white px-4 text-[13px] font-medium text-[#4b5563] hover:bg-[#f7f8fb]">Cancel</button>
              <button type="button" onClick={() => void importResults()} disabled={!preview || isReading || isImporting} className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[8px] bg-[#08090b] px-4 text-[13px] font-medium text-white hover:bg-[#2b2d31] disabled:cursor-not-allowed disabled:opacity-50"><Import className="h-4 w-4" />{isImporting ? "Importing…" : "Import Results"}</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ThemedConfirmDialog
        open={confirmMismatch}
        onOpenChange={setConfirmMismatch}
        title="Kill total mismatch"
        description={<>{mismatchText}. Import the entered Total Kills and player kills anyway?</>}
        cancelLabel="Review file"
        confirmLabel="Continue import"
        overlayClassName="z-[130]"
        contentClassName="z-[140]"
        onConfirm={() => { setConfirmMismatch(false); void importResults(); }}
      />
    </>
  );
}
