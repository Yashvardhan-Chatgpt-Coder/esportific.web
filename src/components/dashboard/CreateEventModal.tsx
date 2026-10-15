"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft,
  CornerDownLeft,
  Plus,
  Users,
  Import,
} from "lucide-react";
import { AddTeamModal, type Team } from "./AddTeamModal";
import { BulkAddTeamsModal } from "./BulkAddTeamsModal";
import { TeamExcelImportModal } from "./TeamExcelImportModal";
import { AnimatePresence, motion } from "framer-motion";
import { AppSelect } from "./AppSelect";
import { AppSearchSelect } from "./AppSearchSelect";
import { AppDatePicker } from "./AppDatePicker";
import { GameIcon } from "./GameLabel";
import { queue } from "@/components/ui/Toast";
import {
  apiGamesToCodeCatalogGames,
  getGameNameOptions,
  type CatalogGame,
} from "@/lib/games-catalog";
import { catalogApi, eventsApi, scoringRulesApi } from "@/lib/api";
import { apiScoringRuleToTemplate, placementArrayToMap } from "@/lib/mappers";
import { SCORING_PRESETS } from "@/lib/scoring-presets";
import type { ScoringRuleTemplate } from "@/lib/scoring-rule-templates";
import { normalizeSlottedTeams } from "@/lib/team-slots";
import {
  defaultFieldsForFormat,
  formatUsesField,
  getAllCodeDefinedFormats,
  type GameFormat,
  type ScoringFieldKey,
} from "@/lib/tournament-formats";
import { useNavigate } from "@tanstack/react-router";

// --- Types ---
type TournamentFormat = string;
type Step = 1 | 2 | 3;

interface EventData {
  name: string;
  game: string;
  customGameName: string;
  gameId: string | null;
  format: TournamentFormat;
  formatName: string;
  scoringFields: ScoringFieldKey[];
  startDate: string;
  teams: Team[];
  // Battle Royale scoring
  placementPoints: number[];
  killPoints: number;
  // Elimination scoring
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
  bestOf: number;
}

const initialEventData: EventData = {
  name: "",
  game: "",
  customGameName: "",
  gameId: null,
  format: "",
  formatName: "",
  scoringFields: [],
  startDate: "",
  teams: [],
  placementPoints: [...SCORING_PRESETS["Standard"]],
  killPoints: 1,
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  bestOf: 3,
};

const CUSTOM_SCORING_VALUE = "Custom";
const TEMPLATE_SCORING_PREFIX = "template:";

function normalizeScoringFormat(value?: string) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (normalized === "br" || normalized.includes("battle")) return "battle_royale";
  if (normalized === "tdm" || normalized.includes("elimination")) return "elimination";
  return normalized;
}

function scoringTemplateOptions(templates: ScoringRuleTemplate[], format?: string) {
  const normalizedFormat = normalizeScoringFormat(format);
  return [
    { label: CUSTOM_SCORING_VALUE, value: CUSTOM_SCORING_VALUE },
    ...templates
      .filter((template) => normalizeScoringFormat(template.format) === normalizedFormat)
      .map((template) => ({
        label: template.name,
        value: `${TEMPLATE_SCORING_PREFIX}${template.id}`,
      })),
  ];
}

function scoringTemplatePatch(template: ScoringRuleTemplate, data: EventData): Partial<EventData> {
  const placementPoints =
    template.placementPoints.length > 0
      ? [
          ...template.placementPoints,
          ...Array.from(
            { length: Math.max(0, data.placementPoints.length - template.placementPoints.length) },
            () => 0,
          ),
        ]
      : data.placementPoints;

  return {
    placementPoints,
    killPoints: template.killPointsPerKill,
    winPoints: template.winPoints,
    drawPoints: template.drawPoints,
    lossPoints: template.lossPoints,
  };
}

// --- Step 1: Event Details ---
function StepEventDetails({
  data,
  onChange,
  gameOptions,
  formatOptions,
  formatDisabled,
}: {
  data: EventData;
  onChange: (d: Partial<EventData>) => void;
  gameOptions: { label: string; value: string; icon?: ReactNode }[];
  formatOptions: { label: string; value: string }[];
  formatDisabled: boolean;
}) {
  return (
    <div className="space-y-6 pb-4">
      {/* Row 1: Name and Game in two columns */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">Event Name</label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Optional, auto names as Match 1"
            className="h-[40px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-4 text-[14px] text-[#000000] outline-none placeholder:text-[#b0b7c4] focus:border-[#999]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
            Game <span className="text-[#ef233c]">*</span>
          </label>
          <AppSearchSelect
            value={data.game}
            onChange={(value) => onChange({ game: value })}
            placeholder="Select a game"
            options={gameOptions}
          />
          <AnimatePresence initial={false}>
            {data.game === "Other" && (
              <motion.div
                initial={{ height: 0, opacity: 0, y: -6 }}
                animate={{ height: "auto", opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <input
                  type="text"
                  value={data.customGameName}
                  onChange={(e) => onChange({ customGameName: e.target.value })}
                  placeholder="Specify game name"
                  className="mt-3 h-[40px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-4 text-[14px] text-[#000000] outline-none placeholder:text-[#b0b7c4] focus:border-[#999]"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Row 2: Format and Date */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
            Tournament Format <span className="text-[#ef233c]">*</span>
          </label>
          <AppSelect
            value={data.format}
            onChange={(value) => onChange({ format: value as TournamentFormat })}
            options={formatOptions}
            placeholder={data.game ? "Select tournament format" : "Select a game first"}
            disabled={formatDisabled}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">Start Date</label>
          <AppDatePicker
            value={data.startDate}
            onChange={(date) => onChange({ startDate: date })}
            placeholder="Select start date"
          />
        </div>
      </div>
    </div>
  );
}

const processTeams = (teamsList: Team[]): Team[] => {
  return normalizeSlottedTeams(teamsList, "slotNumber");
};

// --- Step 2: Teams ---
function StepTeams({
  data,
  onChange,
  showAddModal,
  setShowAddModal,
  showBulkModal,
  setShowBulkModal,
  showExcelImportModal,
  setShowExcelImportModal,
}: {
  data: EventData;
  onChange: (d: Partial<EventData>) => void;
  showAddModal: boolean;
  setShowAddModal: (v: boolean) => void;
  showBulkModal: boolean;
  setShowBulkModal: (v: boolean) => void;
  showExcelImportModal: boolean;
  setShowExcelImportModal: (v: boolean) => void;
}) {
  const removeTeam = (id: string) => {
    onChange({ teams: data.teams.filter((t) => t.id !== id) });
  };

  return (
    <>
      <div className="flex h-full flex-col space-y-6">
        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex h-[36px] cursor-pointer items-center gap-2 rounded-[6px] bg-[#000000] px-4 text-[13px] font-medium text-white transition-all hover:bg-[#333]"
          >
            <Plus className="h-4 w-4" />
            Add team
          </button>
          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            className="flex h-[36px] cursor-pointer items-center gap-2 rounded-[6px] border border-[#e2e5ec] bg-white px-4 text-[13px] font-medium text-[#000000] transition-all hover:bg-[#f7f8fb]"
          >
            <Users className="h-4 w-4" />
            Bulk add
          </button>
          <button
            type="button"
            onClick={() => setShowExcelImportModal(true)}
            className="flex h-[36px] cursor-pointer items-center gap-2 rounded-[6px] border border-[#e2e5ec] bg-white px-4 text-[13px] font-medium text-[#000000] transition-all hover:bg-[#f7f8fb]"
          >
            <Import className="h-4 w-4" />
            Import excel
          </button>
        </div>

        {/* Team List */}
        <div className="flex-1 overflow-y-auto pr-2">
          {data.teams.length === 0 ? (
            <div className="flex h-[120px] items-center justify-center rounded-[8px] border border-dashed border-[#c8cdd5] bg-[#f9fbfc]">
              <p className="text-[13px] text-[#9aa1b0]">
                No teams added yet. Click 'Add team' to start.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-x-6 gap-y-4">
              {data.teams.map((team, i) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between rounded-[8px] border border-[#e2e5ec] bg-white p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-[#f0f1f3] text-[12px] font-semibold text-[#4b5563]">
                      {team.slotNumber || i + 1}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#000000]">{team.name}</p>
                      <p className="text-[11px] text-[#9aa1b0]">{team.players.length} Players</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTeam(team.id)}
                    className="cursor-pointer text-[#9aa1b0] hover:text-[#dc2626]"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AddTeamModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onAddTeam={(newTeam) => onChange({ teams: processTeams([...data.teams, newTeam]) })}
        showNotification={false}
        existingTeamNames={data.teams.map((t) => t.name)}
        sourceEventName={data.name.trim() || undefined}
      />

      <BulkAddTeamsModal
        open={showBulkModal}
        onOpenChange={setShowBulkModal}
        onAddTeams={(newTeams) => onChange({ teams: processTeams([...data.teams, ...newTeams]) })}
        existingTeamNames={data.teams.map((team) => team.name)}
        showNotification={false}
      />

      <TeamExcelImportModal
        open={showExcelImportModal}
        onOpenChange={setShowExcelImportModal}
        onImport={(newTeams) => onChange({ teams: processTeams([...data.teams, ...newTeams]) })}
      />
    </>
  );
}

// --- Step 3: Scoring Rules ---
function StepScoring({
  data,
  onChange,
  activeFormat,
}: {
  data: EventData;
  onChange: (d: Partial<EventData>) => void;
  activeFormat?: GameFormat;
}) {
  const [extraRows, setExtraRows] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState(CUSTOM_SCORING_VALUE);
  const [scoringTemplates, setScoringTemplates] = useState<ScoringRuleTemplate[]>([]);

  useEffect(() => {
    let cancelled = false;
    scoringRulesApi
      .getAll()
      .then((rules) => {
        if (!cancelled) setScoringTemplates(rules.map(apiScoringRuleToTemplate));
      })
      .catch(() => {
        if (!cancelled) setScoringTemplates([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const updatePlacement = (index: number, value: number) => {
    const pts = [...data.placementPoints];
    pts[index] = value;
    onChange({ placementPoints: pts });
    setSelectedPreset(CUSTOM_SCORING_VALUE);
  };

  const applyPreset = (presetValue: string) => {
    setSelectedPreset(presetValue);
    if (presetValue === CUSTOM_SCORING_VALUE) return;

    const templateId = presetValue.replace(TEMPLATE_SCORING_PREFIX, "");
    const template = scoringTemplates.find((item) => item.id === templateId);
    if (!template) return;

    onChange(scoringTemplatePatch(template, data));
    queue.add(
      {
        title: "Scoring template applied",
        description: `${template.name} scoring is now active.`,
        variant: "success",
      },
      { timeout: 3000 },
    );
  };

  const teamCount = Math.max(data.teams.length, 16) + extraRows;
  const placements = data.placementPoints.slice(0, teamCount);
  while (placements.length < teamCount) {
    placements.push(0);
  }

  const usesPlacement = formatUsesField(activeFormat, "placementPoints");
  const usesKills = formatUsesField(activeFormat, "killPoints");
  const usesWin = formatUsesField(activeFormat, "winPoints");
  const usesDraw = formatUsesField(activeFormat, "drawPoints");
  const usesLoss = formatUsesField(activeFormat, "lossPoints");
  const presetOptions = scoringTemplateOptions(scoringTemplates, activeFormat?.key || data.format);

  useEffect(() => {
    if (!presetOptions.some((option) => option.value === selectedPreset)) {
      setSelectedPreset(CUSTOM_SCORING_VALUE);
    }
  }, [presetOptions, selectedPreset]);

  if (usesPlacement || usesKills) {
    // Split placements into chunks of 10 to display in columns
    const columns = [];
    const chunkSize = 10;
    for (let i = 0; i < placements.length; i += chunkSize) {
      columns.push(placements.slice(i, i + chunkSize));
    }

    return (
      <div className="flex h-full flex-col space-y-6">
        {/* Top Controls: Kill Points & Preset */}
        <div className="grid grid-cols-2 gap-6">
          {usesKills && (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
                Points per Kill
              </label>
              <input
                type="number"
                min={0}
                value={data.killPoints}
                onChange={(e) => {
                  onChange({ killPoints: Number(e.target.value) });
                  setSelectedPreset(CUSTOM_SCORING_VALUE);
                }}
                className="h-[40px] w-full max-w-[120px] rounded-[8px] border border-[#e2e5ec] bg-white px-4 text-[14px] text-[#000000] outline-none focus:border-[#999]"
              />
            </div>
          )}
          {usesPlacement && (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
                Scoring Preset
              </label>
              <AppSelect value={selectedPreset} onChange={applyPreset} options={presetOptions} />
            </div>
          )}
        </div>

        {/* Placement Points Table in Multiple Columns */}
        {usesPlacement && (
          <div className="flex-1 overflow-y-auto">
            <label className="mb-2 block text-[13px] font-medium text-[#4b5563]">
              Placement Points
            </label>
            <div className="flex gap-6">
              {columns.map((col, colIndex) => (
                <div
                  key={colIndex}
                  className="flex-1 rounded-[8px] border border-[#e2e5ec] bg-white"
                >
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#e2e5ec] bg-[#f9fbfc]">
                        <th className="px-4 py-2.5 text-left text-[12px] font-medium text-[#9aa1b0]">
                          Position
                        </th>
                        <th className="px-4 py-2.5 text-left text-[12px] font-medium text-[#9aa1b0]">
                          Points
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {col.map((pts, i) => {
                        const absoluteIndex = colIndex * chunkSize + i;
                        return (
                          <tr
                            key={absoluteIndex}
                            className="border-b border-[#f0f1f3] last:border-0"
                          >
                            <td className="px-4 py-2 text-[13px] text-[#4b5563]">
                              {absoluteIndex === 0
                                ? "🥇 1st Place"
                                : absoluteIndex === 1
                                  ? "🥈 2nd Place"
                                  : absoluteIndex === 2
                                    ? "🥉 3rd Place"
                                    : `${absoluteIndex + 1}th Place`}
                            </td>
                            <td className="px-4 py-1.5">
                              <input
                                type="number"
                                min={0}
                                value={pts}
                                onChange={(e) =>
                                  updatePlacement(absoluteIndex, Number(e.target.value))
                                }
                                className="h-[32px] w-[64px] rounded-[6px] border border-[#e2e5ec] bg-[#f9fbfc] px-2 text-center text-[13px] text-[#000000] outline-none focus:border-[#999] focus:bg-white"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => setExtraRows((prev) => prev + 1)}
                className="flex cursor-pointer items-center gap-1.5 text-[13px] font-medium text-[#000000] hover:text-[#666666]"
              >
                <span className="text-[16px] leading-none">+</span> Add 1 more row
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Elimination format
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
            Scoring Preset
          </label>
          <AppSelect value={selectedPreset} onChange={applyPreset} options={presetOptions} />
        </div>
        {usesWin && (
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
              Win Points
            </label>
            <input
              type="number"
              min={0}
              value={data.winPoints}
              onChange={(e) => {
                onChange({ winPoints: Number(e.target.value) });
                setSelectedPreset(CUSTOM_SCORING_VALUE);
              }}
              className="h-[40px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-4 text-[14px] text-[#000000] outline-none focus:border-[#999]"
            />
          </div>
        )}
        {usesDraw && (
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
              Draw Points
            </label>
            <input
              type="number"
              min={0}
              value={data.drawPoints}
              onChange={(e) => {
                onChange({ drawPoints: Number(e.target.value) });
                setSelectedPreset(CUSTOM_SCORING_VALUE);
              }}
              className="h-[40px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-4 text-[14px] text-[#000000] outline-none focus:border-[#999]"
            />
          </div>
        )}
        {usesLoss && (
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
              Loss Points
            </label>
            <input
              type="number"
              min={0}
              value={data.lossPoints}
              onChange={(e) => {
                onChange({ lossPoints: Number(e.target.value) });
                setSelectedPreset(CUSTOM_SCORING_VALUE);
              }}
              className="h-[40px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-4 text-[14px] text-[#000000] outline-none focus:border-[#999]"
            />
          </div>
        )}
      </div>

      <div>
        <label className="mb-2 block text-[13px] font-medium text-[#4b5563]">Best of</label>
        <div className="flex gap-2">
          {[1, 3, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ bestOf: n })}
              className={`h-[36px] min-w-[64px] rounded-[6px] border text-[13px] font-medium transition-all ${
                data.bestOf === n
                  ? "border-[#000000] bg-[#000000] text-white"
                  : "border-[#e2e5ec] bg-white text-[#666666] hover:border-[#ccc]"
              }`}
            >
              Bo{n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Progress Bar ---
function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-[3px] flex-1 rounded-full transition-all ${
            i < current ? "bg-[#000000]" : "bg-[#e2e5ec]"
          }`}
        />
      ))}
    </div>
  );
}

// --- Main Modal ---
export function CreateEventModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [data, setData] = useState<EventData>({ ...initialEventData });
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const [games, setGames] = useState<CatalogGame[]>([]);
  const [gameOptions, setGameOptions] = useState<
    { label: string; value: string; icon?: React.ReactNode }[]
  >([]);

  useEffect(() => {
    if (!open) return;
    catalogApi
      .getGames()
      .then((games) => {
        const catalogGames = apiGamesToCodeCatalogGames(games);
        setGames(catalogGames);
        setGameOptions(
          getGameNameOptions(catalogGames).map((name) => {
            const game = catalogGames.find((item) => item.name === name);
            return {
              label: name,
              value: name,
              icon: game ? (
                <GameIcon
                  name={game.name}
                  logo={game.logoLight || game.logoDark || game.logo}
                  size="dropdown"
                />
              ) : undefined,
            };
          }),
        );
      })
      .catch((err) => {
        setGameOptions([{ label: "Other", value: "Other" }]);
        queue.add(
          {
            title: "Could not load games",
            description: err instanceof Error ? err.message : "Unknown error",
            variant: "error",
          },
          { timeout: 5000 },
        );
      });
  }, [open]);

  const update = (partial: Partial<EventData>) => setData((prev) => ({ ...prev, ...partial }));

  const selectedGame = games.find((game) => game.name === data.game);
  const allCodeFormats = getAllCodeDefinedFormats();
  const dedupeFormats = (formats: GameFormat[]) => {
    const seen = new Set<string>();
    return formats.filter((format) => {
      const key = String(format.key || "")
        .trim()
        .toLowerCase();
      const name = String(format.name || "")
        .trim()
        .toLowerCase();
      const dedupeKey = key || name;
      if (!dedupeKey || seen.has(dedupeKey) || (name && seen.has(name))) return false;
      seen.add(dedupeKey);
      if (name) seen.add(name);
      return true;
    });
  };
  const activeFormats =
    data.game === "Other"
      ? dedupeFormats(allCodeFormats)
      : selectedGame
        ? dedupeFormats(selectedGame.formats)
        : [];
  const activeFormat = activeFormats.find((format) => format.key === data.format);
  const formatOptions = activeFormats.map((format) => ({ label: format.name, value: format.key }));
  const formatDisabled = !data.game || formatOptions.length === 0;

  const updateEventDetails = (partial: Partial<EventData>) => {
    if (partial.game !== undefined) {
      const game = games.find((item) => item.name === partial.game);
      update({
        ...partial,
        customGameName: partial.game === "Other" ? data.customGameName : "",
        gameId: game?.id ?? null,
        format: "",
        formatName: "",
        scoringFields: [],
      });
      return;
    }

    if (partial.format !== undefined) {
      const nextFormat = activeFormats.find((format) => format.key === partial.format);
      update({
        ...partial,
        formatName: nextFormat?.name ?? partial.format,
        scoringFields: nextFormat?.scoringFields ?? defaultFieldsForFormat(partial.format),
      });
      return;
    }

    update(partial);
  };

  const canContinue = () => {
    if (step === 1) {
      return Boolean(
        data.game && (data.game !== "Other" || data.customGameName.trim()) && data.format,
      );
    }
    return true;
  };

  const handleClose = () => {
    const hasData = data.name.trim() || data.game || data.customGameName.trim() || data.format;
    if (hasData) {
      setShowDraftPrompt(true);
    } else {
      resetAndClose();
    }
  };

  const resetAndClose = () => {
    setStep(1);
    setDirection(1);
    setData({ ...initialEventData });
    setShowDraftPrompt(false);
    onOpenChange(false);
  };

  const handleCreate = async () => {
    try {
      const resolvedGameName = data.game === "Other" ? data.customGameName.trim() : data.game;
      const eventName = data.name.trim();
      const createdEvent = await eventsApi.createWithSetup({
        event: {
          name: eventName,
          gameId: data.game === "Other" ? null : data.gameId,
          game: resolvedGameName,
          format: data.formatName || data.format,
          startDate: data.startDate || undefined,
          status: "Draft",
        },
        scoringRule: {
          name: eventName ? `${eventName} Scoring` : "",
          format: data.format || "battle_royale",
          gameId: data.game === "Other" ? null : data.gameId,
          gameName: resolvedGameName,
          isGeneric: data.game === "Other" || !data.gameId,
          scoringFields: data.scoringFields,
          description: "Created with event wizard",
          killPoints: data.killPoints,
          winPoints: data.winPoints,
          drawPoints: data.drawPoints,
          lossPoints: data.lossPoints,
          placementPoints: placementArrayToMap(data.placementPoints),
        },
        teams: data.teams.map((team) => ({
          id: team.id,
          name: team.name,
          logo: team.logo,
          tags: team.tags,
          contactMobile: team.contactMobile,
          addToDatabase: team.addToDatabase,
          players: team.players,
        })),
      });

      queue.add(
        {
          title: "Event Created",
          description: `${createdEvent.name} has been set up successfully.`,
          variant: "success",
        },
        { timeout: 5000 },
      );

      window.dispatchEvent(new CustomEvent("esports:events-changed"));
      resetAndClose();
      navigate({ to: "/events/$eventId", params: { eventId: createdEvent._id } });
    } catch (err) {
      queue.add(
        {
          title: "Could not create event",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "error",
        },
        { timeout: 6000 },
      );
    }
  };

  const handleNext = useCallback(() => {
    if (step === 1 && !canContinue()) {
      queue.add(
        {
          title: "Missing event details",
          description: "Select a game and format before continuing.",
          variant: "error",
        },
        { timeout: 4000 },
      );
      return;
    }

    if (step < 3) {
      setDirection(1);
      setStep((s) => (s + 1) as Step);
    } else if (step === 3) {
      handleCreate();
    }
  }, [step, data.name, data.game, data.customGameName, data.format, handleCreate]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (step === 2 && ["n", "b", "i"].includes(e.key.toLowerCase()) && !isTyping) {
        if (showAddTeamModal || showBulkAddModal || showExcelImportModal) return;
        e.preventDefault();
        const key = e.key.toLowerCase();
        if (key === "n") setShowAddTeamModal(true);
        if (key === "b") setShowBulkAddModal(true);
        if (key === "i") setShowExcelImportModal(true);
        return;
      }

      if (e.key === "Enter" && e.ctrlKey) {
        // If sub-modals are open, they handle their own Ctrl+Enter
        if (showAddTeamModal || showBulkAddModal || showExcelImportModal) return;

        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, step, handleNext, showAddTeamModal, showBulkAddModal, showExcelImportModal]);

  const STEP_META: Record<Step, { title: string; subtitle: string }> = {
    1: { title: "Event Details", subtitle: "Set up the basics for your tournament" },
    2: { title: "Teams", subtitle: "Add teams that will be competing" },
    3: { title: "Scoring Rules", subtitle: "Define how points are calculated" },
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      <DialogContent
        onEscapeKeyDown={(event) => {
          if (showExcelImportModal) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (showExcelImportModal) event.preventDefault();
        }}
        className="flex h-[85vh] w-[90vw] max-w-[1280px] flex-col gap-0 overflow-hidden rounded-[16px] border border-[#e2e5ec] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.12)]"
      >
        <DialogTitle className="sr-only">Create Event</DialogTitle>

        {/* Draft prompt overlay */}
        <AnimatePresence>
          {showDraftPrompt && (
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
                <p className="text-[16px] font-medium text-[#000000]">Discard this event?</p>
                <p className="text-[14px] text-[#9aa1b0]">Your progress will be lost.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDraftPrompt(false)}
                    className="h-[38px] cursor-pointer rounded-[8px] border border-[#e2e5ec] bg-white px-5 text-[14px] font-medium text-[#666666] transition-colors hover:bg-[#f7f8fb]"
                  >
                    Keep editing
                  </button>
                  <button
                    onClick={resetAndClose}
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
        <div className="border-b border-[#f0f1f3] px-8 pb-5 pt-10">
          <StepProgress current={step} total={3} />
          <h2 className="mt-5 text-[20px] font-semibold text-[#000000]">{STEP_META[step].title}</h2>
          <p className="mt-1 text-[14px] text-[#9aa1b0]">{STEP_META[step].subtitle}</p>
        </div>

        {/* Body */}
        <div className="relative flex-1 overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={{
                enter: (d: number) => ({ x: d * 40, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (d: number) => ({ x: d * -40, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="h-full overflow-y-auto px-8 pb-8 pt-10"
            >
              {step === 1 && (
                <StepEventDetails
                  data={data}
                  onChange={updateEventDetails}
                  gameOptions={gameOptions}
                  formatOptions={formatOptions}
                  formatDisabled={formatDisabled}
                />
              )}
              {step === 2 && (
                <StepTeams
                  data={data}
                  onChange={update}
                  showAddModal={showAddTeamModal}
                  setShowAddModal={setShowAddTeamModal}
                  showBulkModal={showBulkAddModal}
                  setShowBulkModal={setShowBulkAddModal}
                  showExcelImportModal={showExcelImportModal}
                  setShowExcelImportModal={setShowExcelImportModal}
                />
              )}
              {step === 3 && (
                <StepScoring data={data} onChange={update} activeFormat={activeFormat} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#f0f1f3] px-8 py-4">
          <button
            onClick={() => {
              if (step > 1) {
                setDirection(-1);
                setStep((s) => (s - 1) as Step);
              }
            }}
            className={`flex h-[36px] cursor-pointer items-center gap-2 rounded-[6px] border border-[#e2e5ec] px-4 text-[13px] font-medium text-[#666666] transition-all hover:bg-[#f7f8fb] ${
              step === 1 ? "invisible" : ""
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {step < 3 ? (
            <button
              onClick={handleNext}
              className="flex h-[36px] cursor-pointer items-center gap-2 rounded-[6px] bg-[#000000] px-5 text-[13px] font-medium text-white transition-all hover:bg-[#333]"
            >
              Continue
              <div className="flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">
                Ctrl + <CornerDownLeft className="h-3 w-3" />
              </div>
            </button>
          ) : (
            <button
              onClick={handleCreate}
              className="flex h-[36px] cursor-pointer items-center gap-2 rounded-[6px] bg-[#000000] px-5 text-[13px] font-medium text-white transition-all hover:bg-[#333]"
            >
              Create Event
              <div className="flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">
                Ctrl + <CornerDownLeft className="h-3 w-3" />
              </div>
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
