export type ScoringFieldKey =
  | "placementPoints"
  | "killPoints"
  | "winPoints"
  | "drawPoints"
  | "lossPoints";

export type GameFormat = {
  name: string;
  key: string;
  scoringFields: ScoringFieldKey[];
};

export const CODE_DEFINED_FORMATS: Record<string, GameFormat> = {
  battle_royale: {
    name: "Battle Royale",
    key: "battle_royale",
    scoringFields: ["placementPoints", "killPoints"],
  },
  clash_squad: {
    name: "Clash Squad",
    key: "clash_squad",
    scoringFields: ["winPoints", "drawPoints", "lossPoints"],
  },
  tdm: {
    name: "TDM",
    key: "tdm",
    scoringFields: ["winPoints", "drawPoints", "lossPoints"],
  },
};

export const DEFAULT_SCORING_FIELDS: Record<string, ScoringFieldKey[]> = {
  battle_royale: ["placementPoints", "killPoints"],
  clash_squad: ["winPoints", "drawPoints", "lossPoints"],
  elimination: ["winPoints", "drawPoints", "lossPoints"],
  tdm: ["winPoints", "drawPoints", "lossPoints"],
};

export function slugifyFormat(value: string) {
  const key = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return key || "custom_format";
}

export function inferFormatKey(name: string) {
  const normalized = name.toLowerCase();
  if (
    normalized.includes("battle") ||
    normalized.includes("classic") ||
    normalized.includes("br")
  ) {
    return "battle_royale";
  }
  if (
    normalized.includes("tdm") ||
    normalized.includes("clash") ||
    normalized.includes("elimination") ||
    normalized.includes("5v5") ||
    normalized.includes("competitive")
  ) {
    return "elimination";
  }
  return slugifyFormat(name);
}

export function defaultFieldsForFormat(key: string): ScoringFieldKey[] {
  return [...(DEFAULT_SCORING_FIELDS[key] || DEFAULT_SCORING_FIELDS.elimination)];
}

export function getAllCodeDefinedFormats(): GameFormat[] {
  return Object.values(CODE_DEFINED_FORMATS).map((format) => ({
    ...format,
    scoringFields: [...format.scoringFields],
  }));
}

export function getCodeDefinedFormatsForGame(gameName: string): GameFormat[] {
  const normalized = gameName.trim().toLowerCase();
  const isBgmi =
    normalized.includes("bgmi") ||
    normalized.includes("pubg") ||
    normalized.includes("battlegrounds mobile india");
  const isFreeFire = normalized.includes("free fire") || normalized.includes("freefire");

  if (isBgmi) {
    return [CODE_DEFINED_FORMATS.battle_royale, CODE_DEFINED_FORMATS.tdm].map((format) => ({
      ...format,
      scoringFields: [...format.scoringFields],
    }));
  }

  if (isFreeFire) {
    return [CODE_DEFINED_FORMATS.battle_royale, CODE_DEFINED_FORMATS.clash_squad].map((format) => ({
      ...format,
      scoringFields: [...format.scoringFields],
    }));
  }

  return [];
}

export function normalizeGameFormats(input?: GameFormat[], legacyModes: string[] = []): GameFormat[] {
  const formats = Array.isArray(input) ? input : [];
  if (formats.length > 0) {
    return formats
      .map((format) => {
        const name = String(format.name || "").trim();
        const key = String(format.key || inferFormatKey(name)).trim();
        return {
          name,
          key,
          scoringFields:
            Array.isArray(format.scoringFields) && format.scoringFields.length > 0
              ? format.scoringFields
              : defaultFieldsForFormat(key),
        };
      })
      .filter((format) => format.name && format.key);
  }

  return legacyModes.map((mode) => {
    const key = inferFormatKey(mode);
    return {
      name: mode,
      key,
      scoringFields: defaultFieldsForFormat(key),
    };
  });
}

export function formatUsesField(format: GameFormat | undefined, field: ScoringFieldKey) {
  return Boolean(format?.scoringFields.includes(field));
}
