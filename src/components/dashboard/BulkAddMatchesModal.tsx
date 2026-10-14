"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, CornerDownLeft } from "lucide-react";
import { AppSelect } from "./AppSelect";
import { type MatchInput } from "./AddMatchModal";
import { queue } from "@/components/ui/Toast";

const MAP_OPTIONS = ["Erangel", "Miramar", "Sanhok", "Vikendi", "Livik", "TBD"].map((map) => ({
  label: map,
  value: map,
}));

interface BulkAddMatchesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddMatches: (matches: MatchInput[]) => void;
  nextMatchNumber?: number;
  showNotification?: boolean;
  mapOptions?: Array<{ label: string; value: string }>;
}

interface MatchRow {
  id: string;
  name: string;
  map: string;
}

export function BulkAddMatchesModal({
  open,
  onOpenChange,
  onAddMatches,
  nextMatchNumber = 1,
  showNotification = true,
  mapOptions = MAP_OPTIONS,
}: BulkAddMatchesModalProps) {
  const defaultMap = mapOptions[0]?.value || "TBD";
  const [rows, setRows] = useState<MatchRow[]>(
    Array.from({ length: 5 }, () => ({
      id: crypto.randomUUID(),
      name: "",
      map: defaultMap,
    })),
  );
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false);

  const rowInputsRef = useRef<Map<string, HTMLInputElement>>(new Map());

  useEffect(() => {
    if (rows.length > 5) {
      const lastRowId = rows[rows.length - 1].id;
      const input = rowInputsRef.current.get(lastRowId + "-name");
      if (input) input.focus();
    }
  }, [rows.length]);

  const resetRows = () => {
    setRows(
      Array.from({ length: 5 }, () => ({
        id: crypto.randomUUID(),
        name: "",
        map: defaultMap,
      })),
    );
  };

  const hasUnsavedChanges = () =>
    rows.length !== 5 || rows.some((row) => row.name.trim() !== "" || row.map !== defaultMap);

  const closeWithoutPrompt = () => {
    onOpenChange(false);
    setTimeout(resetRows, 300);
  };

  const handleClose = () => {
    if (hasUnsavedChanges()) {
      setShowDiscardPrompt(true);
      return;
    }
    closeWithoutPrompt();
  };

  const updateRow = (id: string, field: keyof MatchRow, value: string) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
        map: defaultMap,
      },
    ]);
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

  const handleSave = () => {
    const newMatches: MatchInput[] = rows.map((row, index) => ({
      name: row.name.trim() || `Match ${nextMatchNumber + index}`,
      map: row.map.trim() || "TBD",
    }));

    onAddMatches(newMatches);
    if (showNotification) {
      queue.add(
        {
          title: "Matches added",
          description: `${newMatches.length} match${newMatches.length === 1 ? "" : "es"} have been added successfully.`,
          variant: "success",
        },
        { timeout: 5000 },
      );
    }
    closeWithoutPrompt();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      <DialogContent className="flex h-[80vh] w-[85vw] max-w-[1200px] flex-col gap-0 overflow-hidden rounded-[16px] border border-[#e2e5ec] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.12)]">
        <DialogTitle className="sr-only">Bulk Add Matches</DialogTitle>

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
                <p className="text-[16px] font-medium text-[#000000]">Discard bulk matches?</p>
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

        <div className="flex items-center justify-between border-b border-[#f0f1f3] px-8 py-5">
          <div>
            <h2 className="text-[18px] font-semibold text-[#000000]">Bulk Add Matches</h2>
            <p className="mt-1 text-[13px] text-[#9aa1b0]">
              Quickly add multiple matches at once. Blank names will be filled automatically.
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#f9fbfc] px-8 py-6">
          <div className="overflow-hidden rounded-[12px] border border-[#e2e5ec] bg-white">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#e2e5ec] bg-[#f7f8fb]">
                  <th className="w-[320px] px-4 py-3 text-[12px] font-medium text-[#4b5563]">
                    Match Name <span className="text-[#9aa1b0]">(optional)</span>
                  </th>
                  <th className="px-4 py-3 text-[12px] font-medium text-[#4b5563]">Map</th>
                  <th className="w-[60px] px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f1f3]">
                {rows.map((row, index) => (
                  <tr key={row.id} className="transition-colors hover:bg-[#fcfdfd]">
                    <td className="px-4 py-2">
                      <input
                        ref={(el) => {
                          if (el) rowInputsRef.current.set(row.id + "-name", el);
                        }}
                        type="text"
                        value={row.name}
                        onChange={(e) => updateRow(row.id, "name", e.target.value)}
                        onKeyDown={(e) => handleRowKeyDown(e, index)}
                        placeholder={`Match ${nextMatchNumber + index}`}
                        className="h-[36px] w-full rounded-[6px] border border-[#e2e5ec] bg-white px-3 text-[13px] text-[#000000] outline-none placeholder:text-[#c8cdd5] focus:border-[#000000]"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <AppSelect
                        value={row.map}
                        onChange={(value) => updateRow(row.id, "map", value)}
                        options={mapOptions}
                      />
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

            <div className="border-t border-[#f0f1f3] bg-white p-3">
              <button
                type="button"
                onClick={addRow}
                className="flex cursor-pointer items-center gap-1.5 px-2 py-1 text-[13px] font-medium text-[#000000] hover:text-[#666666]"
              >
                <Plus className="h-4 w-4" /> Add another row
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[#f0f1f3] px-8 py-4">
          <div className="text-[13px] text-[#666666]">
            {rows.length} match{rows.length === 1 ? "" : "es"} to add
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
              Save Matches
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
