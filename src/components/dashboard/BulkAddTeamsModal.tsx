"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X, Plus, Trash2, CornerDownLeft } from "lucide-react";
import { type Team } from "./AddTeamModal";
import { type AddPoolTeamInput } from "./AddPoolTeamModal";
import { PhoneNumberInput } from "@/components/dashboard/PhoneNumberInput";
import { TeamPoolNameInput } from "@/components/dashboard/TeamPoolNameInput";
import { teamsApi } from "@/lib/api";
import { apiTeamToPoolTeam } from "@/lib/mappers";
import type { PoolTeam } from "@/lib/team-pool";
import { queue } from "@/components/ui/Toast";

interface BulkAddTeamsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTeams?: (teams: Team[]) => void | Promise<void>;
  onAddPoolTeams?: (teams: AddPoolTeamInput[]) => void | Promise<void>;
  showNotification?: boolean;
  mode?: "event" | "pool";
  existingTeamNames?: string[];
}

interface TeamRow {
  id: string;
  slotNumber: string;
  name: string;
  tags: string;
  playersString: string;
  contactMobile: string;
  selectedPoolTeamId: string | null;
  logo: string | null;
}

function createEmptyRow(): TeamRow {
  return {
    id: crypto.randomUUID(),
    slotNumber: "",
    name: "",
    tags: "",
    playersString: "",
    contactMobile: "",
    selectedPoolTeamId: null,
    logo: null,
  };
}

export function BulkAddTeamsModal({
  open,
  onOpenChange,
  onAddTeams,
  onAddPoolTeams,
  showNotification = true,
  mode = "event",
  existingTeamNames = [],
}: BulkAddTeamsModalProps) {
  const isPoolMode = mode === "pool";
  // Start with 5 empty rows by default
  const [rows, setRows] = useState<TeamRow[]>(Array.from({ length: 5 }, createEmptyRow));
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false);
  const [poolTeams, setPoolTeams] = useState<PoolTeam[]>([]);
  const [poolTeamsLoading, setPoolTeamsLoading] = useState(false);

  useEffect(() => {
    if (!open || isPoolMode) return;
    let cancelled = false;
    setPoolTeamsLoading(true);
    teamsApi.getAll()
      .then((teams) => {
        if (!cancelled) setPoolTeams(teams.map(apiTeamToPoolTeam));
      })
      .catch(() => {
        if (!cancelled) setPoolTeams([]);
      })
      .finally(() => {
        if (!cancelled) setPoolTeamsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, isPoolMode]);

  const rowInputsRef = useRef<Map<string, HTMLInputElement>>(new Map());
  const lastRowId = rows[rows.length - 1]?.id;

  // Focus the first input of the last row when a new row is added
  useEffect(() => {
    if (rows.length > 5 && lastRowId) {
      // Only auto-focus if manually added beyond initial 5
      const input = rowInputsRef.current.get(lastRowId + "-slot");
      if (input) input.focus();
    }
  }, [lastRowId, rows.length]);

  const resetRows = () => {
    setRows(Array.from({ length: 5 }, createEmptyRow));
  };

  const hasUnsavedChanges = () =>
    rows.length !== 5 ||
    rows.some((row) =>
      [row.slotNumber, row.name, row.tags, row.playersString, row.contactMobile].some(
        (value) => value.trim() !== "",
      ),
    );

  const closeWithoutPrompt = () => {
    onOpenChange(false);
    // Reset after animation
    setTimeout(resetRows, 300);
  };

  const handleClose = () => {
    if (hasUnsavedChanges()) {
      setShowDiscardPrompt(true);
      return;
    }
    closeWithoutPrompt();
  };

  const updateRow = (id: string, field: keyof TeamRow, value: string) => {
    setRows((prev) => prev.map((row) => (row.id === id
      ? { ...row, [field]: value, ...(field === "name" ? { selectedPoolTeamId: null, logo: null } : {}) }
      : row)));
  };

  const selectPoolTeam = (rowId: string, team: PoolTeam) => {
    setRows((prev) => prev.map((row) => row.id === rowId
      ? { ...row, name: team.name, tags: team.tags.join(", "), selectedPoolTeamId: team.id, logo: team.logo }
      : row));
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const addRow = () => {
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const handleRowKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      if (e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        handleSave();
      } else if (index === rows.length - 1) {
        e.preventDefault();
        addRow();
      }
    }
  };

  const handleSave = async () => {
    const validRows = rows.filter((r) => r.name.trim() !== "");

    if (validRows.length === 0) {
      if (showNotification) {
        queue.add(
          {
            title: "Missing required fields",
            description: "Add at least one team name before saving.",
            variant: "error",
          },
          { timeout: 5000 },
        );
      }
      return;
    }

    try {
      if (isPoolMode) {
        const poolTeams: AddPoolTeamInput[] = validRows.map((row) => ({
          name: row.name.trim(),
          logo: null,
          tags: row.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          contactMobile: row.contactMobile.trim(),
        }));
        await onAddPoolTeams?.(poolTeams);
      } else {
        const newTeams: Team[] = validRows.map((row) => ({
          id: row.selectedPoolTeamId || crypto.randomUUID(),
          name: row.name.trim(),
          logo: row.logo,
          slotNumber: row.slotNumber.trim(),
          tags: row.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          addToDatabase: false,
          players: row.playersString
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean),
        }));
        await onAddTeams?.(newTeams);
      }
    } catch (err) {
      queue.add(
        {
          title: "Could not add teams",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "error",
        },
        { timeout: 5000 },
      );
      return;
    }

    if (showNotification) {
      queue.add(
        {
          title: "Teams added",
          description: `${validRows.length} team${validRows.length === 1 ? "" : "s"} have been added successfully.`,
          variant: "success",
        },
        { timeout: 5000 },
      );
    }
    closeWithoutPrompt();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      {/* Just slightly smaller than the main modal (h-[80vh] w-[85vw] max-w-[1200px]) */}
      <DialogContent className="flex h-[80dvh] max-h-[calc(100dvh-48px)] w-[85vw] max-w-[1200px] flex-col gap-0 overflow-hidden rounded-[16px] border border-[#e2e5ec] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.12)]">
        <DialogTitle className="sr-only">
          {isPoolMode ? "Bulk Add Teams to Pool" : "Bulk Add Teams"}
        </DialogTitle>

        <AnimatePresence>
          {showDiscardPrompt && (
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
                <p className="text-[16px] font-medium text-[#000000]">Discard bulk teams?</p>
                <p className="text-[14px] text-[#9aa1b0]">Your progress will be lost.</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDiscardPrompt(false)}
                    className="h-[38px] cursor-pointer rounded-[8px] border border-[#e2e5ec] bg-white px-5 text-[14px] font-medium text-[#666666] transition-colors hover:bg-[#f7f8fb]"
                  >
                    Keep editing
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDiscardPrompt(false);
                      closeWithoutPrompt();
                    }}
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
        <div className="flex items-center justify-between border-b border-[#f0f1f3] px-8 py-5">
          <div>
            <h2 className="text-[18px] font-semibold text-[#000000]">
              {isPoolMode ? "Bulk Add Teams to Pool" : "Bulk Add Teams"}
            </h2>
            <p className="mt-1 text-[13px] text-[#9aa1b0]">
              Quickly add multiple teams at once. Only rows with a Team Name will be saved.
            </p>
          </div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6 bg-[#f9fbfc]">
          <div className="rounded-[12px] border border-[#e2e5ec] bg-white overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e2e5ec] bg-[#f7f8fb]">
                  {!isPoolMode && (
                    <th className="w-[80px] px-4 py-3 text-[12px] font-medium text-[#4b5563]">
                      Slot
                    </th>
                  )}
                  <th className="w-[280px] px-4 py-3 text-[12px] font-medium text-[#4b5563]">
                    Team Name <span className="text-red-500">*</span>
                  </th>
                  <th className="w-[200px] px-4 py-3 text-[12px] font-medium text-[#4b5563]">
                    Tags
                  </th>
                  {isPoolMode ? (
                    <th className="px-4 py-3 text-[12px] font-medium text-[#4b5563]">Mobile</th>
                  ) : (
                    <th className="px-4 py-3 text-[12px] font-medium text-[#4b5563]">
                      Players (Comma separated)
                    </th>
                  )}
                  <th className="w-[60px] px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f1f3]">
                {rows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-[#fcfdfd] transition-colors">
                    {!isPoolMode && (
                      <td className="px-4 py-2">
                        <input
                          ref={(el) => {
                            if (el) rowInputsRef.current.set(row.id + "-slot", el);
                          }}
                          type="number"
                          min="1"
                          value={row.slotNumber}
                          onChange={(e) => updateRow(row.id, "slotNumber", e.target.value)}
                          onKeyDown={(e) => handleRowKeyDown(e, index)}
                          placeholder={`${index + 1}`}
                          className="h-[36px] w-full rounded-[6px] border border-[#e2e5ec] bg-white px-3 text-[13px] text-[#000000] outline-none placeholder:text-[#c8cdd5] focus:border-[#000000]"
                        />
                      </td>
                    )}
                    <td className="px-4 py-2">
                      {isPoolMode ? (
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => updateRow(row.id, "name", e.target.value)}
                          onKeyDown={(e) => handleRowKeyDown(e, index)}
                          placeholder="Team Name"
                          className="h-[36px] w-full rounded-[6px] border border-[#e2e5ec] bg-white px-3 text-[13px] text-[#000000] outline-none placeholder:text-[#c8cdd5] focus:border-[#000000]"
                        />
                      ) : (
                        <TeamPoolNameInput
                          value={row.name}
                          onChange={(value) => updateRow(row.id, "name", value)}
                          onSelectTeam={(team) => selectPoolTeam(row.id, team)}
                          poolTeams={poolTeams}
                          excludeNames={[
                            ...existingTeamNames,
                            ...rows.filter((other) => other.id !== row.id).map((other) => other.name),
                          ]}
                          placeholder={poolTeamsLoading ? "Loading teams..." : "Team Name"}
                        />
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={row.tags}
                        onChange={(e) => updateRow(row.id, "tags", e.target.value)}
                        onKeyDown={(e) => handleRowKeyDown(e, index)}
                        placeholder="Tags"
                        className="h-[36px] w-full rounded-[6px] border border-[#e2e5ec] bg-white px-3 text-[13px] text-[#000000] outline-none placeholder:text-[#c8cdd5] focus:border-[#000000]"
                      />
                    </td>
                    <td className="px-4 py-2">
                      {isPoolMode ? (
                        <PhoneNumberInput
                          value={row.contactMobile}
                          onChange={(value) => updateRow(row.id, "contactMobile", value)}
                          onKeyDown={(e) => handleRowKeyDown(e, index)}
                          placeholder="98765 43210"
                        />
                      ) : (
                        <input
                          type="text"
                          value={row.playersString}
                          onChange={(e) => updateRow(row.id, "playersString", e.target.value)}
                          onKeyDown={(e) => handleRowKeyDown(e, index)}
                          placeholder="Player 1, Player 2, Player 3..."
                          className="h-[36px] w-full rounded-[6px] border border-[#e2e5ec] bg-white px-3 text-[13px] text-[#000000] outline-none placeholder:text-[#c8cdd5] focus:border-[#000000]"
                        />
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="grid h-[36px] w-[36px] cursor-pointer place-items-center rounded-[6px] text-[#9aa1b0] hover:bg-[#fee2e2] hover:text-[#ef4444]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Add Row Button inside the table container */}
            <div className="border-t border-[#f0f1f3] p-3 bg-white">
              <button
                type="button"
                onClick={addRow}
                className="flex cursor-pointer items-center gap-1.5 text-[13px] font-medium text-[#000000] hover:text-[#666666] px-2 py-1"
              >
                <Plus className="h-4 w-4" /> Add another row
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#f0f1f3] px-8 py-4">
          <div className="text-[13px] text-[#666666]">
            {rows.filter((r) => r.name.trim() !== "").length} valid teams to add
          </div>
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
              Save Teams
              <div className="flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">
                Ctrl + <CornerDownLeft className="h-3 w-3" />
              </div>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
