"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Import, Users } from "lucide-react";
import { AddResultModal, type TeamData, type ResultEntry } from "./AddResultModal";
import { BulkAddResultsModal } from "./BulkAddResultsModal";
import { MatchResultsExcelImportModal } from "./MatchResultsExcelImportModal";
import { duplicatePlacementMessage, findDuplicatePlacement } from "@/lib/match-result-validation";
import { queue } from "@/components/ui/Toast";

interface MatchItem {
  id: string;
  name: string;
  map: string;
  status: "Pending Results" | "Completed";
  results: ResultEntry[];
}

export function MatchResultsModal({
  open,
  onClose,
  match,
  teams,
  onUpdateResults,
  onMarkCompleted,
}: {
  open: boolean;
  onClose: () => void;
  match: MatchItem | null;
  teams: TeamData[];
  onUpdateResults: (matchId: string, results: ResultEntry[]) => void;
  onMarkCompleted: (matchId: string) => void | Promise<void>;
}) {
  const [isAddResultOpen, setIsAddResultOpen] = useState(false);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [localResults, setLocalResults] = useState<ResultEntry[]>([]);
  const [visibleMatch, setVisibleMatch] = useState<MatchItem | null>(null);
  const [showExitPrompt, setShowExitPrompt] = useState(false);
  const initialResultsRef = useRef<ResultEntry[]>([]);

  useEffect(() => {
    if (match) {
      setVisibleMatch(match);
      setLocalResults(match.results);
      initialResultsRef.current = match.results;
      setShowExitPrompt(false);
    }
  }, [match, open]);

  const activeMatch = match ?? visibleMatch;

  const hasUnsavedChanges =
    Boolean(activeMatch) && JSON.stringify(localResults) !== JSON.stringify(initialResultsRef.current);

  const forceClose = () => {
    setShowExitPrompt(false);
    onClose();
  };

  const requestClose = () => {
    if (isAddResultOpen || isBulkAddOpen || isExcelImportOpen) return;
    if (hasUnsavedChanges) {
      setShowExitPrompt(true);
      return;
    }
    forceClose();
  };

  const handleAddResult = (newResult: ResultEntry) => {
    if (!activeMatch) return;
    const updated = [...localResults, newResult];
    setLocalResults(updated);
    onUpdateResults(activeMatch.id, updated);
  };

  const handleBulkAddResults = (newResults: ResultEntry[]) => {
    if (!activeMatch) return;
    const updated = [...localResults, ...newResults];
    setLocalResults(updated);
    onUpdateResults(activeMatch.id, updated);
  };

  const handleDeleteResult = (resultId: string) => {
    if (!activeMatch) return;
    const updated = localResults.filter((r) => r.id !== resultId);
    setLocalResults(updated);
    onUpdateResults(activeMatch.id, updated);
  };

  const handleSave = async () => {
    if (!activeMatch) return;
    const duplicatePlacement = findDuplicatePlacement(localResults, teams);
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

    await onMarkCompleted(activeMatch.id);
    forceClose();
  };

  const handleImportExcel = () => {
    setIsExcelImportOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (showExitPrompt) return;
      if (isAddResultOpen || isBulkAddOpen || isExcelImportOpen) return;
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;
      if (isTyping) return;

      const key = event.key.toLowerCase();
      if (!["n", "b", "i"].includes(key)) return;

      event.preventDefault();
      if (key === "n") setIsAddResultOpen(true);
      if (key === "b") setIsBulkAddOpen(true);
      if (key === "i") handleImportExcel();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, isAddResultOpen, isBulkAddOpen, isExcelImportOpen, showExitPrompt]);

  if (!activeMatch) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && requestClose()}>
      <DialogContent
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          requestClose();
        }}
        onInteractOutside={(event) => {
          event.preventDefault();
          requestClose();
        }}
        className="flex h-[80vh] w-[85vw] max-w-[1200px] flex-col gap-0 overflow-hidden rounded-[16px] border border-[#e2e5ec] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.15)] z-[55]"
      >
        <DialogTitle className="sr-only">Match Results</DialogTitle>

        <AnimatePresence>
          {showExitPrompt && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center rounded-[16px] bg-white/90 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="flex flex-col items-center gap-4 text-center"
              >
                <p className="text-[16px] font-medium text-[#000000]">Discard results?</p>
                <p className="text-[14px] text-[#9aa1b0]">Unsaved result changes will be lost.</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowExitPrompt(false)}
                    className="h-[38px] cursor-pointer rounded-[8px] border border-[#e2e5ec] bg-white px-5 text-[14px] font-medium text-[#666666] transition-colors hover:bg-[#f7f8fb]"
                  >
                    Keep editing
                  </button>
                  <button
                    type="button"
                    onClick={forceClose}
                    className="h-[38px] cursor-pointer rounded-[8px] bg-[#dc2626] px-5 text-[14px] font-medium text-white transition-colors hover:bg-[#b91c1c]"
                  >
                    Discard
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="border-b border-[#f0f1f3] px-8 pb-5 pt-7">
          <h2 className="text-[20px] font-semibold text-[#000000]">
            {activeMatch.name} — Enter Results
          </h2>
          <p className="mt-1 text-[14px] text-[#9aa1b0]">
            Manage team positions and player kills for this match.
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col">
          {/* Action buttons */}
          <div className="flex items-center gap-3 mb-6">
            <button
              type="button"
              onClick={() => setIsAddResultOpen(true)}
              className="flex h-[36px] cursor-pointer items-center gap-2 rounded-[6px] bg-[#000000] px-4 text-[13px] font-medium text-white transition-all hover:bg-[#333]"
            >
              <Plus className="h-4 w-4" /> Add result
            </button>
            <button
              type="button"
              onClick={() => setIsBulkAddOpen(true)}
              className="flex h-[36px] cursor-pointer items-center gap-2 rounded-[6px] border border-[#e2e5ec] bg-white px-4 text-[13px] font-medium text-[#000000] transition-all hover:bg-[#f7f8fb]"
            >
              <Users className="h-4 w-4" /> Bulk add
            </button>
            <button
              type="button"
              onClick={handleImportExcel}
              className="flex h-[36px] cursor-pointer items-center gap-2 rounded-[6px] border border-[#e2e5ec] bg-white px-4 text-[13px] font-medium text-[#000000] transition-all hover:bg-[#f7f8fb]"
            >
              <Import className="h-4 w-4" /> Import excel
            </button>
          </div>

          {/* Results table */}
          <div className="flex-1 rounded-[10px] border border-[#e2e5ec] bg-white overflow-hidden">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#f9fbfc] border-b border-[#e2e5ec]">
                <tr>
                  <th className="px-5 py-3 font-medium text-[#666666] w-[250px]">Team</th>
                  <th className="px-5 py-3 font-medium text-[#666666] w-[100px]">Position</th>
                  <th className="px-5 py-3 font-medium text-[#666666] w-[120px]">Total Kills</th>
                  <th className="px-5 py-3 font-medium text-[#666666]">Player Wise Kills</th>
                  <th className="px-5 py-3 font-medium text-[#666666] w-[60px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f1f3]">
                {localResults.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-[#9aa1b0]">
                      No results added yet. Click "Add result" to begin.
                    </td>
                  </tr>
                ) : (
                  localResults
                    .sort((a, b) => {
                      const pa = typeof a.position === "number" ? a.position : 999;
                      const pb = typeof b.position === "number" ? b.position : 999;
                      return pa - pb;
                    })
                    .map((row) => {
                      const team = teams.find((t) => t.id === row.teamId);
                      return (
                        <tr key={row.id} className="hover:bg-[#fcfdfd] group">
                          <td className="px-5 py-3 align-top">
                            <p className="text-[14px] font-medium text-[#000000]">
                              {team?.name ?? "Unknown team"}
                            </p>
                          </td>
                          <td className="px-5 py-3 align-top">
                            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#f0f1f3] px-2 text-[12px] font-semibold text-[#4b5563]">
                              #{typeof row.position === "number" ? row.position : "-"}
                            </span>
                          </td>
                          <td className="px-5 py-3 align-top font-medium text-[#000000]">
                            {row.totalKills === "" ? "-" : row.totalKills}
                          </td>
                          <td className="px-5 py-3 align-top">
                            {team ? (
                              <div className="flex flex-wrap gap-2">
                                {team.players.map((player) => (
                                  <span
                                    key={player.id}
                                    className="rounded-full bg-[#f0f1f3] px-2.5 py-1 text-[12px] text-[#4b5563]"
                                  >
                                    {player.name}: {row.playerKills[player.id] || 0}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[12px] text-[#9aa1b0]">-</span>
                            )}
                          </td>
                          <td className="px-5 py-3 align-top text-right">
                            <button
                              onClick={() => handleDeleteResult(row.id)}
                              className="cursor-pointer rounded p-1.5 text-[#9aa1b0] hover:bg-[#fee2e2] hover:text-[#ef4444] opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-[#f0f1f3] px-8 py-4 gap-3 bg-[#f9fbfc]">
          <button
            onClick={requestClose}
            className="h-[36px] cursor-pointer rounded-[6px] border border-[#e2e5ec] bg-white px-5 text-[13px] font-medium text-[#666666] hover:bg-[#f7f8fb] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="h-[36px] cursor-pointer rounded-[6px] bg-[#000000] px-5 text-[13px] font-medium text-white hover:bg-[#333] transition-colors"
          >
            Save Results
          </button>
        </div>

        {/* Add Result sub-modal */}
        <AddResultModal
          open={isAddResultOpen}
          onClose={() => setIsAddResultOpen(false)}
          onAdd={handleAddResult}
          teams={teams}
          existingResults={localResults}
        />

        <BulkAddResultsModal
          open={isBulkAddOpen}
          onOpenChange={setIsBulkAddOpen}
          onAddResults={handleBulkAddResults}
          teams={teams}
          existingResults={localResults}
        />
        <MatchResultsExcelImportModal
          open={isExcelImportOpen}
          onOpenChange={setIsExcelImportOpen}
          matchName={activeMatch.name}
          teams={teams}
          existingResults={localResults}
          onImport={handleBulkAddResults}
        />
      </DialogContent>
    </Dialog>
  );
}
