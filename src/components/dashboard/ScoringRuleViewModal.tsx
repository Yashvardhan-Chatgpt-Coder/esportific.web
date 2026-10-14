"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Copy, Pencil, Trash2, X } from "lucide-react";
import {
  formatLabel,
  getTemplateSummary,
  placementLabel,
  trimPlacementPoints,
  type ScoringRuleTemplate,
} from "@/lib/scoring-rule-templates";

type ScoringRuleViewModalProps = {
  open: boolean;
  template: ScoringRuleTemplate | null;
  onOpenChange: (open: boolean) => void;
  onEdit?: (template: ScoringRuleTemplate) => void;
  onDuplicate?: (template: ScoringRuleTemplate) => void;
  onDelete?: (template: ScoringRuleTemplate) => void;
};

export function ScoringRuleViewModal({
  open,
  template,
  onOpenChange,
  onEdit,
  onDuplicate,
  onDelete,
}: ScoringRuleViewModalProps) {
  const [visibleTemplate, setVisibleTemplate] = useState<ScoringRuleTemplate | null>(template);

  useEffect(() => {
    if (template) {
      setVisibleTemplate(template);
      return;
    }

    if (!open) {
      const timeout = window.setTimeout(() => setVisibleTemplate(null), 220);
      return () => window.clearTimeout(timeout);
    }
  }, [open, template]);

  if (!visibleTemplate) return null;

  const placements =
    visibleTemplate.format === "battle_royale"
      ? trimPlacementPoints(visibleTemplate.placementPoints)
      : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="flex max-h-[90vh] w-[92vw] max-w-[640px] flex-col gap-0 overflow-hidden rounded-[16px] border border-[#e2e5ec] bg-white p-0"
      >
        <DialogTitle className="sr-only">{visibleTemplate.name} scoring template</DialogTitle>

        <div className="flex items-start justify-between gap-4 border-b border-[#f0f1f3] px-8 py-6">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#eef0f4] px-2.5 py-0.5 text-[11px] font-semibold text-[#4b5563]">
                {formatLabel(visibleTemplate.format)}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  visibleTemplate.isBuiltIn
                    ? "bg-[#e8f0fe] text-[#1d4ed8]"
                    : visibleTemplate.isPlatform
                      ? "bg-[#ede9fe] text-[#6d28d9]"
                      : "bg-[#f0f1f3] text-[#4b5563]"
                }`}
              >
                {visibleTemplate.isBuiltIn
                  ? "Built-in"
                  : visibleTemplate.isPlatform
                    ? "Platform"
                    : "Custom"}
              </span>
            </div>
            <h2 className="text-[22px] font-semibold text-[#000000]">{visibleTemplate.name}</h2>
            <p className="mt-1 text-[14px] text-[#666666]">
              {visibleTemplate.description || getTemplateSummary(visibleTemplate)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-[8px] text-[#9aa1b0] hover:bg-[#f7f8fb] hover:text-[#000000]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
          {visibleTemplate.format === "battle_royale" ? (
            <div className="space-y-5">
              <div className="rounded-[10px] border border-[#eef0f4] bg-[#f9fbfc] px-5 py-4">
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#9aa1b0]">
                  Points per kill
                </p>
                <p className="mt-1 text-[20px] font-semibold text-[#000000]">
                  {visibleTemplate.killPointsPerKill}
                </p>
              </div>

              <div>
                <p className="mb-2 text-[13px] font-medium text-[#4b5563]">Placement points</p>
                <div className="overflow-hidden rounded-[10px] border border-[#e2e5ec]">
                  <table className="w-full text-left text-[13px]">
                    <thead className="border-b border-[#e2e5ec] bg-[#f9fbfc]">
                      <tr>
                        <th className="px-4 py-2.5 font-medium text-[#666666]">Position</th>
                        <th className="px-4 py-2.5 text-right font-medium text-[#666666]">
                          Points
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f1f3]">
                      {placements.map((pts, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2.5 text-[#4b5563]">{placementLabel(index)}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-[#000000]">
                            {pts}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-[10px] border border-[#eef0f4] bg-[#f9fbfc] px-5 py-4 text-center">
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#9aa1b0]">
                  Win
                </p>
                <p className="mt-1 text-[22px] font-semibold text-[#000000]">
                  {visibleTemplate.winPoints}
                </p>
              </div>
              <div className="rounded-[10px] border border-[#eef0f4] bg-[#f9fbfc] px-5 py-4 text-center">
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#9aa1b0]">
                  Draw
                </p>
                <p className="mt-1 text-[22px] font-semibold text-[#000000]">
                  {visibleTemplate.drawPoints}
                </p>
              </div>
              <div className="rounded-[10px] border border-[#eef0f4] bg-[#f9fbfc] px-5 py-4 text-center">
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#9aa1b0]">
                  Loss
                </p>
                <p className="mt-1 text-[22px] font-semibold text-[#000000]">
                  {visibleTemplate.lossPoints}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[#f0f1f3] bg-[#f9fbfc] px-8 py-4">
          {onDuplicate && (
            <button
              type="button"
              onClick={() => onDuplicate(visibleTemplate)}
              className="flex h-[36px] cursor-pointer items-center gap-2 rounded-[6px] border border-[#e2e5ec] bg-white px-4 text-[13px] font-medium text-[#000000] hover:bg-[#f7f8fb]"
            >
              <Copy className="h-4 w-4" />
              Duplicate as custom
            </button>
          )}
          {!visibleTemplate.isBuiltIn && !visibleTemplate.isPlatform && onEdit && (
            <button
              type="button"
              onClick={() => onEdit(visibleTemplate)}
              className="flex h-[36px] cursor-pointer items-center gap-2 rounded-[6px] border border-[#e2e5ec] bg-white px-4 text-[13px] font-medium text-[#000000] hover:bg-[#f7f8fb]"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          )}
          {!visibleTemplate.isBuiltIn && !visibleTemplate.isPlatform && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(visibleTemplate)}
              className="flex h-[36px] cursor-pointer items-center gap-2 rounded-[6px] border border-[#fecaca] bg-white px-4 text-[13px] font-medium text-[#ef4444] hover:bg-[#fff5f5]"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
