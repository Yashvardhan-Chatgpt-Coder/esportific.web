"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, ThemedConfirmDialog } from "@/components/ui/dialog";
import { CornerDownLeft, Trash2 } from "lucide-react";
import { type ResultEntry, type TeamData } from "./AddResultModal";
import { queue } from "@/components/ui/Toast";
import { duplicatePlacementMessage, findDuplicatePlacement } from "@/lib/match-result-validation";

type BulkResultRow = {
  id: string;
  teamId: string;
  position: number | "";
  totalKills: number | "";
  playerKills: Record<string, number | "">;
  manualTotalKills: boolean;
};

interface BulkAddResultsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: TeamData[];
  existingResults: ResultEntry[];
  onAddResults: (results: ResultEntry[]) => void;
}

export function BulkAddResultsModal({
  open,
  onOpenChange,
  teams,
  existingResults,
  onAddResults,
}: BulkAddResultsModalProps) {
  const availableTeams = teams.filter(
    (team) => !existingResults.some((result) => result.teamId === team.id),
  );

  const createRows = (): BulkResultRow[] =>
    availableTeams.map((team, index) => ({
      id: crypto.randomUUID(),
      teamId: team.id,
      position: index + 1,
      totalKills: "",
      playerKills: {},
      manualTotalKills: false,
    }));

  const [rows, setRows] = useState<BulkResultRow[]>(createRows);
  const [showKillMismatchWarning, setShowKillMismatchWarning] = useState(false);

  useEffect(() => {
    if (open) {
      setRows(createRows());
      setShowKillMismatchWarning(false);
    }
  }, [open, existingResults.length, teams.length]);

  const handleClose = () => {
    setShowKillMismatchWarning(false);
    onOpenChange(false);
  };

  const updateRow = (id: string, updates: Partial<BulkResultRow>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...updates } : row)));
  };

  const removeRow = (id: string) => {
    setShowKillMismatchWarning(false);
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const updatePlayerKill = (row: BulkResultRow, playerId: string, value: string) => {
    setShowKillMismatchWarning(false);
    const nextPlayerKills = { ...row.playerKills };
    if (value === "") {
      nextPlayerKills[playerId] = "";
    } else {
      const parsed = parseInt(value, 10);
      if (Number.isNaN(parsed) || parsed < 0) return;
      nextPlayerKills[playerId] = parsed;
    }

    const team = teams.find((item) => item.id === row.teamId);
    const playerKillTotal =
      team?.players.reduce((acc, player) => {
        const kills = nextPlayerKills[player.id];
        return acc + (typeof kills === "number" ? kills : 0);
      }, 0) ?? 0;

    updateRow(row.id, {
      playerKills: nextPlayerKills,
      totalKills: row.manualTotalKills ? row.totalKills : playerKillTotal || "",
    });
  };

  const updateTotalKills = (row: BulkResultRow, value: string) => {
    setShowKillMismatchWarning(false);
    if (value === "") {
      updateRow(row.id, { totalKills: "", manualTotalKills: true });
      return;
    }

    const parsed = parseInt(value, 10);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      updateRow(row.id, { totalKills: parsed, manualTotalKills: true });
    }
  };

  const updatePosition = (row: BulkResultRow, value: string) => {
    setShowKillMismatchWarning(false);
    if (value === "") {
      updateRow(row.id, { position: "" });
      return;
    }

    const parsed = parseInt(value, 10);
    if (!Number.isNaN(parsed) && parsed >= 1) {
      updateRow(row.id, { position: parsed });
    }
  };

  const getPlayerKillTotal = (row: BulkResultRow) => {
    const team = teams.find((item) => item.id === row.teamId);
    return (
      team?.players.reduce((acc, player) => {
        const kills = row.playerKills[player.id];
        return acc + (typeof kills === "number" ? kills : 0);
      }, 0) ?? 0
    );
  };

  const mismatchRows = rows.filter(
    (row) =>
      row.manualTotalKills && row.totalKills !== "" && row.totalKills !== getPlayerKillTotal(row),
  );
  const firstMismatch = mismatchRows[0];
  const firstMismatchTeam = firstMismatch
    ? teams.find((team) => team.id === firstMismatch.teamId)?.name
    : "";
  const firstMismatchPlayerTotal = firstMismatch ? getPlayerKillTotal(firstMismatch) : 0;

  const saveResults = () => {
    const results = rows
      .filter((row) => row.teamId)
      .map((row, index) => ({
        id: crypto.randomUUID(),
        teamId: row.teamId,
        position: row.position === "" ? index + 1 : row.position,
        totalKills: row.totalKills === "" ? 0 : row.totalKills,
        playerKills: row.playerKills,
      }));

    if (results.length === 0) {
      queue.add(
        {
          title: "Missing required fields",
          description: "Select at least one team before saving.",
          variant: "error",
        },
        { timeout: 5000 },
      );
      return;
    }

    const duplicatePlacement = findDuplicatePlacement([...existingResults, ...results], teams);
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

    onAddResults(results);
    setShowKillMismatchWarning(false);
    handleClose();
  };

  const handleSave = () => {
    if (mismatchRows.length > 0) {
      setShowKillMismatchWarning(true);
      return;
    }
    saveResults();
  };

  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        handleSave();
      } else {
        e.preventDefault();
      }
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(value) => (value ? onOpenChange(true) : handleClose())}>
        <DialogContent
          overlayClassName="z-[60]"
          className="z-[70] flex h-[80vh] w-[85vw] max-w-[1200px] flex-col gap-0 overflow-hidden rounded-[16px] border border-[#e2e5ec] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.12)]"
        >
          <DialogTitle className="sr-only">Bulk Add Results</DialogTitle>

          <div className="flex items-center justify-between border-b border-[#f0f1f3] px-8 py-5">
            <div>
              <h2 className="text-[18px] font-semibold text-[#000000]">Bulk Add Results</h2>
              <p className="mt-1 text-[13px] text-[#9aa1b0]">
                Enter positions and player kills for multiple teams at once.
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-[#f9fbfc] px-8 py-6">
            <form onKeyDown={handleFormKeyDown}>
              <div className="overflow-hidden rounded-[12px] border border-[#e2e5ec] bg-white">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#e2e5ec] bg-[#f7f8fb]">
                      <th className="w-[230px] px-4 py-3 text-[12px] font-medium text-[#4b5563]">
                        Team
                      </th>
                      <th className="w-[90px] px-4 py-3 text-[12px] font-medium text-[#4b5563]">
                        Position
                      </th>
                      <th className="w-[110px] px-4 py-3 text-[12px] font-medium text-[#4b5563]">
                        Total Kills
                      </th>
                      <th className="px-4 py-3 text-[12px] font-medium text-[#4b5563]">
                        Player Kills
                      </th>
                      <th className="w-[60px] px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f1f3]">
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-[13px] text-[#9aa1b0]">
                          All teams already have results for this match.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => {
                        const team = teams.find((item) => item.id === row.teamId);
                        return (
                          <tr key={row.id} className="transition-colors hover:bg-[#fcfdfd]">
                            <td className="px-4 py-3 align-top">
                              <p className="text-[13px] font-semibold text-[#000000]">
                                {team?.name ?? "Unknown team"}
                              </p>
                              <p className="mt-0.5 text-[11px] text-[#9aa1b0]">
                                {team?.players.length ?? 0} players
                              </p>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <input
                                type="number"
                                min="1"
                                value={row.position}
                                onChange={(e) => updatePosition(row, e.target.value)}
                                className="h-[36px] w-full rounded-[6px] border border-[#e2e5ec] bg-white px-3 text-[13px] text-[#000000] outline-none placeholder:text-[#c8cdd5] focus:border-[#000000]"
                              />
                            </td>
                            <td className="px-4 py-3 align-top">
                              <input
                                type="number"
                                min="0"
                                value={row.totalKills}
                                onChange={(e) => updateTotalKills(row, e.target.value)}
                                placeholder="Auto"
                                className="h-[36px] w-full rounded-[6px] border border-[#e2e5ec] bg-white px-3 text-[13px] text-[#000000] outline-none placeholder:text-[#c8cdd5] focus:border-[#000000]"
                              />
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="grid grid-cols-2 gap-2">
                                {team?.players.map((player) => (
                                  <label key={player.id} className="flex items-center gap-2">
                                    <span className="w-[86px] truncate text-[12px] font-medium text-[#4b5563]">
                                      {player.name}
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="0"
                                      value={row.playerKills[player.id] ?? ""}
                                      onChange={(e) =>
                                        updatePlayerKill(row, player.id, e.target.value)
                                      }
                                      className="h-[32px] min-w-0 flex-1 rounded-[6px] border border-[#e2e5ec] bg-white px-2 text-[12px] text-[#000000] outline-none placeholder:text-[#c8cdd5] focus:border-[#000000]"
                                    />
                                  </label>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center align-top">
                              <button
                                type="button"
                                onClick={() => removeRow(row.id)}
                                className="grid h-[36px] w-[36px] cursor-pointer place-items-center rounded-[6px] text-[#9aa1b0] hover:bg-[#fee2e2] hover:text-[#ef4444]"
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
            </form>
          </div>

          <div className="flex items-center justify-between border-t border-[#f0f1f3] px-8 py-4">
            <div className="text-[13px] text-[#666666]">{rows.length} results to add</div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="cursor-pointer rounded-[8px] border border-[#e2e5ec] px-4 py-2 text-[13px] font-medium text-[#666666] hover:bg-[#f7f8fb]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex cursor-pointer items-center gap-2 rounded-[8px] bg-[#000000] px-5 py-2 text-[13px] font-medium text-white hover:bg-[#333]"
              >
                Save Results
                <div className="flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">
                  Ctrl + <CornerDownLeft className="h-3 w-3" />
                </div>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ThemedConfirmDialog
        open={showKillMismatchWarning}
        onOpenChange={setShowKillMismatchWarning}
        title="Kill total mismatch"
        description={
          <>
            {mismatchRows.length === 1
              ? `${firstMismatchTeam}'s Total Kills is set to ${firstMismatch?.totalKills}, but player kills add up to ${firstMismatchPlayerTotal}.`
              : `${mismatchRows.length} teams have Total Kills that do not match their player kills.`}{" "}
            Do you want to continue?
          </>
        }
        cancelLabel="Review"
        confirmLabel="Continue"
        onConfirm={saveResults}
      />
    </>
  );
}
