import type { ScoringFieldKey } from "@/lib/tournament-formats";

export type ScoringRuleFormat = string;

export type ScoringRuleTemplate = {
  id: string;
  name: string;
  description: string;
  format: ScoringRuleFormat;
  gameId?: string | null;
  gameName?: string;
  isGeneric?: boolean;
  scoringFields?: ScoringFieldKey[];
  isBuiltIn: boolean;
  /** Published by platform admin; visible to all organizers. */
  isPlatform?: boolean;
  placementPoints: number[];
  killPointsPerKill: number;
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
  updatedAt: string;
};

export type ScoringRuleDraft = Omit<ScoringRuleTemplate, "id" | "isBuiltIn" | "updatedAt">;

const BR_STANDARD = [
  15, 12, 10, 8, 6, 5, 4, 3, 2, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0,
];
const BR_AGGRESSIVE = [10, 6, 5, 4, 3, 2, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const BR_ALGS = [12, 9, 7, 5, 4, 3, 3, 2, 2, 2, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0];
const BR_TOP_HEAVY = [20, 16, 13, 10, 8, 6, 4, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

export const BUILTIN_SCORING_TEMPLATES: ScoringRuleTemplate[] = [
  {
    id: "builtin-standard",
    name: "Standard",
    description: "Balanced placement spread for typical squad battle royale events.",
    format: "battle_royale",
    isGeneric: true,
    scoringFields: ["placementPoints", "killPoints"],
    isBuiltIn: true,
    placementPoints: [...BR_STANDARD],
    killPointsPerKill: 1,
    winPoints: 0,
    drawPoints: 0,
    lossPoints: 0,
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "builtin-aggressive",
    name: "Aggressive",
    description: "Flatter placement curve that rewards frags and mid-pack finishes.",
    format: "battle_royale",
    isGeneric: true,
    scoringFields: ["placementPoints", "killPoints"],
    isBuiltIn: true,
    placementPoints: [...BR_AGGRESSIVE],
    killPointsPerKill: 1,
    winPoints: 0,
    drawPoints: 0,
    lossPoints: 0,
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "builtin-algs",
    name: "ALGS",
    description: "Apex Legends Global Series style placement distribution.",
    format: "battle_royale",
    isGeneric: true,
    scoringFields: ["placementPoints", "killPoints"],
    isBuiltIn: true,
    placementPoints: [...BR_ALGS],
    killPointsPerKill: 1,
    winPoints: 0,
    drawPoints: 0,
    lossPoints: 0,
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "builtin-top-heavy",
    name: "Top Heavy",
    description: "Winner-takes-more scoring for high-stakes grand finals.",
    format: "battle_royale",
    isGeneric: true,
    scoringFields: ["placementPoints", "killPoints"],
    isBuiltIn: true,
    placementPoints: [...BR_TOP_HEAVY],
    killPointsPerKill: 1,
    winPoints: 0,
    drawPoints: 0,
    lossPoints: 0,
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "builtin-elim-classic",
    name: "Classic Elimination",
    description: "Standard win / draw / loss points for round-robin or brackets.",
    format: "elimination",
    isGeneric: true,
    scoringFields: ["winPoints", "drawPoints", "lossPoints"],
    isBuiltIn: true,
    placementPoints: [],
    killPointsPerKill: 0,
    winPoints: 3,
    drawPoints: 1,
    lossPoints: 0,
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "builtin-elim-swiss",
    name: "Swiss (2-1-0)",
    description: "Common Swiss-system scoring with no draw incentive.",
    format: "elimination",
    isGeneric: true,
    scoringFields: ["winPoints", "drawPoints", "lossPoints"],
    isBuiltIn: true,
    placementPoints: [],
    killPointsPerKill: 0,
    winPoints: 2,
    drawPoints: 1,
    lossPoints: 0,
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

export function formatLabel(format: ScoringRuleFormat) {
  if (format === "battle_royale") return "Battle Royale";
  if (format === "elimination") return "Elimination";
  return format
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function placementLabel(index: number) {
  if (index === 0) return "1st";
  if (index === 1) return "2nd";
  if (index === 2) return "3rd";
  return `${index + 1}th`;
}

export function trimPlacementPoints(points: number[]) {
  let end = points.length;
  while (end > 1 && points[end - 1] === 0) end -= 1;
  return points.slice(0, Math.max(end, 1));
}

export function getTemplateSummary(template: ScoringRuleTemplate) {
  if (template.format === "elimination") {
    return `Win ${template.winPoints} · Draw ${template.drawPoints} · Loss ${template.lossPoints}`;
  }
  const top = template.placementPoints.slice(0, 3);
  const parts = top.map((pts, i) => `${placementLabel(i)} ${pts}`).join(" · ");
  return `${parts} · ${template.killPointsPerKill} pt/kill`;
}

export function loadCustomTemplates(): ScoringRuleTemplate[] {
  return [];
}

export function saveCustomTemplates(_templates: ScoringRuleTemplate[]) {
  return;
}

export function loadPlatformTemplates(): ScoringRuleTemplate[] {
  return [];
}

export function savePlatformTemplates(_templates: ScoringRuleTemplate[]) {
  return;
}

export function draftToPlatformTemplate(draft: ScoringRuleDraft, id?: string): ScoringRuleTemplate {
  return {
    ...draftToTemplate(draft, id),
    isPlatform: true,
    isBuiltIn: false,
  };
}

export function createTemplateId() {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function cloneAsCustomDraft(
  source: ScoringRuleTemplate,
  name?: string,
): ScoringRuleDraft {
  return {
    name: name ?? `${source.name} (Copy)`,
    description: source.description,
    format: source.format,
    gameId: source.gameId || null,
    gameName: source.gameName || "",
    isGeneric: source.isGeneric !== false,
    scoringFields: source.scoringFields ? [...source.scoringFields] : undefined,
    placementPoints: [...source.placementPoints],
    killPointsPerKill: source.killPointsPerKill,
    winPoints: source.winPoints,
    drawPoints: source.drawPoints,
    lossPoints: source.lossPoints,
  };
}

export function draftToTemplate(draft: ScoringRuleDraft, id?: string): ScoringRuleTemplate {
  return {
    id: id ?? createTemplateId(),
    ...draft,
    placementPoints:
      draft.scoringFields?.includes("placementPoints") || draft.format === "battle_royale"
        ? trimPlacementPoints(draft.placementPoints)
        : [],
    isBuiltIn: false,
    updatedAt: new Date().toISOString(),
  };
}

export const EMPTY_BR_DRAFT: ScoringRuleDraft = {
  name: "",
  description: "",
  format: "battle_royale",
  gameId: null,
  gameName: "",
  isGeneric: true,
  scoringFields: ["placementPoints", "killPoints"],
  placementPoints: [15, 12, 10, 8, 6, 4, 2, 1],
  killPointsPerKill: 1,
  winPoints: 0,
  drawPoints: 0,
  lossPoints: 0,
};

export const EMPTY_ELIM_DRAFT: ScoringRuleDraft = {
  name: "",
  description: "",
  format: "elimination",
  gameId: null,
  gameName: "",
  isGeneric: true,
  scoringFields: ["winPoints", "drawPoints", "lossPoints"],
  placementPoints: [],
  killPointsPerKill: 0,
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
};
