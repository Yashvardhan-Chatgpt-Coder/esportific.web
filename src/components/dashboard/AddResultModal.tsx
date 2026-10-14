"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, ThemedConfirmDialog } from "@/components/ui/dialog";
import { CornerDownLeft } from "lucide-react";
import { AppSearchSelect } from "./AppSearchSelect";
import { queue } from "@/components/ui/Toast";
import { duplicatePlacementMessage, findDuplicatePlacement } from "@/lib/match-result-validation";

export interface TeamData {
  id: string;
  name: string;
  players: { id: string; name: string }[];
}

export interface ResultEntry {
  id: string;
  teamId: string;
  position: number | "";
  totalKills: number | "";
  playerKills: Record<string, number | "">;
}

export function AddResultModal({
  open,
  onClose,
  onAdd,
  teams,
  existingResults,
  initialResult,
  mode = "add",
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (result: ResultEntry) => void;
  teams: TeamData[];
  existingResults: ResultEntry[];
  initialResult?: ResultEntry | null;
  mode?: "add" | "edit";
}) {
  const [teamId, setTeamId] = useState("");
  const [position, setPosition] = useState<number | "">("");
  const [totalKills, setTotalKills] = useState<number | "">("");
  const [playerKills, setPlayerKills] = useState<Record<string, number | "">>({});
  const [manualTotalKills, setManualTotalKills] = useState(false);
  const [showKillMismatchWarning, setShowKillMismatchWarning] = useState(false);

  const isEditMode = mode === "edit";
  const selectedTeam = teams.find((t) => t.id === teamId);
  const availableTeams = teams.filter(
    (t) => !existingResults.some((r) => r.teamId === t.id && r.id !== initialResult?.id),
  );
  const playerKillTotal =
    selectedTeam?.players.reduce((acc, p) => {
      const k = playerKills[p.id];
      return acc + (typeof k === "number" ? k : 0);
    }, 0) ?? 0;

  // Auto-sum player kills into totalKills when user hasn't manually typed total
  useEffect(() => {
    if (!manualTotalKills && selectedTeam) {
      const sum = selectedTeam.players.reduce((acc, p) => {
        const k = playerKills[p.id];
        return acc + (typeof k === "number" ? k : 0);
      }, 0);
      setTotalKills(sum > 0 ? sum : "");
    }
  }, [playerKills, manualTotalKills, selectedTeam]);

  const reset = () => {
    setTeamId("");
    setPosition("");
    setTotalKills("");
    setPlayerKills({});
    setManualTotalKills(false);
    setShowKillMismatchWarning(false);
  };

  useEffect(() => {
    if (!open) return;
    if (isEditMode && initialResult) {
      setTeamId(initialResult.teamId);
      setPosition(initialResult.position);
      setTotalKills(initialResult.totalKills);
      setPlayerKills({ ...initialResult.playerKills });
      setManualTotalKills(true);
      setShowKillMismatchWarning(false);
      return;
    }
    reset();
  }, [open, isEditMode, initialResult]);

  const addResult = () => {
    if (!teamId) return;
    // Auto-assign position if not specified
    let pos = position;
    if (pos === "") {
      const usedPositions = existingResults
        .map((r) => r.position)
        .filter((p): p is number => typeof p === "number");
      let next = 1;
      while (usedPositions.includes(next)) next++;
      pos = next;
    }
    const nextResult = {
      id: initialResult?.id || Math.random().toString(36).slice(2),
      teamId,
      position: pos,
      totalKills: totalKills === "" ? 0 : totalKills,
      playerKills,
    };
    const nextResults = isEditMode
      ? existingResults.map((result) => (result.id === nextResult.id ? nextResult : result))
      : [...existingResults, nextResult];
    const duplicatePlacement = findDuplicatePlacement(nextResults, teams);
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

    onAdd(nextResult);
    setShowKillMismatchWarning(false);
    onClose();
  };

  const handleAdd = () => {
    if (!teamId) {
      queue.add(
        {
          title: "Missing required fields",
          description: "Team is a mandatory field.",
          variant: "error",
        },
        { timeout: 5000 },
      );
      return;
    }
    if (manualTotalKills && totalKills !== "" && totalKills !== playerKillTotal) {
      setShowKillMismatchWarning(true);
      return;
    }
    addResult();
  };

  const handlePositionChange = (val: string) => {
    setShowKillMismatchWarning(false);
    if (val === "") {
      setPosition("");
      return;
    }
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 0) setPosition(n);
  };

  const handleTotalKillsChange = (val: string) => {
    setShowKillMismatchWarning(false);
    setManualTotalKills(true);
    if (val === "") {
      setTotalKills("");
      return;
    }
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 0) setTotalKills(n);
  };

  const handlePlayerKillChange = (playerId: string, val: string) => {
    setShowKillMismatchWarning(false);
    if (val === "") {
      setPlayerKills((prev) => ({ ...prev, [playerId]: "" }));
      return;
    }
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 0) {
      setPlayerKills((prev) => ({ ...prev, [playerId]: n }));
    }
  };

  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        if (showKillMismatchWarning) {
          addResult();
        } else {
          handleAdd();
        }
      } else {
        e.preventDefault();
      }
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent
          overlayClassName="z-[60]"
          className="z-[70] flex max-h-[90vh] w-full max-w-[500px] flex-col gap-0 overflow-hidden rounded-[16px] border border-[#e2e5ec] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.12)]"
        >
          <DialogTitle className="sr-only">{isEditMode ? "Edit Result" : "Add Result"}</DialogTitle>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#f0f1f3] px-6 py-4">
            <h2 className="text-[18px] font-semibold text-[#000000]">
              {isEditMode ? "Edit Result" : "Add Result"}
            </h2>
          </div>

          {/* Form Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <form
              id="add-result-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleAdd();
              }}
              onKeyDown={handleFormKeyDown}
              className="space-y-5"
            >
              {/* Team Select */}
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
                  Team <span className="text-red-500">*</span>
                </label>
                <AppSearchSelect
                  value={teamId}
                  onChange={(v) => {
                    setShowKillMismatchWarning(false);
                    setTeamId(v);
                    setPlayerKills({});
                    setManualTotalKills(false);
                    setTotalKills("");
                  }}
                  placeholder="Search and select team..."
                  disabled={isEditMode}
                  options={availableTeams.map((t) => ({ label: t.name, value: t.id }))}
                />
              </div>

              {/* Position & Total Kills */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
                    Position
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={position}
                    onChange={(e) => handlePositionChange(e.target.value)}
                    placeholder="Auto-assigned"
                    className="h-[40px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[14px] text-[#000000] outline-none placeholder:text-[#b0b7c4] focus:border-[#000000]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
                    Total Kills
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={totalKills}
                    onChange={(e) => handleTotalKillsChange(e.target.value)}
                    placeholder="Auto from players"
                    className="h-[40px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[14px] text-[#000000] outline-none placeholder:text-[#b0b7c4] focus:border-[#000000]"
                  />
                </div>
              </div>

              {/* Player Wise Kills */}
              {selectedTeam && (
                <div>
                  <label className="mb-2 block text-[13px] font-medium text-[#4b5563]">
                    Player Wise Kills
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedTeam.players.map((player) => (
                      <div key={player.id} className="flex items-center gap-2">
                        <span className="w-[90px] truncate text-[12px] font-medium text-[#4b5563]">
                          {player.name}
                        </span>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={playerKills[player.id] ?? ""}
                          onChange={(e) => handlePlayerKillChange(player.id, e.target.value)}
                          className="min-w-0 flex-1 rounded-[6px] border border-[#e2e5ec] px-2 py-1.5 text-[12px] outline-none focus:border-[#000000]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-[#f0f1f3] px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-[8px] border border-[#e2e5ec] px-4 py-2 text-[13px] font-medium text-[#666666] hover:bg-[#f7f8fb]"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-result-form"
              className="flex cursor-pointer items-center gap-2 rounded-[8px] bg-[#000000] px-5 py-2 text-[13px] font-medium text-white hover:bg-[#333]"
            >
              {isEditMode ? "Save Changes" : "Add Result"}
              <div className="flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">
                Ctrl + <CornerDownLeft className="h-3 w-3" />
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <ThemedConfirmDialog
        open={showKillMismatchWarning}
        onOpenChange={setShowKillMismatchWarning}
        title="Kill total mismatch"
        description={
          <>
            Total Kills is set to {totalKills}, but player kills add up to {playerKillTotal}. Do you
            want to continue?
          </>
        }
        cancelLabel="Review"
        confirmLabel="Continue"
        onConfirm={addResult}
      />
    </>
  );
}
