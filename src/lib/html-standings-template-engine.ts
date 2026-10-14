import { PREMIUM_BATTLE_ROYALE_STANDINGS_TEMPLATE } from "./premium-standings-template-document";
import { PREMIUM_2_BATTLE_ROYALE_STANDINGS_TEMPLATE } from "./premium-2-standings-template-document";

export const STANDINGS_TEMPLATE_WIDTH = 1122;
export const STANDINGS_TEMPLATE_HEIGHT = 1402;
export const STANDINGS_TEMPLATE_ROOT = "/Templates/Finalized/premium-battle-royale-standings-template";
const LEGACY_STANDINGS_TEMPLATE_ROOT = "/Templates/Finalized/battle-royale-points-template";

export const HTML_TEMPLATE_STORAGE_KEY = "template-studio:html-documents:v1";

export type StandingsExportView = "overall" | "single-match" | "till-match";
export type StandingsTemplateSocialPlatform = "instagram" | "facebook" | "discord" | "youtube";
export type StandingsTemplateVisibleSocials = Record<StandingsTemplateSocialPlatform, boolean>;

export type StandingsTemplateRow = {
  slot: number | string;
  team: string;
  teamLogoSrc?: string | null;
  wins: number | string;
  killPoints: number | string;
  placementPoints: number | string;
  totalPoints: number | string;
};

export type PercentBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TemplateColor =
  | string
  | "accent"
  | "accentReadable"
  | "hueDark"
  | "hueBright"
  | "text"
  | "muted"
  | "white"
  | "black";

export type TemplateBinding =
  | "gameLogo"
  | "mapImage"
  | "mapName"
  | "eventName"
  | "matchLabel"
  | "matchValue"
  | "forMatchLabel"
  | "tillMatchLabel"
  | "finalMatchLabel"
  | "organizerLogo"
  | "organizerFirstName"
  | "organizerLastName"
  | "socials";

export type TemplateLayerBase = {
  id: string;
  name: string;
  kind: "shape" | "image" | "text" | "logo" | "table" | "socials";
  box: PercentBox;
  zIndex: number;
  visible: boolean;
  locked?: boolean;
  binding?: TemplateBinding;
};

export type ShapeLayer = TemplateLayerBase & {
  kind: "shape";
  fill: TemplateColor;
  opacity?: number;
  radius?: number;
  borderColor?: TemplateColor;
  borderWidth?: number;
  blur?: number;
  shadow?: string;
};

export type ImageLayer = TemplateLayerBase & {
  kind: "image";
  src: string;
  fit?: "cover" | "contain" | "stretch";
  tint?: "accent" | "accentHalf";
  variant?: "rightFade" | "none";
  opacity?: number;
  hueSource?: number;
};

export type TextLayer = TemplateLayerBase & {
  kind: "text";
  text: string;
  fill: TemplateColor;
  fontFamily: string;
  fontWeight: string;
  fontSizePct: number;
  lineHeight?: number;
  letterSpacingPct?: number;
  align?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  uppercase?: boolean;
  shownWhen?: StandingsExportView[];
  hiddenWhen?: StandingsExportView[];
};

export type LogoLayer = TemplateLayerBase & {
  kind: "logo";
  fallbackText?: string;
  fill?: TemplateColor;
  textColor?: TemplateColor;
  radius?: number;
  fit?: "cover" | "contain";
};

export type TableColumnKey = "slot" | "team" | "wins" | "kills" | "placement" | "total";

export type TableLayer = TemplateLayerBase & {
  kind: "table";
  variant?: "template2Leaderboard";
  columns: Array<{ key: TableColumnKey; label: string; widthPct: number; icon?: "team" | "kills" | "placement" | "star" | "winsLogo" }>;
  rowCount: number;
  headerHeightPct: number;
  radius?: number;
  headerFill: TemplateColor;
  slotFill: TemplateColor;
  totalFill: TemplateColor;
  bodyFill: TemplateColor;
  bodyAltFill?: TemplateColor;
  rowSeparator: TemplateColor;
  columnSeparator: TemplateColor;
  headerTextColor: TemplateColor;
  bodyTextColor: TemplateColor;
  slotTextColor: TemplateColor;
  totalTextColor: TemplateColor;
  fontFamily: string;
  bodyFontWeight: string;
  headerFontFamily: string;
  headerFontWeight: string;
};

export type SocialsLayer = TemplateLayerBase & {
  kind: "socials";
  handle: string;
  variant?: "compact" | "platformBar";
  instagramHandle?: string;
  facebookHandle?: string;
  discordHandle?: string;
  youtubeHandle?: string;
  fill: TemplateColor;
  textColor: TemplateColor;
  fontFamily: string;
  fontWeight: string;
  fontSizePct?: number;
};

export type TemplateLayer = ShapeLayer | ImageLayer | TextLayer | LogoLayer | TableLayer | SocialsLayer;

export type TemplateDocument = {
  id: string;
  name: string;
  version: number;
  width: number;
  height: number;
  ratioLabel: string;
  category: string;
  format: string;
  background: string;
  defaultAccent: string;
  layers: TemplateLayer[];
};

export const DEFAULT_VISIBLE_SOCIALS: StandingsTemplateVisibleSocials = {
  instagram: true,
  facebook: true,
  discord: true,
  youtube: true,
};

export const FREE_FIRE_MAPS = ["Bermuda", "Purgatory", "Kalahari", "Nexterra", "Alpine"] as const;
export const BGMI_MAPS = ["Erangel", "Miramar", "Sanhok", "Vikendi", "Karakin", "Taego", "Deston", "Rondo"] as const;

export function getStandingsTemplateGameKind(gameName?: string | null): "free-fire" | "bgmi" {
  const normalized = (gameName || "").toLowerCase();
  if (normalized.includes("bgmi") || normalized.includes("pubg") || normalized.includes("battlegrounds")) return "bgmi";
  return "free-fire";
}

export function getStandingsTemplateMapOptions(gameName?: string | null) {
  const maps = getStandingsTemplateGameKind(gameName) === "bgmi" ? BGMI_MAPS : FREE_FIRE_MAPS;
  return maps.map((map) => ({ label: map, value: map }));
}

export const HTML_STARTER_LEADERBOARD_TEMPLATE: TemplateDocument = {
  id: "html-blank-canvas-template",
  name: "Blank Canvas",
  version: 2,
  width: STANDINGS_TEMPLATE_WIDTH,
  height: STANDINGS_TEMPLATE_HEIGHT,
  ratioLabel: "4:5",
  category: "Leaderboard",
  format: "Battle Royale",
  background: "#f6f7fa",
  defaultAccent: "#ff6a00",
  layers: [],
};

export const LEGACY_BATTLE_ROYALE_POINTS_TEMPLATE: TemplateDocument = {
  id: "battle-royale-points-template",
  name: "Battle Royale Points Template",
  version: 2,
  width: STANDINGS_TEMPLATE_WIDTH,
  height: STANDINGS_TEMPLATE_HEIGHT,
  ratioLabel: "4:5",
  category: "Leaderboard",
  format: "Battle Royale",
  background: "#000000",
  defaultAccent: "#ff6a00",
  layers: [
    {
      id: "legacy-base",
      name: "Base",
      kind: "image",
      src: `${LEGACY_STANDINGS_TEMPLATE_ROOT}/Base.png`,
      fit: "stretch",
      box: { x: 0, y: 0, width: 100, height: 100 },
      zIndex: 0,
      visible: true,
      locked: true,
    },
    {
      id: "legacy-table",
      name: "Standings Table",
      kind: "table",
      box: { x: 6.24, y: 29.96, width: 87.52, height: 54.21 },
      zIndex: 10,
      visible: true,
      locked: true,
      columns: [
        { key: "slot", label: "Slot No.", widthPct: 12 },
        { key: "team", label: "Team Name", widthPct: 30 },
        { key: "wins", label: "Wins", widthPct: 10 },
        { key: "kills", label: "Kill Points", widthPct: 14 },
        { key: "placement", label: "Placement Points", widthPct: 18 },
        { key: "total", label: "Total Points", widthPct: 16 },
      ],
      rowCount: 16,
      headerHeightPct: 6.32,
      radius: 1,
      headerFill: "accent",
      slotFill: "transparent",
      totalFill: "transparent",
      bodyFill: "rgba(0,0,0,0.62)",
      rowSeparator: "accent",
      columnSeparator: "accent",
      headerTextColor: "white",
      bodyTextColor: "white",
      slotTextColor: "white",
      totalTextColor: "white",
      fontFamily: "Plus Jakarta Sans",
      bodyFontWeight: "700",
      headerFontFamily: "Plus Jakarta Sans",
      headerFontWeight: "800",
    },
    {
      id: "legacy-logo",
      name: "Organizer Logo",
      kind: "logo",
      binding: "organizerLogo",
      fallbackText: "YOUR\nLOGO",
      fill: "black",
      textColor: "white",
      radius: 0,
      fit: "contain",
      box: { x: 43.32, y: 5.99, width: 13.37, height: 10.7 },
      zIndex: 20,
      visible: true,
      locked: true,
    },
    {
      id: "legacy-powered",
      name: "Powered By",
      kind: "text",
      text: "POWERED BY",
      fill: "accent",
      fontFamily: "Plus Jakarta Sans",
      fontWeight: "800",
      fontSizePct: 1.35,
      align: "left",
      verticalAlign: "middle",
      uppercase: true,
      box: { x: 34.4, y: 89.02, width: 13.37, height: 2.43 },
      zIndex: 30,
      visible: true,
      locked: true,
    },
    {
      id: "legacy-brand-logo",
      name: "Brand Logo",
      kind: "image",
      src: `${LEGACY_STANDINGS_TEMPLATE_ROOT}/new-logo.png`,
      fit: "contain",
      box: { x: 48.66, y: 88.59, width: 16.93, height: 3.28 },
      zIndex: 31,
      visible: true,
      locked: true,
    },
  ],
};

export const BUILT_IN_HTML_STANDINGS_TEMPLATES: TemplateDocument[] = [
  PREMIUM_2_BATTLE_ROYALE_STANDINGS_TEMPLATE,
  PREMIUM_BATTLE_ROYALE_STANDINGS_TEMPLATE as unknown as TemplateDocument,
  LEGACY_BATTLE_ROYALE_POINTS_TEMPLATE,
  HTML_STARTER_LEADERBOARD_TEMPLATE,
];

function isTemplateDocument(value: unknown): value is TemplateDocument {
  return Boolean(
    value &&
      typeof value === "object" &&
      "id" in value &&
      "name" in value &&
      "layers" in value &&
      Array.isArray((value as TemplateDocument).layers),
  );
}

export function getStoredHtmlTemplates(): TemplateDocument[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HTML_TEMPLATE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const templates = Array.isArray(parsed) ? parsed.filter(isTemplateDocument) : [];
    return templates.map((t) => {
      let nextTemplate = t.background === "#ffffff" ? { ...t, background: "#f6f7fa" } : t;
      const nextLayers = nextTemplate.layers.map((layer) => {
        if (layer.id === "premium-2-frame" || layer.name === "Frame") {
          return { ...layer, zIndex: 3 };
        }
        if (layer.id === "premium-2-dividers" || layer.name === "Dividers") {
          return { ...layer, zIndex: 4 };
        }
        if (layer.id === "premium-2-branding-frame" || layer.name === "Branding Esportific") {
          return { ...layer, zIndex: 4 };
        }
        if (layer.id === "premium-2-table-border" || layer.name === "Table Border") {
          return {
            ...layer,
            zIndex: 2,
            box: { ...layer.box, y: -2.6 },
          };
        }
        if (layer.id === "template-2-leaderboard-table" || layer.name === "Leaderboard Table") {
          return {
            ...layer,
            headerFontWeight: "700",
            box: { ...layer.box, y: 27.7 },
          };
        }
        if (layer.id === "premium-2-powered-by" || layer.name === "Powered By") {
          return {
            ...layer,
            fontSizePct: 1.05,
            box: { x: 11.0, y: 94.3, width: 24, height: 3.4 },
          };
        }
        if (layer.id === "template-2-social-bar" || layer.name === "Social Bar") {
          return {
            ...layer,
            box: { x: 5.2, y: 20.1, width: 50.1, height: 2.7 },
          };
        }
        if (layer.id === "premium-2-event-name" || layer.name === "Event Name") {
          return {
            ...layer,
            fontWeight: "800",
          };
        }
        const isHeaderLabelOrValue = [
          "premium-2-event-label",
          "premium-2-match-label",
          "premium-2-match-value",
          "premium-2-map-label",
          "premium-2-map-name",
          "Event Label",
          "Match Label",
          "Match Number",
          "Map Label",
          "Map Name",
        ].includes(layer.id) || [
          "Event Label",
          "Match Label",
          "Match Number",
          "Map Label",
          "Map Name",
        ].includes(layer.name);
        if (isHeaderLabelOrValue) {
          return {
            ...layer,
            fontWeight: "400",
          };
        }
        return layer;
      });
      return { ...nextTemplate, layers: nextLayers };
    });
  } catch {
    return [];
  }
}

export function saveStoredHtmlTemplates(templates: TemplateDocument[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HTML_TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
  window.dispatchEvent(new CustomEvent("esportific:html-templates-updated"));
}

export function saveStoredHtmlTemplate(template: TemplateDocument) {
  const stored = getStoredHtmlTemplates();
  const exists = stored.some((item) => item.id === template.id);
  const next = exists ? stored.map((item) => (item.id === template.id ? template : item)) : [...stored, template];
  saveStoredHtmlTemplates(next);
}

export function deleteStoredHtmlTemplate(id: string) {
  const stored = getStoredHtmlTemplates();
  const next = stored.filter((item) => item.id !== id);
  saveStoredHtmlTemplates(next);
}

export function ensureNormalizedTemplateLayer(layer: any): TemplateLayer {
  if (!layer) return layer;
  let box = layer.box;
  if (!box) {
    const rawX = Number(layer.x ?? 0);
    const rawY = Number(layer.y ?? 0);
    const rawW = Number(layer.width ?? 100);
    const rawH = Number(layer.height ?? 100);

    const xPct = rawX > 100 ? (rawX / STANDINGS_TEMPLATE_WIDTH) * 100 : rawX;
    const yPct = rawY > 100 ? (rawY / STANDINGS_TEMPLATE_HEIGHT) * 100 : rawY;
    const wPct = rawW > 100 ? (rawW / STANDINGS_TEMPLATE_WIDTH) * 100 : rawW;
    const hPct = rawH > 100 ? (rawH / STANDINGS_TEMPLATE_HEIGHT) * 100 : rawH;

    box = {
      x: Number(xPct.toFixed(2)),
      y: Number(yPct.toFixed(2)),
      width: Number(wPct.toFixed(2)),
      height: Number(hPct.toFixed(2)),
    };
  }
  return {
    ...layer,
    box,
  };
}

export function ensureNormalizedTemplateDocument(doc: TemplateDocument): TemplateDocument {
  if (!doc || !Array.isArray(doc.layers)) return doc;
  return {
    ...doc,
    ratioLabel: doc.ratioLabel || "4:5",
    category: doc.category || "Leaderboard",
    format: doc.format || "Battle Royale",
    defaultAccent: doc.defaultAccent || "#ff6a00",
    layers: doc.layers.map(ensureNormalizedTemplateLayer),
  };
}

export function getAvailableHtmlTemplates() {
  const stored = getStoredHtmlTemplates();
  const storedIds = new Set(stored.map((template) => template.id));
  const rawList = [
    ...BUILT_IN_HTML_STANDINGS_TEMPLATES.filter((template) => !storedIds.has(template.id)),
    ...stored,
  ];
  return rawList.map(ensureNormalizedTemplateDocument);
}

export function cloneTemplateDocument(template: TemplateDocument, nextId = `template-${Date.now()}`): TemplateDocument {
  return {
    ...JSON.parse(JSON.stringify(template)),
    id: nextId,
    name: `${template.name} Copy`,
    version: template.version + 1,
  };
}
