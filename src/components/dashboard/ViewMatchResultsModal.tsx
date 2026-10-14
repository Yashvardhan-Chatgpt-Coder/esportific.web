"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, ThemedConfirmDialog } from "@/components/ui/dialog";
import { FileDown, FileSpreadsheet, Import, Image as ImageIcon, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import type { ResultEntry, TeamData } from "@/components/dashboard/AddResultModal";
import { AddResultModal } from "@/components/dashboard/AddResultModal";
import { BulkAddResultsModal } from "@/components/dashboard/BulkAddResultsModal";
import { MatchResultsExcelImportModal } from "@/components/dashboard/MatchResultsExcelImportModal";
import {
  exportMatchResultsToExcel,
  exportMatchResultsToImage,
} from "@/lib/match-results-export";
import {
  buildMatchResultRows,
  DEFAULT_MATCH_SCORING,
  type EventScoringRules,
} from "@/lib/match-scoring";
import { duplicatePlacementMessage, findDuplicatePlacement } from "@/lib/match-result-validation";
import { queue } from "@/components/ui/Toast";
import { beginExportProgress } from "@/lib/export-progress";
import { AnimatePresence, motion } from "framer-motion";

export const VIEW_MATCH_RESULTS_CLOSE_MS = 300;

type MatchView = {
  id: number | string;
  name: string;
  map: string;
  status: "Pending Results" | "Completed";
  results: ResultEntry[];
};

type ViewMatchResultsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: MatchView | null;
  teams: TeamData[];
  scoring?: EventScoringRules;
  organizerName?: string;
  eventName?: string;
  onExport?: (format: "excel" | "image", match: MatchView) => void | Promise<void>;
  onTemplateImageExport?: (match: MatchView, results: ResultEntry[]) => void;
  onQuickExportImage?: (match: MatchView) => void | Promise<void>;
  onSaveResults?: (match: MatchView, results: ResultEntry[], context: ResultEditContext) => void | Promise<void>;
};

export type ResultEditContext =
  | { type: "team-edited"; previous: ResultEntry; next: ResultEntry }
  | { type: "result-deleted"; previous: ResultEntry }
  | { type: "result-added"; result: ResultEntry }
  | { type: "results-bulk-added"; results: ResultEntry[] }
  | { type: "batch"; changes: Exclude<ResultEditContext, { type: "batch" }>[] };

export function ViewMatchResultsModal({
  open,
  onOpenChange,
  match,
  teams,
  scoring = DEFAULT_MATCH_SCORING,
  organizerName,
  eventName,
  onExport,
  onTemplateImageExport,
  onQuickExportImage,
  onSaveResults,
}: ViewMatchResultsModalProps) {
  const matchRef = useRef<MatchView | null>(null);
  const tableCaptureRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<"excel" | "image" | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [isAddResultOpen, setIsAddResultOpen] = useState(false);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [editingResult, setEditingResult] = useState<ResultEntry | null>(null);
  const [deletingResult, setDeletingResult] = useState<ResultEntry | null>(null);
  const [localResults, setLocalResults] = useState<ResultEntry[]>([]);
  const [pendingChanges, setPendingChanges] = useState<Exclude<ResultEditContext, { type: "batch" }>[]>([]);
  const [savingEdits, setSavingEdits] = useState(false);

  if (match) {
    matchRef.current = match;
  }

  const viewMatch = match ?? matchRef.current;

  useEffect(() => {
    if (open) return;
    const timer = window.setTimeout(() => {
      matchRef.current = null;
      setEditMode(false);
      setLocalResults([]);
      setEditingResult(null);
      setPendingChanges([]);
      setSavingEdits(false);
    }, VIEW_MATCH_RESULTS_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!viewMatch || !open) return;
    setLocalResults(viewMatch.results);
    setPendingChanges([]);
  }, [viewMatch?.id, viewMatch?.results, open]);

  if (!viewMatch) return null;

  const visibleResults = localResults;
  const resultRows = buildMatchResultRows(visibleResults, teams, scoring);

  const stageResults = (results: ResultEntry[], context: Exclude<ResultEditContext, { type: "batch" }>) => {
    setLocalResults(results);
    setPendingChanges((current) => [...current, context]);
  };

  const handleAddResult = (result: ResultEntry) => {
    stageResults([...visibleResults, result], { type: "result-added", result });
  };

  const handleBulkAddResults = (results: ResultEntry[]) => {
    stageResults([...visibleResults, ...results], { type: "results-bulk-added", results });
  };

  const handleEditResult = (next: ResultEntry) => {
    if (!editingResult) return;
    const updated = visibleResults.map((result) => (result.id === editingResult.id ? next : result));
    stageResults(updated, { type: "team-edited", previous: editingResult, next });
    setEditingResult(null);
  };

  const confirmDeleteResult = () => {
    if (!deletingResult) return;
    stageResults(
      visibleResults.filter((result) => result.id !== deletingResult.id),
      { type: "result-deleted", previous: deletingResult },
    );
    setDeletingResult(null);
  };

  const getRawResult = (teamId: string) => visibleResults.find((result) => result.teamId === teamId);

  const exitEditModeWithoutSave = () => {
    setEditMode(false);
    setLocalResults(viewMatch.results);
    setPendingChanges([]);
    setEditingResult(null);
  };

  const saveEditedResults = async () => {
    if (pendingChanges.length === 0) {
      setEditMode(false);
      queue.add(
        {
          title: "No changes to save",
          description: "Edit mode has been closed.",
          variant: "normal",
        },
        { timeout: 3000 },
      );
      return;
    }

    const duplicatePlacement = findDuplicatePlacement(visibleResults, teams);
    if (duplicatePlacement) {
      queue.add(
        {
          title: "Duplicate placement",
          description: duplicatePlacementMessage(duplicatePlacement),
          variant: "error",
        },
        { timeout: 6000 },
      );
      return;
    }

    setSavingEdits(true);
    try {
      await onSaveResults?.(viewMatch, visibleResults, { type: "batch", changes: pendingChanges });
      setPendingChanges([]);
      setEditMode(false);
      queue.add(
        {
          title: "Results saved",
          description: `${viewMatch.name} results have been updated.`,
          variant: "success",
        },
        { timeout: 4000 },
      );
    } catch {
      queue.add(
        {
          title: "Could not save results",
          description: "Please try again.",
          variant: "error",
        },
        { timeout: 5000 },
      );
    } finally {
      setSavingEdits(false);
    }
  };

  const runExport = async (format: "excel" | "image") => {
    if (visibleResults.length === 0) {
      queue.add(
        {
          title: "Nothing to export",
          description: "This match has no results to export yet.",
          variant: "error",
        },
        { timeout: 5000 },
      );
      return;
    }

    setExporting(format);
    if (format === "image" && onTemplateImageExport) {
      try { onTemplateImageExport(viewMatch, visibleResults); }
      finally { setExporting(null); }
      return;
    }
    const progress = await beginExportProgress();
    try {
      if (format === "excel") {
        await exportMatchResultsToExcel(viewMatch, visibleResults, teams, scoring, organizerName, eventName, progress.update);
        progress.complete();
        queue.add(
          {
            title: "Excel export ready",
            description: `${viewMatch.name} results have been downloaded.`,
            variant: "success",
          },
          { timeout: 5000 },
        );
        await onExport?.("excel", viewMatch);
      } else {
        const target = tableCaptureRef.current;
        if (!target) throw new Error("Table not ready");
        await exportMatchResultsToImage(target, viewMatch, progress.update);
        progress.complete();
        queue.add(
          {
            title: "Image export ready",
            description: `${viewMatch.name} results have been downloaded as PNG.`,
            variant: "success",
          },
          { timeout: 5000 },
        );
        await onExport?.("image", viewMatch);
      }
    } catch {
      progress.dismiss();
      queue.add(
        {
          title: "Export failed",
          description: "Could not export results. Please try again.",
          variant: "error",
        },
        { timeout: 5000 },
      );
    } finally {
      setExporting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        overlayClassName="data-[state=closed]:duration-300 data-[state=open]:duration-300"
        className="flex h-[88vh] w-[94vw] max-w-[1280px] flex-col gap-0 overflow-hidden rounded-[16px] border border-[#e2e5ec] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.15)] data-[state=closed]:duration-300 data-[state=open]:duration-300 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
      >
        <DialogTitle className="sr-only">{viewMatch.name} — match results</DialogTitle>

        <div className="flex shrink-0 items-start justify-between gap-6 border-b border-[#f0f1f3] px-8 py-6">
          <div className="min-w-0">
            <h2 className="text-[22px] font-semibold text-[#000000]">{viewMatch.name} — Results</h2>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[14px]">
              <span className="text-[#666666]">
                Map: <span className="font-medium text-[#000000]">{viewMatch.map}</span>
              </span>
              <span className="inline-flex rounded-full bg-[#e2f5ec] px-2.5 py-0.5 text-[11px] font-medium text-[#059669]">
                Completed
              </span>
              <span className="text-[#9aa1b0]">
                {resultRows.length} team{resultRows.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (editMode) {
                  exitEditModeWithoutSave();
                } else {
                  setEditMode(true);
                }
              }}
              className={`flex h-[36px] cursor-pointer items-center gap-2 rounded-[8px] px-4 text-[13px] font-medium transition-colors ${
                editMode
                  ? "bg-[#000000] text-white hover:bg-[#333]"
                  : "border border-[#e2e5ec] bg-white text-[#000000] hover:bg-[#f7f8fb]"
              }`}
            >
              <Pencil className="h-4 w-4" />
              Edit Results
            </button>
            <button
              type="button"
              disabled={exporting !== null}
              onClick={() => void runExport("excel")}
              className="flex h-[36px] cursor-pointer items-center gap-2 rounded-[8px] border border-[#e2e5ec] bg-white px-4 text-[13px] font-medium text-[#000000] transition-colors hover:bg-[#f7f8fb] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {exporting === "excel" ? "Exporting…" : "Export Excel"}
            </button>
            <button
              type="button"
              disabled={exporting !== null}
              onClick={() => void runExport("image")}
              className="flex h-[36px] cursor-pointer items-center gap-2 rounded-[8px] border border-[#e2e5ec] bg-white px-4 text-[13px] font-medium text-[#000000] transition-colors hover:bg-[#f7f8fb] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ImageIcon className="h-4 w-4" />
              {exporting === "image" ? "Exporting…" : "Export Image"}
            </button>
            {onQuickExportImage && (
              <button
                type="button"
                disabled={exporting !== null}
                onClick={async () => {
                  setExporting("image");
                  try {
                    await onQuickExportImage(viewMatch);
                  } finally {
                    setExporting(null);
                  }
                }}
                className="flex h-[36px] cursor-pointer items-center gap-2 rounded-[8px] border border-[#e2e5ec] bg-white px-4 text-[13px] font-medium text-[#000000] transition-colors hover:bg-[#f7f8fb] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FileDown className="h-4 w-4" />
                Quick Export
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="grid h-[36px] w-[36px] cursor-pointer place-items-center rounded-[8px] text-[#9aa1b0] transition-colors hover:bg-[#f7f8fb] hover:text-[#000000]"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
          <AnimatePresence initial={false}>
            {editMode ? (
              <motion.div
                initial={{ height: 0, opacity: 0, y: -8 }}
                animate={{ height: "auto", opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="mb-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddResultOpen(true)}
                    className="flex h-[36px] cursor-pointer items-center gap-2 rounded-[6px] bg-[#000000] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#333]"
                  >
                    <Plus className="h-4 w-4" />
                    Add result
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsBulkAddOpen(true)}
                    className="flex h-[36px] cursor-pointer items-center gap-2 rounded-[6px] border border-[#e2e5ec] bg-white px-4 text-[13px] font-medium text-[#000000] transition-colors hover:bg-[#f7f8fb]"
                  >
                    <Users className="h-4 w-4" />
                    Bulk add
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsExcelImportOpen(true)}
                    className="flex h-[36px] cursor-pointer items-center gap-2 rounded-[6px] border border-[#e2e5ec] bg-white px-4 text-[13px] font-medium text-[#000000] transition-colors hover:bg-[#f7f8fb]"
                  >
                    <Import className="h-4 w-4" />
                    Import excel
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div
            ref={tableCaptureRef}
            className="overflow-hidden rounded-[10px] border border-[#e2e5ec] bg-white"
          >
            <div className="border-b border-[#f0f1f3] bg-[#f9fbfc] px-5 py-3">
              <p className="text-[13px] font-semibold text-[#000000]">{viewMatch.name}</p>
              <p className="text-[12px] text-[#9aa1b0]">{viewMatch.map} · Match results</p>
            </div>
            <table className="w-full table-fixed text-left text-[13px]">
              <colgroup>
                {editMode ? <col className="w-[92px]" /> : null}
                <col className="w-[72px]" />
                <col />
                <col className="w-[108px]" />
                <col className="w-[148px]" />
                <col className="w-[108px]" />
                <col className="w-[116px]" />
              </colgroup>
              <thead className="sticky top-0 z-10 border-b border-[#e2e5ec] bg-[#f9fbfc]">
                <tr>
                  {editMode ? <th className="px-5 py-3"></th> : null}
                  <th className="whitespace-nowrap px-5 py-3 font-medium text-[#666666]">Rank</th>
                  <th className="whitespace-nowrap px-5 py-3 font-medium text-[#666666]">
                    Team name
                  </th>
                  <th className="whitespace-nowrap px-5 py-3 text-right font-medium text-[#666666]">
                    Position
                  </th>
                  <th className="whitespace-nowrap px-5 py-3 text-right font-medium text-[#666666]">
                    Placement points
                  </th>
                  <th className="whitespace-nowrap px-5 py-3 text-right font-medium text-[#666666]">
                    Kill points
                  </th>
                  <th className="whitespace-nowrap px-5 py-3 text-right font-medium text-[#666666]">
                    Total points
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f1f3]">
                {resultRows.length === 0 ? (
                  <tr>
                    <td colSpan={editMode ? 7 : 6} className="px-5 py-16 text-center text-[#9aa1b0]">
                      No results recorded for this match.
                    </td>
                  </tr>
                ) : (
                  resultRows.map((row) => (
                    <tr key={row.teamId} className="hover:bg-[#fcfdfd]">
                      {editMode ? (
                        <td className="px-3 py-3.5 align-middle">
                          <AnimatePresence>
                            <motion.div
                              initial={{ opacity: 0, scale: 0.94 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.94 }}
                              transition={{ duration: 0.16, ease: "easeOut" }}
                              className="flex items-center gap-1.5"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  const result = getRawResult(row.teamId);
                                  if (result) setEditingResult(result);
                                }}
                                className="grid h-8 w-8 cursor-pointer place-items-center rounded-[7px] border border-[#e2e5ec] bg-white text-[#4b5563] transition-colors hover:bg-[#f0f1f3] hover:text-[#000000]"
                                aria-label={`Edit ${row.teamName} result`}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const result = getRawResult(row.teamId);
                                  if (result) setDeletingResult(result);
                                }}
                                className="grid h-8 w-8 cursor-pointer place-items-center rounded-[7px] border border-[#fee2e2] bg-white text-[#dc2626] transition-colors hover:bg-[#fef2f2]"
                                aria-label={`Delete ${row.teamName} result`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </motion.div>
                          </AnimatePresence>
                        </td>
                      ) : null}
                      <td className="px-5 py-3.5 align-middle">
                        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[#000000] px-2 text-[12px] font-semibold text-white">
                          {row.rank}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 align-middle">
                        <p className="text-[14px] font-semibold text-[#000000]">{row.teamName}</p>
                      </td>
                      <td className="px-5 py-3.5 align-middle">
                        <div className="flex justify-end">
                          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#f0f1f3] px-2 text-[12px] font-semibold text-[#4b5563]">
                            #{typeof row.position === "number" ? row.position : "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right align-middle text-[#4b5563]">
                        {row.placementPoints}
                      </td>
                      <td className="px-5 py-3.5 text-right align-middle text-[#4b5563]">
                        {row.killPoints}
                      </td>
                      <td className="px-5 py-3.5 text-right align-middle text-[15px] font-semibold text-[#000000]">
                        {row.totalPoints}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {editMode ? (
            <motion.div
              initial={{ height: 0, opacity: 0, y: 10 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="shrink-0 overflow-hidden border-t border-[#f0f1f3] bg-white"
            >
              <div className="flex items-center justify-between gap-4 px-8 py-4">
                <p className="text-[13px] text-[#666666]">
                  {pendingChanges.length > 0
                    ? `${pendingChanges.length} unsaved change${pendingChanges.length === 1 ? "" : "s"}`
                    : "Edit mode is active"}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={exitEditModeWithoutSave}
                    disabled={savingEdits}
                    className="h-[38px] cursor-pointer rounded-[8px] border border-[#e2e5ec] bg-white px-4 text-[13px] font-medium text-[#666666] transition-colors hover:bg-[#f7f8fb] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveEditedResults()}
                    disabled={savingEdits}
                    className="h-[38px] cursor-pointer rounded-[8px] bg-[#000000] px-5 text-[13px] font-medium text-white transition-colors hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingEdits ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AddResultModal
          open={isAddResultOpen}
          onClose={() => setIsAddResultOpen(false)}
          onAdd={handleAddResult}
          teams={teams}
          existingResults={visibleResults}
        />

        <AddResultModal
          open={Boolean(editingResult)}
          onClose={() => setEditingResult(null)}
          onAdd={handleEditResult}
          teams={teams}
          existingResults={visibleResults}
          initialResult={editingResult}
          mode="edit"
        />

        <BulkAddResultsModal
          open={isBulkAddOpen}
          onOpenChange={setIsBulkAddOpen}
          onAddResults={handleBulkAddResults}
          teams={teams}
          existingResults={visibleResults}
        />

        <MatchResultsExcelImportModal
          open={isExcelImportOpen}
          onOpenChange={setIsExcelImportOpen}
          matchName={viewMatch.name}
          teams={teams}
          existingResults={visibleResults}
          onImport={handleBulkAddResults}
        />

        <ThemedConfirmDialog
          open={deletingResult !== null}
          onOpenChange={(nextOpen) => { if (!nextOpen) setDeletingResult(null); }}
          title="Delete team result?"
          description={<>The result for <span className="font-semibold text-[#000000]">{teams.find((team) => team.id === deletingResult?.teamId)?.name || "this team"}</span> will be removed when you save your changes.</>}
          cancelLabel="Cancel"
          confirmLabel="Delete"
          onConfirm={confirmDeleteResult}
        />
      </DialogContent>
    </Dialog>
  );
}
