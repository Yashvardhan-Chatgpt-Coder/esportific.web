"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { AppSelect } from "@/components/dashboard/AppSelect";
import { Plus, Trash2 } from "lucide-react";
import {
  EMPTY_BR_DRAFT,
  EMPTY_ELIM_DRAFT,
  placementLabel,
  type ScoringRuleDraft,
  type ScoringRuleFormat,
  type ScoringRuleTemplate,
} from "@/lib/scoring-rule-templates";
import type { CatalogGame } from "@/lib/games-catalog";
import { defaultFieldsForFormat, type GameFormat } from "@/lib/tournament-formats";
import { queue } from "@/components/ui/Toast";

type ScoringRuleTemplateModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ScoringRuleTemplate | null;
  prefillDraft?: ScoringRuleDraft | null;
  games?: CatalogGame[];
  lockIdentityFields?: boolean;
  onSave: (draft: ScoringRuleDraft, existingId?: string) => void;
};

export function ScoringRuleTemplateModal({
  open,
  onOpenChange,
  initial,
  prefillDraft,
  games = [],
  lockIdentityFields = false,
  onSave,
}: ScoringRuleTemplateModalProps) {
  const [draft, setDraft] = useState<ScoringRuleDraft>(EMPTY_BR_DRAFT);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setDraft({
        name: initial.name,
        description: initial.description,
        format: initial.format,
        placementPoints: [...initial.placementPoints],
        killPointsPerKill: initial.killPointsPerKill,
        winPoints: initial.winPoints,
        drawPoints: initial.drawPoints,
        lossPoints: initial.lossPoints,
        gameId: initial.gameId || null,
        gameName: initial.gameName || "",
        isGeneric: initial.isGeneric !== false,
        scoringFields: initial.scoringFields,
      });
    } else if (prefillDraft) {
      setDraft({
        ...prefillDraft,
        placementPoints: [...prefillDraft.placementPoints],
      });
    } else {
      setDraft(EMPTY_BR_DRAFT);
    }
  }, [open, initial, prefillDraft]);

  const setFormat = (format: ScoringRuleFormat) => {
    if (format === draft.format) return;
    const base = format === "battle_royale" ? EMPTY_BR_DRAFT : EMPTY_ELIM_DRAFT;
    setDraft({
      ...base,
      name: draft.name,
      description: draft.description,
      gameId: draft.gameId,
      gameName: draft.gameName,
      isGeneric: !draft.gameId,
      scoringFields: defaultFieldsForFormat(format),
    });
  };

  const selectedGame = games.find((game) => game.id === draft.gameId);
  const selectedGameFormat = selectedGame?.formats.find((format) => format.key === draft.format);
  const formatOptions = selectedGame
    ? selectedGame.formats.map((format) => ({ label: format.name, value: format.key }))
    : [
        { label: "Battle Royale", value: "battle_royale" },
        { label: "Elimination / Head-to-head", value: "elimination" },
      ];

  const applyGame = (gameId: string) => {
    if (!gameId) {
      setDraft({
        ...draft,
        gameId: null,
        gameName: "",
        isGeneric: true,
        scoringFields: defaultFieldsForFormat(draft.format),
      });
      return;
    }

    const game = games.find((item) => item.id === gameId);
    const firstFormat = game?.formats[0];
    if (!game || !firstFormat) return;
    setDraft({
      ...draft,
      gameId: game.id,
      gameName: game.name,
      isGeneric: false,
      format: firstFormat.key as ScoringRuleFormat,
      scoringFields: firstFormat.scoringFields,
    });
  };

  const applyGameFormat = (formatKey: string) => {
    const gameFormat = selectedGame?.formats.find((format) => format.key === formatKey);
    setDraft({
      ...draft,
      format: formatKey as ScoringRuleFormat,
      scoringFields: gameFormat?.scoringFields || defaultFieldsForFormat(formatKey),
    });
  };

  const effectiveScoringFields =
    draft.scoringFields && draft.scoringFields.length > 0
      ? draft.scoringFields
      : selectedGameFormat?.scoringFields && selectedGameFormat.scoringFields.length > 0
        ? selectedGameFormat.scoringFields
        : defaultFieldsForFormat(draft.format);

  const usesField = (field: GameFormat["scoringFields"][number]) =>
    effectiveScoringFields.includes(field);

  const updatePlacement = (index: number, value: number) => {
    const placementPoints = [...draft.placementPoints];
    placementPoints[index] = value;
    setDraft({ ...draft, placementPoints });
  };

  const addPlacementRow = () => {
    setDraft({ ...draft, placementPoints: [...draft.placementPoints, 0] });
  };

  const removePlacementRow = (index: number) => {
    if (draft.placementPoints.length <= 1) return;
    setDraft({
      ...draft,
      placementPoints: draft.placementPoints.filter((_, i) => i !== index),
    });
  };

  const handleSave = () => {
    if (!draft.name.trim()) {
      queue.add(
        {
          title: "Missing required fields",
          description: "Template name is required.",
          variant: "error",
        },
        { timeout: 5000 },
      );
      return;
    }
    onSave(draft, initial?.id);
  };

  const isEdit = Boolean(initial);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[92vw] max-w-[720px] flex-col gap-0 overflow-hidden rounded-[16px] border border-[#e2e5ec] bg-white p-0">
        <DialogTitle className="sr-only">
          {isEdit ? "Edit scoring template" : "Create scoring template"}
        </DialogTitle>

        <div className="border-b border-[#f0f1f3] px-8 py-6">
          <h2 className="text-[20px] font-semibold text-[#000000]">
            {isEdit ? "Edit scoring template" : "Create scoring template"}
          </h2>
          <p className="mt-1 text-[14px] text-[#9aa1b0]">
            Save a reusable scoring setup for battle royale or elimination events.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6 space-y-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
              Template name
            </label>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g. BGMI Pro League"
              className="h-[40px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-4 text-[14px] outline-none focus:border-[#999]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
              Description
            </label>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={2}
              placeholder="When to use this template…"
              className="w-full resize-none rounded-[8px] border border-[#e2e5ec] bg-white px-4 py-2.5 text-[14px] outline-none focus:border-[#999]"
            />
          </div>

          {!lockIdentityFields && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
                  Game <span className="text-[#9aa1b0]">(optional)</span>
                </label>
                <AppSelect
                  value={draft.gameId || ""}
                  onChange={applyGame}
                  options={[
                    { label: "Generic template", value: "" },
                    ...games.map((game) => ({ label: game.name, value: game.id })),
                  ]}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
                  Format
                </label>
                <AppSelect
                  value={draft.format}
                  onChange={(value) =>
                    selectedGame ? applyGameFormat(value) : setFormat(value as ScoringRuleFormat)
                  }
                  options={formatOptions}
                />
              </div>
            </div>
          )}

          {usesField("killPoints") && (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
                Points per kill
              </label>
              <input
                type="number"
                min={0}
                value={draft.killPointsPerKill}
                onChange={(e) => setDraft({ ...draft, killPointsPerKill: Number(e.target.value) })}
                className="h-[40px] w-full max-w-[120px] rounded-[8px] border border-[#e2e5ec] bg-white px-4 text-[14px] outline-none focus:border-[#999]"
              />
            </div>
          )}

          {usesField("placementPoints") ? (
            <>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-[13px] font-medium text-[#4b5563]">Placement points</label>
                  <button
                    type="button"
                    onClick={addPlacementRow}
                    className="flex cursor-pointer items-center gap-1 text-[13px] font-medium text-[#000000] hover:text-[#666666]"
                  >
                    <Plus className="h-4 w-4" /> Add row
                  </button>
                </div>
                <div className="max-h-[280px] overflow-y-auto rounded-[10px] border border-[#e2e5ec]">
                  <table className="w-full text-left text-[13px]">
                    <thead className="sticky top-0 border-b border-[#e2e5ec] bg-[#f9fbfc]">
                      <tr>
                        <th className="px-4 py-2.5 font-medium text-[#666666]">Position</th>
                        <th className="px-4 py-2.5 font-medium text-[#666666]">Points</th>
                        <th className="w-12" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f1f3]">
                      {draft.placementPoints.map((pts, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-[#4b5563]">{placementLabel(index)}</td>
                          <td className="px-4 py-1.5">
                            <input
                              type="number"
                              min={0}
                              value={pts}
                              onChange={(e) => updatePlacement(index, Number(e.target.value))}
                              className="h-[32px] w-[72px] rounded-[6px] border border-[#e2e5ec] bg-[#f9fbfc] px-2 text-center text-[13px] outline-none focus:border-[#999] focus:bg-white"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            {draft.placementPoints.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removePlacementRow(index)}
                                className="grid h-8 w-8 cursor-pointer place-items-center rounded-[6px] text-[#9aa1b0] hover:bg-[#fee2e2] hover:text-[#ef4444]"
                                aria-label={`Remove ${placementLabel(index)}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}

          {(usesField("winPoints") || usesField("drawPoints") || usesField("lossPoints")) && (
            <div className="grid grid-cols-3 gap-4">
              {usesField("winPoints") && (
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
                    Win points
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={draft.winPoints}
                    onChange={(e) => setDraft({ ...draft, winPoints: Number(e.target.value) })}
                    className="h-[40px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-4 text-[14px] outline-none focus:border-[#999]"
                  />
                </div>
              )}
              {usesField("drawPoints") && (
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
                    Draw points
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={draft.drawPoints}
                    onChange={(e) => setDraft({ ...draft, drawPoints: Number(e.target.value) })}
                    className="h-[40px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-4 text-[14px] outline-none focus:border-[#999]"
                  />
                </div>
              )}
              {usesField("lossPoints") && (
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
                    Loss points
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={draft.lossPoints}
                    onChange={(e) => setDraft({ ...draft, lossPoints: Number(e.target.value) })}
                    className="h-[40px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-4 text-[14px] outline-none focus:border-[#999]"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-[#f0f1f3] bg-[#f9fbfc] px-8 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-[36px] cursor-pointer rounded-[6px] border border-[#e2e5ec] bg-white px-5 text-[13px] font-medium text-[#666666] hover:bg-[#f7f8fb]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="h-[36px] cursor-pointer rounded-[6px] bg-[#000000] px-5 text-[13px] font-medium text-white hover:bg-[#333]"
          >
            {isEdit ? "Save changes" : "Create template"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
