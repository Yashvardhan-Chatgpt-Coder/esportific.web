import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentType,
  type ReactNode,
} from "react";
import KonvaCore from "konva";
import type Konva from "konva";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Copy,
  Download,
  Eye,
  EyeOff,
  Image,
  Layers,
  Lock,
  Maximize2,
  Move,
  Plus,
  Save,
  Trash2,
  Type,
  Unlock,
  Redo2,
  Undo2,
  ZoomIn,
  ZoomOut,
  Table as TableIcon,
} from "lucide-react";
import {
  STANDINGS_TEMPLATE_HEIGHT,
  STANDINGS_TEMPLATE_WIDTH,
} from "@/components/dashboard/StandingsTemplateRenderer";
import { beginExportProgress } from "@/lib/export-progress";

type ReactKonvaModule = typeof import("react-konva");

export type LayerKind = "image" | "table" | "logo" | "text" | "socials";

export type TemplateLayerBase = {
  id: string;
  name: string;
  kind: LayerKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  aspectRatioLocked?: boolean;
};

export type ImageLayer = TemplateLayerBase & {
  kind: "image";
  src: string;
  variant?: "right-faded-monochrome";
};

export type LogoLayer = TemplateLayerBase & {
  kind: "logo";
  text: string;
  fill: string;
  stroke: string;
  textColor: string;
};

export type TextLayer = TemplateLayerBase & {
  kind: "text";
  text: string;
  fill: string;
  stroke?: string;
  textColor?: string;
  fontSize: number;
  fontFamily?: string;
  fontStyle: string;
  letterSpacing?: number;
  lineHeight?: number;
};

export type TableLayer = TemplateLayerBase & {
  kind: "table";
  variant?: "premium-overall-standings" | "text-only" | "bordered";
  columns: Array<{ key: string; label: string; width: number }>;
  rowCount: number;
  headerHeight: number;
  fill: string;
  stroke: string;
  textColor: string;
  accentColor?: string;
  fontSize: number;
  fontFamily?: string;
  fontStyle?: string;
  letterSpacing?: number;
  lineHeight?: number;
  showHeader?: boolean;
};

export type SocialsLayer = TemplateLayerBase & {
  kind: "socials";
  handle: string;
};

export type TemplateLayer = ImageLayer | LogoLayer | TextLayer | TableLayer | SocialsLayer;

export type TemplateDocument = {
  id: string;
  name: string;
  width: number;
  height: number;
  background: string;
  defaultAccent?: string;
  customCss?: string;
  layers: TemplateLayer[];
};

type LayerPatch = Partial<TemplateLayerBase> & Record<string, unknown>;

export const TEMPLATE_STORAGE_KEY = "template-studio:konva-document:v2";
export const ALL_TEMPLATES_STORAGE_KEY = "template-studio:all-documents:v2";

const PREMIUM_BASE_IMAGE_SRC =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/Template%201/Base.png";
const PREMIUM_BASE_2_IMAGE_SRC =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/Template%201/Base%202.png";
const PREMIUM_BASE_3_IMAGE_SRC =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/Template%201/Base%203.png";
const HEADING_FADE_IMAGE_SRC =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/Template%201/Bermuda.png";
const BOOYAH_LOGO_SRC =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/Template%201/Booyah.png";
const CHICKEN_DINNER_LOGO_SRC =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/Template%201/Chicken.Dinner.png";
const ACTIVE_WINS_HEADER_LOGO_SRC = CHICKEN_DINNER_LOGO_SRC;
const TEAM_HEADER_ICON_SRC =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/Template%201/Teams.white.png";
const KILLS_HEADER_ICON_SRC =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/Template%201/KillS.white.png";
const PLACEMENT_HEADER_ICON_SRC =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/Template%201/Placement.white.png";
const SOCIAL_INSTAGRAM_ICON_SRC =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/Template%201/Socials/instagram.svg";
const SOCIAL_FACEBOOK_ICON_SRC =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/Template%201/Socials/facebook.svg";
const SOCIAL_YOUTUBE_ICON_SRC =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/Template%201/Socials/youtube.svg";

const DEFAULT_TEXT_FONT = "Bebas Neue";
const TABLE_CONTENT_FONT = "Plus Jakarta Sans";
const HISTORY_LIMIT = 80;

export const TEMPLATE_FONT_OPTIONS = [
  {
    label: "Bebas Neue",
    value: "Bebas Neue",
    weights: [
      { label: "Regular", value: "400" },
      { label: "Bold", value: "700" },
      { label: "Extra Bold", value: "800" },
    ],
  },
  {
    label: "Plus Jakarta Sans",
    value: "Plus Jakarta Sans",
    weights: [
      { label: "Regular", value: "400" },
      { label: "Medium", value: "500" },
      { label: "Semi Bold", value: "600" },
      { label: "Bold", value: "700" },
      { label: "Extra Bold", value: "800" },
    ],
  },
  {
    label: "Nexa",
    value: "Nexa",
    weights: [
      { label: "Extra Light", value: "200" },
      { label: "Heavy", value: "800" },
    ],
  },
];

const SUPPORTED_TEMPLATE_FONTS = new Set(TEMPLATE_FONT_OPTIONS.map((font) => font.value));
const DEFAULT_ACCENT = "#ff6a00";
const MIN_LAYER_SIZE = 4;
const HEADING_FADE_IMAGE_WIDTH = 540;
const HEADING_FADE_IMAGE_HEIGHT = 250;
const HEADING_FADE_IMAGE_X = STANDINGS_TEMPLATE_WIDTH - HEADING_FADE_IMAGE_WIDTH;
const HEADING_FADE_IMAGE_Y = 170;
const SOCIALS_LAYER_WIDTH = 220;
const SOCIALS_LAYER_HEIGHT = 26;
const SOCIALS_LAYER_X = STANDINGS_TEMPLATE_WIDTH - SOCIALS_LAYER_WIDTH - 66;
const SOCIALS_LAYER_Y = STANDINGS_TEMPLATE_HEIGHT - SOCIALS_LAYER_HEIGHT - 52;

const premiumTableRows = [
  ["TEAM PHOENIX", 2, 48, 61, 109],
  ["DEADLY SQUAD", 1, 42, 58, 100],
  ["WILDFIRE", 1, 38, 57, 95],
  ["TEAM INSANE", 1, 36, 52, 88],
  ["TOTAL GAMING", 1, 32, 54, 86],
  ["PVS GAMING", 0, 35, 49, 84],
  ["4FLAG GAMER", 1, 29, 46, 75],
  ["GODLIKE ESPORTS", 0, 28, 45, 73],
  ["TSG ARMY", 0, 27, 44, 71],
  ["UG EMPIRE", 0, 26, 41, 67],
  ["RAGE GAMING", 0, 24, 39, 63],
  ["TEAM HIND", 0, 22, 38, 60],
  ["K9 OFFICIAL", 0, 21, 36, 57],
  ["TEAM D", 0, 18, 32, 50],
  ["NXT LEVEL", 0, 16, 30, 46],
  ["TEAM CHAOS", 0, 12, 24, 36],
] as const;

const premiumTeamMarks = ["PH", "DS", "WF", "IX", "TG", "PVS", "4F", "GE", "TSG", "UG", "RG", "H", "K9", "D", "NXT", "CH"];
const premiumMarkColors = [
  "#9f2d10",
  "#111827",
  "#ef4444",
  "#5b21b6",
  "#78350f",
  "#1f2937",
  "#111111",
  "#d97706",
  "#7f1d1d",
  "#92400e",
  "#dc2626",
  "#111827",
  "#374151",
  "#ffffff",
  "#6b7280",
  "#111827",
];

export const defaultTableLayer: TableLayer = {
  id: "premium-standings-table",
  name: "Premium Standings Table",
  kind: "table",
  variant: "premium-overall-standings",
  x: 50,
  y: 370,
  width: 1022,
  height: 910,
  rotation: 0,
  zIndex: 10,
  visible: true,
  locked: false,
  aspectRatioLocked: false,
  rowCount: 16,
  headerHeight: 50,
  fill: DEFAULT_ACCENT,
  stroke: DEFAULT_ACCENT,
  textColor: "#ffffff",
  fontSize: 18,
  columns: [
    { key: "slot", label: "#", width: 0.07 },
    { key: "team", label: "TEAM", width: 0.27 },
    { key: "wins", label: "WINS", width: 0.14 },
    { key: "kills", label: "KILL POINTS", width: 0.16 },
    { key: "placement", label: "PLACEMENT POINTS", width: 0.23 },
    { key: "total", label: "TOTAL POINTS", width: 0.13 },
  ],
};

export const defaultDocument: TemplateDocument = {
  id: "premium-standings-template",
  name: "Premium Royale Standings",
  width: STANDINGS_TEMPLATE_WIDTH,
  height: STANDINGS_TEMPLATE_HEIGHT,
  background: "#080808",
  defaultAccent: DEFAULT_ACCENT,
  layers: [
    {
      id: "heading-fade-image",
      name: "Heading Fade Image",
      kind: "image",
      src: HEADING_FADE_IMAGE_SRC,
      variant: "right-faded-monochrome",
      x: HEADING_FADE_IMAGE_X,
      y: HEADING_FADE_IMAGE_Y,
      width: HEADING_FADE_IMAGE_WIDTH,
      height: HEADING_FADE_IMAGE_HEIGHT,
      rotation: 0,
      zIndex: -10,
      visible: true,
      locked: false,
      aspectRatioLocked: true,
    },
    {
      id: "premium-base",
      name: "Base 1",
      kind: "image",
      src: PREMIUM_BASE_IMAGE_SRC,
      x: 0,
      y: 0,
      width: STANDINGS_TEMPLATE_WIDTH,
      height: STANDINGS_TEMPLATE_HEIGHT,
      rotation: 0,
      zIndex: 0,
      visible: true,
      locked: true,
      aspectRatioLocked: true,
    },
    {
      id: "premium-base-2",
      name: "Base 2",
      kind: "image",
      src: PREMIUM_BASE_2_IMAGE_SRC,
      x: 0,
      y: 0,
      width: STANDINGS_TEMPLATE_WIDTH,
      height: STANDINGS_TEMPLATE_HEIGHT,
      rotation: 0,
      zIndex: 1,
      visible: true,
      locked: true,
      aspectRatioLocked: true,
    },
    {
      id: "premium-base-3",
      name: "Base 3",
      kind: "image",
      src: PREMIUM_BASE_3_IMAGE_SRC,
      x: 0,
      y: 0,
      width: STANDINGS_TEMPLATE_WIDTH,
      height: STANDINGS_TEMPLATE_HEIGHT,
      rotation: 0,
      zIndex: 2,
      visible: true,
      locked: true,
      aspectRatioLocked: true,
    },
    defaultTableLayer,
  ],
};

export const WINTER_SERIES_TABLE_COLUMNS = [
  { key: "slot", label: "#", width: 0.09 },
  { key: "team", label: "TEAM NAME", width: 0.33 },
  { key: "wins", label: "WINS", width: 0.12 },
  { key: "kills", label: "KILL POINTS", width: 0.14 },
  { key: "placement", label: "PLACEMENT POINTS", width: 0.15 },
  { key: "total", label: "TOTAL POINTS", width: 0.17 },
];

export const STANDARD_BR_TABLE_COLUMNS = [
  { key: "slot", label: "#", width: 0.08 },
  { key: "team", label: "TEAM", width: 0.36 },
  { key: "matches", label: "MATCH", width: 0.14 },
  { key: "wins", label: "WWCD", width: 0.14 },
  { key: "kills", label: "FINS", width: 0.14 },
  { key: "total", label: "TOTAL", width: 0.14 },
];

export const defaultTableTextLayer: TableLayer = {
  id: "standings-table-text",
  name: "Standings Table Text",
  kind: "table",
  variant: "text-only",
  x: 47,
  y: 490,
  width: 1036,
  height: 638,
  rotation: 0,
  zIndex: 100,
  visible: true,
  locked: false,
  aspectRatioLocked: false,
  rowCount: 8,
  headerHeight: 63,
  fill: "#ffffff",
  stroke: "transparent",
  textColor: "#ffffff",
  accentColor: "#38bdf8",
  fontSize: 26,
  fontFamily: "Bebas Neue",
  fontStyle: "bold",
  letterSpacing: 1,
  lineHeight: 0.85,
  showHeader: true,
  columns: WINTER_SERIES_TABLE_COLUMNS,
};

export const defaultGameTextLayer: TextLayer = {
  id: "meta-game-text",
  name: "Game Text",
  kind: "text",
  text: "BGMI",
  x: 342,
  y: 350,
  width: 140,
  height: 32,
  rotation: 0,
  zIndex: 101,
  visible: true,
  locked: false,
  aspectRatioLocked: false,
  fill: "#ffffff",
  stroke: "transparent",
  textColor: "#ffffff",
  fontSize: 20,
  fontFamily: "Bebas Neue",
  fontStyle: "bold",
  letterSpacing: 1,
};

export const defaultMapTextLayer: TextLayer = {
  id: "meta-map-text",
  name: "Map Text",
  kind: "text",
  text: "ERANGEL",
  x: 508,
  y: 350,
  width: 140,
  height: 32,
  rotation: 0,
  zIndex: 102,
  visible: true,
  locked: false,
  aspectRatioLocked: false,
  fill: "#ffffff",
  stroke: "transparent",
  textColor: "#ffffff",
  fontSize: 20,
  fontFamily: "Bebas Neue",
  fontStyle: "bold",
  letterSpacing: 1,
};

export const defaultMatchTextLayer: TextLayer = {
  id: "meta-match-text",
  name: "Match Text",
  kind: "text",
  text: "MATCH 01",
  x: 708,
  y: 350,
  width: 140,
  height: 32,
  rotation: 0,
  zIndex: 103,
  visible: true,
  locked: false,
  aspectRatioLocked: false,
  fill: "#ffffff",
  stroke: "transparent",
  textColor: "#ffffff",
  fontSize: 20,
  fontFamily: "Bebas Neue",
  fontStyle: "bold",
  letterSpacing: 1,
};

export const defaultSocialsLayer: SocialsLayer = {
  id: "socials",
  name: "Socials",
  kind: "socials",
  handle: "@NEXUSESPORTS",
  x: SOCIALS_LAYER_X,
  y: SOCIALS_LAYER_Y,
  width: SOCIALS_LAYER_WIDTH,
  height: SOCIALS_LAYER_HEIGHT,
  rotation: 0,
  zIndex: 22,
  visible: true,
  locked: false,
  aspectRatioLocked: true,
};

export function createBlankCanvasTemplate(name = "4:5 Leaderboard Template"): TemplateDocument {
  return {
    id: `template-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    width: STANDINGS_TEMPLATE_WIDTH,
    height: STANDINGS_TEMPLATE_HEIGHT,
    background: "#ffffff",
    defaultAccent: DEFAULT_ACCENT,
    layers: [
      defaultGameTextLayer,
      defaultMapTextLayer,
      defaultMatchTextLayer,
      defaultTableTextLayer,
    ],
  };
}

function premiumBaseLayer(): ImageLayer {
  return cloneDocument(defaultDocument).layers.find((layer): layer is ImageLayer => layer.id === "premium-base")!;
}

function premiumBase2Layer(): ImageLayer {
  return cloneDocument(defaultDocument).layers.find((layer): layer is ImageLayer => layer.id === "premium-base-2")!;
}

function premiumBase3Layer(): ImageLayer {
  return cloneDocument(defaultDocument).layers.find((layer): layer is ImageLayer => layer.id === "premium-base-3")!;
}

function headingFadeImageLayer(): ImageLayer {
  return cloneDocument(defaultDocument).layers.find((layer): layer is ImageLayer => layer.id === "heading-fade-image")!;
}

function normalizeBaseLayer(layer: ImageLayer, src: string, zIndex: number): ImageLayer {
  return {
    ...layer,
    src,
    x: 0,
    y: 0,
    width: STANDINGS_TEMPLATE_WIDTH,
    height: STANDINGS_TEMPLATE_HEIGHT,
    zIndex,
    locked: true,
    aspectRatioLocked: true,
  };
}

export function cloneDocument(document: TemplateDocument): TemplateDocument {
  return JSON.parse(JSON.stringify(document)) as TemplateDocument;
}

function sortLayers(layers: TemplateLayer[]) {
  return [...layers].sort((a, b) => a.zIndex - b.zIndex);
}

function normalizeDocument(document: TemplateDocument): TemplateDocument {
  let hasTableLayer = false;
  const normalizedLayers = (document.layers || []).map((layer) => {
    if (layer.kind === "table") {
      hasTableLayer = true;
      const isDefaultTable = layer.id === "standings-table-text" || layer.variant === "text-only";
      const isPremiumTable = layer.id === "premium-standings-table" || layer.variant === "premium-overall-standings";
      return {
        ...layer,
        variant: layer.variant || (isPremiumTable ? "premium-overall-standings" : "text-only"),
        fontFamily: layer.fontFamily || (isPremiumTable ? "Plus Jakarta Sans" : "Bebas Neue"),
        fontStyle: layer.fontStyle || "bold",
        textColor: layer.textColor || layer.fill || "#ffffff",
        fontSize: layer.fontSize || (isPremiumTable ? 18 : 25),
        lineHeight: layer.lineHeight ?? 0.85,
        rowCount: layer.rowCount || (isPremiumTable ? 16 : 12),
        height: layer.height || (isPremiumTable ? 910 : 770),
        width: layer.width || (isPremiumTable ? 1022 : 748),
        x: layer.x ?? (isPremiumTable ? 50 : 187),
        y: layer.y ?? (isPremiumTable ? 370 : 416),
        headerHeight: layer.headerHeight ?? (isPremiumTable ? 50 : 40),
        showHeader: layer.showHeader ?? true,
        columns: layer.columns && layer.columns.length > 0 ? layer.columns : (isPremiumTable ? defaultTableLayer.columns : defaultTableTextLayer.columns),
      } as TableLayer;
    }

    const normalized = {
      ...layer,
      aspectRatioLocked: layer.aspectRatioLocked ?? (layer.kind === "image" || layer.kind === "logo"),
    } as TemplateLayer;

    if (normalized.kind === "text") {
      const fontFamily = SUPPORTED_TEMPLATE_FONTS.has(normalized.fontFamily || "")
        ? normalized.fontFamily
        : DEFAULT_TEXT_FONT;
      const fontOption = TEMPLATE_FONT_OPTIONS.find((font) => font.value === fontFamily) || TEMPLATE_FONT_OPTIONS[0];
      const fontStyle = fontOption.weights.some((weight) => weight.value === normalized.fontStyle)
        ? normalized.fontStyle
        : fontOption.weights[0].value;
      return {
        ...normalized,
        fontFamily,
        fontStyle,
        letterSpacing: normalized.letterSpacing ?? 0,
      };
    }

    return normalized;
  });

  if (!hasTableLayer && document.id === "premium-standings-template") {
    normalizedLayers.push({ ...defaultTableLayer });
  }

  return {
    ...document,
    width: STANDINGS_TEMPLATE_WIDTH,
    height: STANDINGS_TEMPLATE_HEIGHT,
    background: document.background || "#ffffff",
    defaultAccent: document.defaultAccent || DEFAULT_ACCENT,
    layers: normalizedLayers,
  };
}

function createLayerId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function loadStoredTemplates(): TemplateDocument[] {
  if (typeof window === "undefined") return [normalizeDocument(cloneDocument(defaultDocument))];
  try {
    const raw = window.localStorage.getItem(ALL_TEMPLATES_STORAGE_KEY);
    if (!raw) return [normalizeDocument(cloneDocument(defaultDocument))];
    const parsed = JSON.parse(raw) as TemplateDocument[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(normalizeDocument);
    }
    return [normalizeDocument(cloneDocument(defaultDocument))];
  } catch {
    return [normalizeDocument(cloneDocument(defaultDocument))];
  }
}

function saveStoredTemplates(templates: TemplateDocument[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ALL_TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
    window.dispatchEvent(new CustomEvent("esportific:studio-templates-updated"));
  } catch (err) {
    console.error("Failed to save templates:", err);
  }
}

function numberInputValue(value: number) {
  return Number.isFinite(value) ? Math.round(value) : 0;
}

function updateLayerById(layers: TemplateLayer[], layerId: string, patch: LayerPatch) {
  return layers.map((layer) => (layer.id === layerId ? ({ ...layer, ...patch } as TemplateLayer) : layer));
}

function getCoverCrop(image: HTMLImageElement | null, targetWidth: number, targetHeight: number) {
  if (!image?.naturalWidth || !image.naturalHeight) return undefined;
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = targetWidth / targetHeight;
  if (imageRatio > targetRatio) {
    const width = image.naturalHeight * targetRatio;
    return {
      x: (image.naturalWidth - width) / 2,
      y: 0,
      width,
      height: image.naturalHeight,
    };
  }

  const height = image.naturalWidth / targetRatio;
  return {
    x: 0,
    y: (image.naturalHeight - height) / 2,
    width: image.naturalWidth,
    height,
  };
}

function fontWeightStrokeWidth(weight: string | undefined) {
  const numericWeight = Number(weight || 400);
  if (!Number.isFinite(numericWeight) || numericWeight <= 400) return 0;
  return Math.min(0.9, (numericWeight - 400) / 450);
}

function useKonvaModule() {
  const [module, setModule] = useState<ReactKonvaModule | null>(null);

  useEffect(() => {
    KonvaCore.pixelRatio = Math.max(window.devicePixelRatio || 1, 2);
    let cancelled = false;
    import("react-konva").then((loaded) => {
      if (!cancelled) setModule(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return module;
}

function useTemplateFonts() {
  useEffect(() => {
    if (typeof document === "undefined" || !("fonts" in document)) return;
    const weights = ["400", "500", "600", "700", "800"];
    void document.fonts.load(`32px "${DEFAULT_TEXT_FONT}"`);
    weights.forEach((weight) => {
      void document.fonts.load(`${weight} 28px "${TABLE_CONTENT_FONT}"`);
    });
    void document.fonts.load(`200 28px "Nexa"`);
    void document.fonts.load(`800 28px "Nexa"`);
  }, []);
}

function useImageElement(src: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src || typeof window === "undefined") return;
    let cancelled = false;
    const nextImage = new window.Image();
    nextImage.crossOrigin = "anonymous";
    nextImage.onload = () => {
      if (!cancelled) setImage(nextImage);
    };
    nextImage.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  return image;
}

function useStageScale() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const update = () => {
      const nextScale = Math.min(
        Math.max(element.clientWidth - 32, 1) / STANDINGS_TEMPLATE_WIDTH,
        Math.max(element.clientHeight - 32, 1) / STANDINGS_TEMPLATE_HEIGHT,
      );
      setBaseScale(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const beforeScale = baseScale * zoom;
      const rect = element.getBoundingClientRect();
      const pointerX = event.clientX - rect.left + element.scrollLeft;
      const pointerY = event.clientY - rect.top + element.scrollTop;
      const canvasX = beforeScale > 0 ? pointerX / beforeScale : pointerX;
      const canvasY = beforeScale > 0 ? pointerY / beforeScale : pointerY;
      const clampDelta = Math.min(Math.max(event.deltaY, -120), 120);
      const zoomChange = -clampDelta * 0.0035;
      setZoom((current) => {
        const nextZoom = Math.min(4, Math.max(0.25, Number((current + zoomChange).toFixed(3))));
        const afterScale = baseScale * nextZoom;
        requestAnimationFrame(() => {
          element.scrollLeft = canvasX * afterScale - (event.clientX - rect.left);
          element.scrollTop = canvasY * afterScale - (event.clientY - rect.top);
        });
        return nextZoom;
      });
    };

    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, [baseScale, zoom]);

  const zoomIn = useCallback(() => setZoom((current) => Math.min(4, Number((current + 0.1).toFixed(2)))), []);
  const zoomOut = useCallback(() => setZoom((current) => Math.max(0.25, Number((current - 0.1).toFixed(2)))), []);
  const resetZoom = useCallback(() => setZoom(1), []);

  return { containerRef, scale: baseScale * zoom, zoom, zoomIn, zoomOut, resetZoom };
}

function InspectorInput({
  label,
  value,
  disabled,
  step,
  onChange,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9aa1b0]">{label}</span>
      <input
        type="number"
        step={step ?? "any"}
        value={numberInputValue(value)}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-9 w-full rounded-[8px] border border-[#e2e5ec] bg-white px-2 text-[13px] font-medium text-[#000000] outline-none focus:border-[#000000] disabled:bg-[#f7f8fb] disabled:text-[#9aa1b0]"
      />
    </label>
  );
}

function ToolbarButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[13px] font-semibold text-[#000000] transition hover:bg-[#f7f8fb] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function KonvaImageLayer({
  Group,
  Rect,
  KonvaImage,
  layer,
  selected,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: {
  Group: ComponentType<any>;
  Rect: ComponentType<any>;
  KonvaImage: ComponentType<any>;
  layer: ImageLayer;
  selected: boolean;
  onSelect: () => void;
  onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (event: Konva.KonvaEventObject<Event>) => void;
}) {
  const image = useImageElement(layer.src);
  const coverCrop = getCoverCrop(image, layer.width, layer.height);

  if (layer.variant === "right-faded-monochrome") {
    return (
      <Group
        id={layer.id}
        name="template-object"
        x={layer.x}
        y={layer.y}
        width={layer.width}
        height={layer.height}
        rotation={layer.rotation}
        visible={layer.visible}
        draggable={!layer.locked}
        listening={layer.visible}
        opacity={selected ? 0.98 : 1}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={onDragEnd}
        onTransformEnd={onTransformEnd}
        clipX={0}
        clipY={0}
        clipWidth={layer.width}
        clipHeight={layer.height}
      >
        <KonvaImage
          image={image}
          x={0}
          y={0}
          width={layer.width}
          height={layer.height}
          crop={coverCrop}
          opacity={1}
        />
        <Rect
          x={0}
          y={0}
          width={layer.width * 0.44}
          height={layer.height}
          fillLinearGradientStartPoint={{ x: 0, y: 0 }}
          fillLinearGradientEndPoint={{ x: layer.width * 0.44, y: 0 }}
          fillLinearGradientColorStops={[0, "#ffffff", 1, "rgba(255,255,255,0)"]}
        />
        <Rect
          x={layer.width * 0.86}
          y={0}
          width={layer.width * 0.14}
          height={layer.height}
          fillLinearGradientStartPoint={{ x: layer.width * 0.86, y: 0 }}
          fillLinearGradientEndPoint={{ x: layer.width, y: 0 }}
          fillLinearGradientColorStops={[0, "rgba(255,255,255,0)", 1, "#ffffff"]}
        />
        <Rect
          x={0}
          y={0}
          width={layer.width}
          height={layer.height * 0.3}
          fillLinearGradientStartPoint={{ x: 0, y: 0 }}
          fillLinearGradientEndPoint={{ x: 0, y: layer.height * 0.3 }}
          fillLinearGradientColorStops={[0, "#ffffff", 1, "rgba(255,255,255,0)"]}
        />
        <Rect
          x={0}
          y={layer.height * 0.18}
          width={layer.width}
          height={layer.height * 0.82}
          fillLinearGradientStartPoint={{ x: 0, y: layer.height * 0.18 }}
          fillLinearGradientEndPoint={{ x: 0, y: layer.height }}
          fillLinearGradientColorStops={[0, "rgba(255,255,255,0)", 0.58, "#ffffff", 1, "#ffffff"]}
        />
      </Group>
    );
  }

  return (
    <KonvaImage
      id={layer.id}
      name="template-object"
      image={image}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      rotation={layer.rotation}
      visible={layer.visible}
      draggable={!layer.locked}
      listening={layer.visible}
      opacity={selected ? 0.98 : 1}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    />
  );
}

function TableLayerShape({
  Group,
  Rect,
  Text: KonvaText,
  Line,
  KonvaImage,
  layer,
  selected,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: {
  Group: ComponentType<any>;
  Rect: ComponentType<any>;
  Text: ComponentType<any>;
  Line: ComponentType<any>;
  KonvaImage: ComponentType<any>;
  layer: TableLayer;
  selected: boolean;
  onSelect: () => void;
  onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (event: Konva.KonvaEventObject<Event>) => void;
}) {
  const winsHeaderLogo = useImageElement(ACTIVE_WINS_HEADER_LOGO_SRC);
  const teamHeaderIcon = useImageElement(TEAM_HEADER_ICON_SRC);
  const killsHeaderIcon = useImageElement(KILLS_HEADER_ICON_SRC);
  const placementHeaderIcon = useImageElement(PLACEMENT_HEADER_ICON_SRC);
  const headerHeight = Math.max(24, layer.headerHeight);
  const rowHeight = Math.max(12, (layer.height - headerHeight) / Math.max(1, layer.rowCount));
  let currentX = 0;
  const columnStarts = (layer.columns || []).map((column) => {
    const start = currentX;
    currentX += layer.width * column.width;
    return start;
  });
  const columnWidth = (index: number) => layer.width * (layer.columns[index]?.width || 0.15);

  if (layer.variant === "text-only") {
    const isHeaderVisible = layer.showHeader !== false;
    const effectiveHeaderHeight = isHeaderVisible ? Math.max(20, layer.headerHeight || 44) : 0;
    const rowHeight = Math.max(10, (layer.height - effectiveHeaderHeight) / Math.max(1, layer.rowCount));
    const textColor = layer.textColor || layer.fill || "#ffffff";
    const fontFamily = layer.fontFamily || "Bebas Neue";
    const fontSize = layer.fontSize || 26;
    const fontStyle = layer.fontStyle || "bold";
    const headerFontSize = Math.max(12, Math.round(fontSize * 0.9));

    return (
      <Group
        id={layer.id}
        name="template-object"
        x={layer.x}
        y={layer.y}
        width={layer.width}
        height={layer.height}
        rotation={layer.rotation}
        visible={layer.visible}
        draggable={!layer.locked}
        listening={layer.visible}
        opacity={selected ? 0.98 : 1}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={onDragEnd}
        onTransformEnd={onTransformEnd}
      >
        {/* Transparent hit area for drag and selection */}
        <Rect
          width={layer.width}
          height={layer.height}
          fill="transparent"
          stroke={selected ? "rgba(0, 168, 255, 0.6)" : "transparent"}
          strokeWidth={2}
          dash={selected ? [6, 6] : undefined}
        />

        {/* Optional Header Row Text */}
        {isHeaderVisible ? (
          <Group>
            {layer.columns.map((column, index) => {
              const x = columnStarts[index];
              const width = columnWidth(index);
              const align = column.key === "team" ? "left" : "center";
              const textX = column.key === "team" ? x + 16 : x;
              const textW = column.key === "team" ? width - 20 : width;
              const isTotalCol = column.key === "total" || column.key.toLowerCase().includes("total");
              const colHeaderColor = isTotalCol ? (layer.accentColor || "#38bdf8") : textColor;

              return (
                <KonvaText
                  key={`text-header-${column.key}`}
                  x={textX}
                  y={0}
                  width={textW}
                  height={effectiveHeaderHeight}
                  text={column.label.toUpperCase()}
                  fill={colHeaderColor}
                  fontFamily={fontFamily}
                  fontSize={headerFontSize}
                  fontStyle={fontStyle}
                  letterSpacing={layer.letterSpacing ?? 1}
                  lineHeight={layer.lineHeight ?? 0.85}
                  shadowColor={isTotalCol ? "rgba(56, 189, 248, 0.4)" : "rgba(0,0,0,0.4)"}
                  shadowBlur={isTotalCol ? 4 : 3}
                  shadowOffsetY={1}
                  align={align}
                  verticalAlign="middle"
                />
              );
            })}
          </Group>
        ) : null}

        {/* Row Data Text */}
        {Array.from({ length: layer.rowCount }).map((_, rowIndex) => {
          const y = effectiveHeaderHeight + rowHeight * rowIndex;
          const sampleRow = premiumTableRows[rowIndex] ?? ["TEAM " + (rowIndex + 1), 0, 10, 15, 25];
          const teamName = String(sampleRow[0]).toUpperCase();
          const rankNumber = rowIndex + 1;
          const matches = sampleRow[1] ?? (rowIndex < 5 || rowIndex === 6 ? 1 : 0);
          const wins = sampleRow[1] ?? (rowIndex < 5 || rowIndex === 6 ? 1 : 0);
          const kills = sampleRow[2] ?? 10;
          const placement = sampleRow[3] ?? 20;
          const total = sampleRow[4] ?? (kills + (wins * 15));

          const getColValue = (key: string) => {
            const k = key.toLowerCase().trim();
            if (k === "slot" || k === "rank" || k === "#") return String(rankNumber);
            if (k === "team" || k === "name" || k.includes("team")) return teamName;
            if (k === "matches" || k === "match" || k === "m") return String(matches);
            if (k === "wins" || k === "wwcd" || k === "w") return String(wins);
            if (k === "kills" || k === "fins" || k === "k" || k.includes("kill") || k.includes("fin")) return String(kills);
            if (k === "placement" || k === "pts" || k === "p" || k.includes("place") || k.includes("pt")) return String(placement);
            if (k === "total" || k === "tot" || k === "t" || k.includes("total")) return String(total);
            return String(sampleRow[2] ?? 0);
          };

          return (
            <Group key={`text-row-${rowIndex}`}>
              {layer.columns.map((column, colIndex) => {
                const x = columnStarts[colIndex];
                const width = columnWidth(colIndex);
                const align = column.key === "team" ? "left" : "center";
                const textX = column.key === "team" ? x + 16 : x;
                const textW = column.key === "team" ? width - 20 : width;
                const valueText = getColValue(column.key);
                const isTotalCol = column.key === "total" || column.key.toLowerCase().includes("total");
                const cellColor = isTotalCol ? (layer.accentColor || "#38bdf8") : textColor;
                const cellFontSize = isTotalCol ? Math.round(fontSize * 1.08) : fontSize;

                return (
                  <KonvaText
                    key={`text-cell-${rowIndex}-${column.key}`}
                    x={textX}
                    y={y}
                    width={textW}
                    height={rowHeight}
                    text={valueText}
                    fill={cellColor}
                    fontFamily={fontFamily}
                    fontSize={cellFontSize}
                    fontStyle={fontStyle}
                    letterSpacing={layer.letterSpacing ?? 0.8}
                    lineHeight={layer.lineHeight ?? 0.85}
                    shadowColor={isTotalCol ? "rgba(56, 189, 248, 0.45)" : "rgba(0,0,0,0.35)"}
                    shadowBlur={isTotalCol ? 5 : 2}
                    shadowOffsetY={1}
                    align={align}
                    verticalAlign="middle"
                  />
                );
              })}
            </Group>
          );
        })}
      </Group>
    );
  }

  if (layer.variant === "premium-overall-standings") {
    const slotWidth = columnWidth(0);
    const totalX = columnStarts[layer.columns.length - 1] ?? (layer.width * 0.85);
    const totalWidth = columnWidth(layer.columns.length - 1);
    const headerLabels: Record<string, string> = {
      slot: "#",
      team: "TEAM",
      wins: "WINS",
      kills: "KILL POINTS",
      placement: "PLACEMENT POINTS",
      total: "TOTAL POINTS",
    };

    const renderIconHeader = (
      key: string,
      x: number,
      width: number,
      icon: HTMLImageElement | null,
      label: string,
      iconSize: number,
      fontSize: number,
    ) => {
      const gap = 8;
      const labelWidth = Math.min(width - iconSize - gap - 8, label.length * fontSize * 0.56);
      const groupWidth = iconSize + gap + labelWidth;
      const startX = x + (width - groupWidth) / 2;
      return (
        <Group key={key}>
          <KonvaImage
            image={icon}
            x={startX}
            y={(headerHeight - iconSize) / 2}
            width={iconSize}
            height={iconSize}
          />
          <KonvaText
            x={startX + iconSize + gap}
            y={0}
            width={labelWidth + 8}
            height={headerHeight}
            text={label}
            fill="#ffffff"
            fontFamily={DEFAULT_TEXT_FONT}
            fontSize={fontSize}
            fontStyle="400"
            align="left"
            verticalAlign="middle"
          />
        </Group>
      );
    };

    return (
      <Group
        id={layer.id}
        name="template-object"
        x={layer.x}
        y={layer.y}
        width={layer.width}
        height={layer.height}
        rotation={layer.rotation}
        visible={layer.visible}
        draggable={!layer.locked}
        listening={layer.visible}
        opacity={selected ? 0.98 : 1}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={onDragEnd}
        onTransformEnd={onTransformEnd}
      >
        <Rect width={layer.width} height={layer.height} fill="#ffffff" opacity={0.9} cornerRadius={10} />
        <Rect width={layer.width} height={headerHeight} fill={layer.fill || "#ff5b00"} cornerRadius={[10, 10, 0, 0]} />
        <Rect x={totalX} y={0} width={totalWidth} height={layer.height} fill="#161616" cornerRadius={[0, 10, 10, 0]} />
        <Rect x={totalX} y={0} width={totalWidth} height={headerHeight} fill="#171717" cornerRadius={[0, 10, 0, 0]} />

        {layer.columns.map((column, index) => {
          const x = columnStarts[index];
          const width = columnWidth(index);
          if (column.key === "wins") {
            const naturalRatio = winsHeaderLogo?.naturalWidth && winsHeaderLogo?.naturalHeight
              ? winsHeaderLogo.naturalWidth / winsHeaderLogo.naturalHeight
              : 3;
            const maxLogoWidth = width - 20;
            const maxLogoHeight = headerHeight - 14;
            let logoWidth = maxLogoWidth;
            let logoHeight = logoWidth / naturalRatio;
            if (logoHeight > maxLogoHeight) {
              logoHeight = maxLogoHeight;
              logoWidth = logoHeight * naturalRatio;
            }
            return (
              <KonvaImage
                key={column.key}
                image={winsHeaderLogo}
                x={x + (width - logoWidth) / 2}
                y={(headerHeight - logoHeight) / 2}
                width={logoWidth}
                height={logoHeight}
              />
            );
          }

          if (column.key === "team") {
            return renderIconHeader(column.key, x, width, teamHeaderIcon, "TEAM", 23, 22);
          }

          if (column.key === "kills") {
            return renderIconHeader(column.key, x, width, killsHeaderIcon, "KILL POINTS", 23, 20);
          }

          if (column.key === "placement") {
            return renderIconHeader(column.key, x, width, placementHeaderIcon, "PLACEMENT POINTS", 23, 19);
          }

          return (
            <KonvaText
              key={column.key}
              x={x}
              y={0}
              width={width}
              height={headerHeight}
              text={headerLabels[column.key] ?? column.label.toUpperCase()}
              fill="#ffffff"
              fontFamily={DEFAULT_TEXT_FONT}
              fontSize={column.key === "placement" || column.key === "total" ? 20 : 22}
              fontStyle="400"
              align="center"
              verticalAlign="middle"
            />
          );
        })}

        {layer.columns.slice(1).map((_, index) => {
          const x = columnStarts[index + 1];
          return <Line key={`premium-header-line-${index}`} points={[x, 10, x, headerHeight - 10]} stroke="#ff8b4a" strokeWidth={1} opacity={0.65} />;
        })}

        {Array.from({ length: layer.rowCount }).map((_, rowIndex) => {
          const y = headerHeight + rowHeight * rowIndex;
          const row = premiumTableRows[rowIndex] ?? ["", "", "", "", ""];
          const team = String(row[0]).toUpperCase();
          const values = [rowIndex + 1, team, row[1], row[2], row[3], row[4]];
          return (
            <Group key={`premium-row-${rowIndex}`}>
              <Rect x={0} y={y} width={slotWidth} height={rowHeight} fill={layer.fill || "#ff5b00"} />
              <Rect x={slotWidth} y={y} width={totalX - slotWidth} height={rowHeight} fill="#ffffff" opacity={0.9} />
              <Rect x={totalX} y={y} width={totalWidth} height={rowHeight} fill="#171717" />
              <Line points={[0, y, layer.width, y]} stroke="#d9d9d9" strokeWidth={1} />

              {layer.columns.slice(1, -1).map((_, index) => {
                const x = columnStarts[index + 1];
                return <Line key={`premium-body-line-${rowIndex}-${index}`} points={[x, y + 12, x, y + rowHeight - 12]} stroke="#e7e7e7" strokeWidth={1} />;
              })}

              <KonvaText
                x={0}
                y={y}
                width={slotWidth}
                height={rowHeight}
                text={String(values[0])}
                fill="#ffffff"
                fontFamily={DEFAULT_TEXT_FONT}
                fontSize={34}
                fontStyle="400"
                align="center"
                verticalAlign="middle"
              />

              <Rect
                x={columnStarts[1] + 24}
                y={y + Math.max(10, (rowHeight - 30) / 2)}
                width={30}
                height={30}
                fill={premiumMarkColors[rowIndex] ?? "#111827"}
                stroke="#ffffff"
                strokeWidth={2}
                cornerRadius={15}
              />
              <KonvaText
                x={columnStarts[1] + 24}
                y={y + Math.max(10, (rowHeight - 30) / 2)}
                width={30}
                height={30}
                text={premiumTeamMarks[rowIndex] ?? ""}
                fill="#ffffff"
                fontFamily={TABLE_CONTENT_FONT}
                fontSize={premiumTeamMarks[rowIndex]?.length > 2 ? 7 : 10}
                fontStyle="600"
                align="center"
                verticalAlign="middle"
              />

              <KonvaText
                x={columnStarts[1] + 68}
                y={y}
                width={columnWidth(1) - 76}
                height={rowHeight}
                text={team}
                fill="#111111"
                fontFamily={TABLE_CONTENT_FONT}
                fontSize={17}
                fontStyle="700"
                align="left"
                verticalAlign="middle"
              />

              {[2, 3, 4].map((columnIndex, valueIndex) => (
                <KonvaText
                  key={`premium-value-${rowIndex}-${columnIndex}`}
                  x={columnStarts[columnIndex]}
                  y={y}
                  width={columnWidth(columnIndex)}
                  height={rowHeight}
                  text={String(values[valueIndex + 2])}
                  fill="#111111"
                  fontFamily={TABLE_CONTENT_FONT}
                  fontSize={17}
                  fontStyle="600"
                  align="center"
                  verticalAlign="middle"
                />
              ))}

              <KonvaText
                x={totalX}
                y={y}
                width={totalWidth}
                height={rowHeight}
                text={String(values[5])}
                fill={layer.fill || "#ff5b00"}
                fontFamily={DEFAULT_TEXT_FONT}
                fontSize={34}
                fontStyle="400"
                align="center"
                verticalAlign="middle"
              />
            </Group>
          );
        })}
        <Line points={[0, layer.height, layer.width, layer.height]} stroke="#d9d9d9" strokeWidth={1} />
      </Group>
    );
  }

  return (
    <Group
      id={layer.id}
      name="template-object"
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      rotation={layer.rotation}
      visible={layer.visible}
      draggable={!layer.locked}
      listening={layer.visible}
      opacity={selected ? 0.98 : 1}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    >
      <Rect width={layer.width} height={layer.height} fill="#ffffff" stroke={layer.stroke || "#000000"} strokeWidth={2} cornerRadius={10} />
      <Rect width={layer.width} height={headerHeight} fill={layer.fill || DEFAULT_ACCENT} cornerRadius={[10, 10, 0, 0]} />
      {layer.columns.map((column, index) => {
        const columnX = columnStarts[index];
        const columnW = layer.width * column.width;
        return (
          <KonvaText
            key={column.key}
            x={columnX}
            y={0}
            width={columnW}
            height={headerHeight}
            text={column.label}
            fill={layer.textColor || "#ffffff"}
            fontSize={layer.fontSize || 16}
            fontStyle="700"
            align="center"
            verticalAlign="middle"
          />
        );
      })}
      {layer.columns.slice(1).map((_, index) => {
        const x = columnStarts[index + 1];
        return (
          <Group key={`column-${index}`}>
            <Line points={[x, 0, x, headerHeight]} stroke="#000000" strokeWidth={1} />
            <Line points={[x, headerHeight, x, layer.height]} stroke="#4b5563" strokeWidth={1} />
          </Group>
        );
      })}
      <Line points={[0, headerHeight, layer.width, headerHeight]} stroke="#000000" strokeWidth={1} />
      {Array.from({ length: layer.rowCount }).map((_, index) => {
        const y = headerHeight + rowHeight * index;
        const textY = headerHeight + rowHeight * index;
        return (
          <Group key={`row-${index}`}>
            {index % 2 === 1 ? (
              <Rect
                x={0}
                y={y}
                width={layer.width}
                height={rowHeight}
                fill="#1f1f1f"
                opacity={0.06}
              />
            ) : null}
            <KonvaText
              x={0}
              y={textY}
              width={layer.width * (layer.columns[0]?.width || 0.1)}
              height={rowHeight}
              text={`${index + 1}`}
              fill={layer.textColor || "#111111"}
              fontSize={layer.fontSize || 16}
              fontStyle="700"
              align="center"
              verticalAlign="middle"
            />
          </Group>
        );
      })}
    </Group>
  );
}

function LogoLayerShape({
  Group,
  Circle,
  Text: KonvaText,
  layer,
  selected,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: {
  Group: ComponentType<any>;
  Circle: ComponentType<any>;
  Text: ComponentType<any>;
  layer: LogoLayer;
  selected: boolean;
  onSelect: () => void;
  onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (event: Konva.KonvaEventObject<Event>) => void;
}) {
  return (
    <Group
      id={layer.id}
      name="template-object"
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      rotation={layer.rotation}
      visible={layer.visible}
      draggable={!layer.locked}
      listening={layer.visible}
      opacity={selected ? 0.98 : 1}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    >
      <Circle
        x={layer.width / 2}
        y={layer.height / 2}
        radius={Math.min(layer.width, layer.height) / 2}
        fill={layer.fill}
        stroke={layer.stroke || "transparent"}
        strokeWidth={1}
      />
      <KonvaText
        x={0}
        y={0}
        width={layer.width}
        height={layer.height}
        text={layer.text}
        fill={layer.textColor}
        fontSize={Math.max(10, Math.round(layer.width * 0.11))}
        fontStyle="800"
        align="center"
        verticalAlign="middle"
      />
    </Group>
  );
}

function SocialsLayerShape({
  Group,
  Text: KonvaText,
  KonvaImage,
  layer,
  selected,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: {
  Group: ComponentType<any>;
  Text: ComponentType<any>;
  KonvaImage: ComponentType<any>;
  layer: SocialsLayer;
  selected: boolean;
  onSelect: () => void;
  onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (event: Konva.KonvaEventObject<Event>) => void;
}) {
  const instagramIcon = useImageElement(SOCIAL_INSTAGRAM_ICON_SRC);
  const facebookIcon = useImageElement(SOCIAL_FACEBOOK_ICON_SRC);
  const youtubeIcon = useImageElement(SOCIAL_YOUTUBE_ICON_SRC);
  const iconSize = 16;
  const gap = 9;
  const startX = 0;
  const iconY = (layer.height - iconSize) / 2;
  const textX = startX + iconSize * 3 + gap * 3 + 7;

  return (
    <Group
      id={layer.id}
      name="template-object"
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      rotation={layer.rotation}
      visible={layer.visible}
      draggable={!layer.locked}
      listening={layer.visible}
      opacity={selected ? 0.98 : 1}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    >
      <KonvaImage image={instagramIcon} x={startX} y={iconY} width={iconSize} height={iconSize} />
      <KonvaImage image={facebookIcon} x={startX + iconSize + gap} y={iconY} width={iconSize} height={iconSize} />
      <KonvaImage image={youtubeIcon} x={startX + iconSize * 2 + gap * 2} y={iconY} width={iconSize} height={iconSize} />

      <KonvaText
        x={textX}
        y={0}
        width={layer.width - textX}
        height={layer.height}
        text={layer.handle.toUpperCase()}
        fill="#111111"
        fontFamily={TABLE_CONTENT_FONT}
        fontSize={12}
        fontStyle="400"
        align="left"
        verticalAlign="middle"
        letterSpacing={1}
      />
    </Group>
  );
}

function TextLayerShape({
  Text: KonvaText,
  layer,
  selected,
  onSelect,
  onDragEnd,
  onTransform,
  onTransformEnd,
}: {
  Text: ComponentType<any>;
  layer: TextLayer;
  selected: boolean;
  onSelect: () => void;
  onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => void;
  onTransform: (event: Konva.KonvaEventObject<Event>) => void;
  onTransformEnd: (event: Konva.KonvaEventObject<Event>) => void;
}) {
  return (
    <KonvaText
      id={layer.id}
      name="template-object"
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      rotation={layer.rotation}
      visible={layer.visible}
      draggable={!layer.locked}
      listening={layer.visible}
      text={layer.text}
      fill={layer.fill}
      stroke={layer.fill}
      strokeWidth={fontWeightStrokeWidth(layer.fontStyle)}
      fontSize={layer.fontSize}
      fontFamily={layer.fontFamily || DEFAULT_TEXT_FONT}
      fontStyle={layer.fontStyle}
      letterSpacing={layer.letterSpacing ?? 0}
      lineHeight={layer.lineHeight ?? 0.85}
      align="left"
      verticalAlign="middle"
      opacity={selected ? 0.98 : 1}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
      onTransform={onTransform}
      onTransformEnd={onTransformEnd}
    />
  );
}

export function TemplateStudioContent() {
  const konva = useKonvaModule();
  useTemplateFonts();
  const { containerRef, scale, zoom, zoomIn, zoomOut, resetZoom } = useStageScale();
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<{ past: TemplateDocument[]; future: TemplateDocument[] }>({ past: [], future: [] });

  const [templatesList, setTemplatesList] = useState<TemplateDocument[]>(() => loadStoredTemplates());
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [document, setDocument] = useState<TemplateDocument>(() => templatesList[0] || normalizeDocument(defaultDocument));
  const [historyVersion, setHistoryVersion] = useState(0);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  useEffect(() => {
    saveStoredTemplates(templatesList);
  }, [templatesList]);

  const layers = useMemo(() => sortLayers(document.layers), [document.layers]);
  const selectedLayer = useMemo(
    () => document.layers.find((layer) => layer.id === selectedLayerId) ?? null,
    [document.layers, selectedLayerId],
  );
  const selectedTextFontOption = useMemo(() => {
    if (!selectedLayer || selectedLayer.kind !== "text") return TEMPLATE_FONT_OPTIONS[0];
    return TEMPLATE_FONT_OPTIONS.find((font) => font.value === selectedLayer.fontFamily) || TEMPLATE_FONT_OPTIONS[0];
  }, [selectedLayer]);

  const applyDocumentChange = useCallback(
    (updater: TemplateDocument | ((current: TemplateDocument) => TemplateDocument)) => {
      setDocument((current) => {
        const nextDocument = typeof updater === "function" ? updater(current) : updater;
        if (nextDocument === current) return current;
        historyRef.current = {
          past: [...historyRef.current.past.slice(-HISTORY_LIMIT + 1), cloneDocument(current)],
          future: [],
        };
        setHistoryVersion((version) => version + 1);

        setTemplatesList((prev) =>
          prev.map((doc, idx) => (idx === selectedTemplateIndex ? nextDocument : doc))
        );

        return nextDocument;
      });
    },
    [selectedTemplateIndex],
  );

  const updateLayer = useCallback(
    (layerId: string, patch: LayerPatch) => {
      applyDocumentChange((current) => ({
        ...current,
        layers: updateLayerById(current.layers, layerId, patch),
      }));
    },
    [applyDocumentChange],
  );

  const switchTemplate = (index: number) => {
    if (!templatesList[index]) return;
    setSelectedTemplateIndex(index);
    setDocument(normalizeDocument(templatesList[index]));
    setSelectedLayerId(null);
    historyRef.current = { past: [], future: [] };
    setHistoryVersion(0);
  };

  const handleCreateNewBlankTemplate = () => {
    const blank = createBlankCanvasTemplate(`Blank 4:5 Template (${templatesList.length + 1})`);
    const nextList = [...templatesList, blank];
    setTemplatesList(nextList);
    setSelectedTemplateIndex(nextList.length - 1);
    setDocument(blank);
    setSelectedLayerId(null);
    historyRef.current = { past: [], future: [] };
    setHistoryVersion(0);
  };

  const handleCloneTemplate = () => {
    const cloned: TemplateDocument = {
      ...cloneDocument(document),
      id: `template-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${document.name} Copy`,
    };
    const nextList = [...templatesList, cloned];
    setTemplatesList(nextList);
    setSelectedTemplateIndex(nextList.length - 1);
    setDocument(cloned);
    setSelectedLayerId(null);
    historyRef.current = { past: [], future: [] };
    setHistoryVersion(0);
  };

  const handleDeleteTemplate = () => {
    if (templatesList.length <= 1) {
      alert("Cannot delete the only template remaining.");
      return;
    }
    const nextList = templatesList.filter((_, idx) => idx !== selectedTemplateIndex);
    setTemplatesList(nextList);
    const nextIdx = Math.max(0, selectedTemplateIndex - 1);
    setSelectedTemplateIndex(nextIdx);
    setDocument(normalizeDocument(nextList[nextIdx]));
    setSelectedLayerId(null);
    historyRef.current = { past: [], future: [] };
    setHistoryVersion(0);
  };

  const undo = useCallback(() => {
    setDocument((current) => {
      const previous = historyRef.current.past.at(-1);
      if (!previous) return current;
      historyRef.current = {
        past: historyRef.current.past.slice(0, -1),
        future: [cloneDocument(current), ...historyRef.current.future.slice(0, HISTORY_LIMIT - 1)],
      };
      setHistoryVersion((version) => version + 1);
      setTemplatesList((prev) =>
        prev.map((doc, idx) => (idx === selectedTemplateIndex ? previous : doc))
      );
      return previous;
    });
  }, [selectedTemplateIndex]);

  const redo = useCallback(() => {
    setDocument((current) => {
      const next = historyRef.current.future[0];
      if (!next) return current;
      historyRef.current = {
        past: [...historyRef.current.past.slice(-HISTORY_LIMIT + 1), cloneDocument(current)],
        future: historyRef.current.future.slice(1),
      };
      setHistoryVersion((version) => version + 1);
      setTemplatesList((prev) =>
        prev.map((doc, idx) => (idx === selectedTemplateIndex ? next : doc))
      );
      return next;
    });
  }, [selectedTemplateIndex]);

  const canUndo = historyVersion >= 0 && historyRef.current.past.length > 0;
  const canRedo = historyVersion >= 0 && historyRef.current.future.length > 0;

  useEffect(() => {
    if (!konva || !transformerRef.current || !stageRef.current || !selectedLayer) return;

    const node = stageRef.current.findOne(`#${selectedLayer.id}`);
    if (!node || selectedLayer.locked || !selectedLayer.visible) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
      return;
    }

    transformerRef.current.nodes([node]);
    transformerRef.current.getLayer()?.batchDraw();
  }, [konva, selectedLayer]);

  const nudgeLayer = useCallback(
    (layerId: string, dx: number, dy: number) => {
      const layer = document.layers.find((item) => item.id === layerId);
      if (!layer || layer.locked) return;
      updateLayer(layerId, { x: layer.x + dx, y: layer.y + dy });
    },
    [document.layers, updateLayer],
  );

  const duplicateLayer = useCallback(() => {
    if (!selectedLayer || selectedLayer.locked || selectedLayer.kind === "socials") return;
    const id = createLayerId(selectedLayer.kind);
    const zIndex = Math.max(...document.layers.map((layer) => layer.zIndex), 0) + 10;
    const duplicate = {
      ...selectedLayer,
      id,
      name: `${selectedLayer.name} Copy`,
      x: selectedLayer.x,
      y: selectedLayer.y,
      zIndex,
      locked: false,
      aspectRatioLocked: selectedLayer.aspectRatioLocked,
    } as TemplateLayer;
    applyDocumentChange((current) => ({ ...current, layers: [...current.layers, duplicate] }));
    setSelectedLayerId(id);
  }, [applyDocumentChange, document.layers, selectedLayer]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCtrlEnter = (event.ctrlKey || event.metaKey) && event.key === "Enter";
      if (isCtrlEnter) {
        event.preventDefault();
        const currentSelected = document.layers.find((l) => l.id === selectedLayerId);
        if (!currentSelected || currentSelected.kind !== "text") {
          const firstText = document.layers.find((l) => l.kind === "text");
          if (firstText) {
            setSelectedLayerId(firstText.id);
          }
        }
        setTimeout(() => {
          textInputRef.current?.focus();
          textInputRef.current?.select();
        }, 50);
        return;
      }

      if (event.key === "Escape") {
        if (typeof window !== "undefined" && window.document.activeElement instanceof HTMLElement) {
          window.document.activeElement.blur();
        }
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      const isUndo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey;
      const isRedo =
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") ||
        ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "z");
      const isDuplicate = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d";
      const isZoomIn = (event.ctrlKey || event.metaKey) && (event.key === "+" || event.key === "=");
      const isZoomOut = (event.ctrlKey || event.metaKey) && event.key === "-";
      const isZoomReset = (event.ctrlKey || event.metaKey) && event.key === "0";
      if (isZoomIn || isZoomOut || isZoomReset) {
        event.preventDefault();
        if (isZoomIn) zoomIn();
        if (isZoomOut) zoomOut();
        if (isZoomReset) resetZoom();
        return;
      }
      if (isUndo || isRedo) {
        event.preventDefault();
        if (isUndo) undo();
        if (isRedo) redo();
        return;
      }
      if (isDuplicate) {
        event.preventDefault();
        duplicateLayer();
        return;
      }

      if (!selectedLayerId) return;

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        const layer = document.layers.find((item) => item.id === selectedLayerId);
        if (!layer || layer.locked || layer.kind === "socials") return;
        applyDocumentChange((current) => ({
          ...current,
          layers: current.layers.filter((item) => item.id !== selectedLayerId),
        }));
        setSelectedLayerId(null);
        return;
      }

      const step = event.shiftKey ? 5 : 1;
      const movement: Partial<Record<string, [number, number]>> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const delta = movement[event.key];
      if (!delta) return;

      event.preventDefault();
      nudgeLayer(selectedLayerId, delta[0], delta[1]);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [applyDocumentChange, document.layers, duplicateLayer, nudgeLayer, redo, resetZoom, selectedLayerId, undo, zoomIn, zoomOut]);

  const handleDragEnd = (layer: TemplateLayer) => (event: Konva.KonvaEventObject<DragEvent>) => {
    updateLayer(layer.id, {
      x: Math.round(event.target.x()),
      y: Math.round(event.target.y()),
    });
  };

  const handleTextTransform = (layer: TextLayer) => (event: Konva.KonvaEventObject<Event>) => {
    const node = event.target;
    const nextWidth = Math.max(MIN_LAYER_SIZE, node.width() * node.scaleX());
    node.width(nextWidth);
    node.scaleX(1);
    node.getLayer()?.batchDraw();
  };

  const handleTransformEnd = (layer: TemplateLayer) => (event: Konva.KonvaEventObject<Event>) => {
    const node = event.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    if (layer.kind === "socials") {
      node.scaleX(1);
      node.scaleY(1);
      updateLayer(layer.id, {
        x: Math.round(node.x()),
        y: Math.round(node.y()),
        rotation: 0,
      });
      return;
    }
    if (layer.kind === "text") {
      const nextWidth = Math.max(MIN_LAYER_SIZE, Math.round(node.width() * scaleX));
      const nextHeight = Math.max(MIN_LAYER_SIZE, Math.round(layer.height * scaleY));

      node.width(nextWidth);
      node.scaleX(1);
      node.scaleY(1);

      updateLayer(layer.id, {
        x: Math.round(node.x()),
        y: Math.round(node.y()),
        width: nextWidth,
        height: nextHeight,
        rotation: Math.round(node.rotation()),
      });
      return;
    }

    const uniformScale = Math.max(Math.abs(scaleX), Math.abs(scaleY));
    const nextWidth = Math.max(
      MIN_LAYER_SIZE,
      Math.round(layer.width * (layer.aspectRatioLocked ? uniformScale : scaleX)),
    );
    const nextHeight = Math.max(
      MIN_LAYER_SIZE,
      Math.round(layer.height * (layer.aspectRatioLocked ? uniformScale : scaleY)),
    );

    node.scaleX(1);
    node.scaleY(1);

    updateLayer(layer.id, {
      x: Math.round(node.x()),
      y: Math.round(node.y()),
      width: nextWidth,
      height: nextHeight,
      rotation: Math.round(node.rotation()),
    });
  };

  const addLogo = () => {
    const zIndex = Math.max(...document.layers.map((layer) => layer.zIndex), 0) + 10;
    const id = createLayerId("logo");
    const nextLayer: LogoLayer = {
      id,
      name: "Logo Placeholder",
      kind: "logo",
      x: Math.round((document.width - 150) / 2),
      y: 90,
      width: 150,
      height: 150,
      rotation: 0,
      zIndex,
      visible: true,
      locked: false,
      aspectRatioLocked: true,
      text: "YOUR\nLOGO",
      fill: "#000000",
      stroke: "transparent",
      textColor: "#ffffff",
    };
    applyDocumentChange((current) => ({ ...current, layers: [...current.layers, nextLayer] }));
    setSelectedLayerId(id);
  };

  const addText = () => {
    const zIndex = Math.max(...document.layers.map((layer) => layer.zIndex), 0) + 10;
    const id = createLayerId("text");
    const nextLayer: TextLayer = {
      id,
      name: "Text",
      kind: "text",
      x: 100,
      y: 1220,
      width: 420,
      height: 50,
      rotation: 0,
      zIndex,
      visible: true,
      locked: false,
      aspectRatioLocked: false,
      text: "TOURNAMENT STANDINGS",
      fill: document.defaultAccent || DEFAULT_ACCENT,
      fontSize: 28,
      fontFamily: DEFAULT_TEXT_FONT,
      fontStyle: "700",
      letterSpacing: 0,
    };
    applyDocumentChange((current) => ({ ...current, layers: [...current.layers, nextLayer] }));
    setSelectedLayerId(id);
  };

  const addTable = () => {
    const zIndex = Math.max(...document.layers.map((layer) => layer.zIndex), 0) + 10;
    const id = createLayerId("table");

    const tableGraphic = document.layers.find(
      (layer) => layer.kind === "image" && (layer.name.toLowerCase().includes("table") || layer.name.toLowerCase().includes("card") || layer.name.toLowerCase().includes("board"))
    );

    const nextLayer: TableLayer = {
      ...defaultTableTextLayer,
      id,
      name: "Standings Table",
      x: tableGraphic ? tableGraphic.x : defaultTableTextLayer.x,
      y: tableGraphic ? tableGraphic.y : defaultTableTextLayer.y,
      width: tableGraphic ? tableGraphic.width : defaultTableTextLayer.width,
      height: tableGraphic ? tableGraphic.height : defaultTableTextLayer.height,
      zIndex,
      visible: true,
      locked: false,
    };
    applyDocumentChange((current) => ({ ...current, layers: [...current.layers, nextLayer] }));
    setSelectedLayerId(id);
  };



  const deleteLayer = () => {
    if (!selectedLayer || selectedLayer.locked || selectedLayer.kind === "socials") return;
    applyDocumentChange((current) => ({
      ...current,
      layers: current.layers.filter((layer) => layer.id !== selectedLayer.id),
    }));
    setSelectedLayerId(null);
  };

  const moveLayerOrder = (direction: "up" | "down") => {
    if (!selectedLayer) return;
    updateLayer(selectedLayer.id, {
      zIndex: selectedLayer.zIndex + (direction === "up" ? 10 : -10),
    });
  };

  const alignSelectedLayer = (mode: "horizontal" | "vertical" | "both") => {
    if (!selectedLayer || selectedLayer.locked) return;

    updateLayer(selectedLayer.id, {
      ...(mode === "horizontal" || mode === "both"
        ? { x: Math.round((document.width - selectedLayer.width) / 2) }
        : {}),
      ...(mode === "vertical" || mode === "both"
        ? { y: Math.round((document.height - selectedLayer.height) / 2) }
        : {}),
    });
  };

  const scaleSelectedToFit = (mode: "fill" | "contain" | "cover" = "fill") => {
    if (!selectedLayer || selectedLayer.locked) return;

    if (mode === "fill") {
      updateLayer(selectedLayer.id, {
        x: 0,
        y: 0,
        width: document.width,
        height: document.height,
        rotation: 0,
      });
      return;
    }

    const currentW = selectedLayer.width || 1;
    const currentH = selectedLayer.height || 1;
    const currentRatio = currentW / currentH;
    const canvasRatio = document.width / document.height;

    let newW = document.width;
    let newH = document.height;

    if (mode === "contain") {
      if (currentRatio > canvasRatio) {
        newW = document.width;
        newH = Math.round(document.width / currentRatio);
      } else {
        newH = document.height;
        newW = Math.round(document.height * currentRatio);
      }
    } else if (mode === "cover") {
      if (currentRatio > canvasRatio) {
        newH = document.height;
        newW = Math.round(document.height * currentRatio);
      } else {
        newW = document.width;
        newH = Math.round(document.width / currentRatio);
      }
    }

    const newX = Math.round((document.width - newW) / 2);
    const newY = Math.round((document.height - newH) / 2);

    updateLayer(selectedLayer.id, {
      x: newX,
      y: newY,
      width: Math.max(MIN_LAYER_SIZE, newW),
      height: Math.max(MIN_LAYER_SIZE, newH),
      rotation: 0,
    });
  };

  const exportPng = async () => {
    const stage = stageRef.current;
    if (!stage) return;
    const progress = await beginExportProgress();
    const previousScale = {
      x: stage.scaleX(),
      y: stage.scaleY(),
    };
    const previousSize = {
      width: stage.width(),
      height: stage.height(),
    };

    try {
      progress.update(20);
      stage.scale({ x: 1, y: 1 });
      stage.size({ width: document.width, height: document.height });
      stage.batchDraw();

      const dataUrl = stage.toDataURL({
        x: 0,
        y: 0,
        width: document.width,
        height: document.height,
        pixelRatio: 3,
        mimeType: "image/png",
      });
      progress.update(90);

      stage.scale(previousScale);
      stage.size(previousSize);
      stage.batchDraw();

      const link = window.document.createElement("a");
      link.download = `${document.name.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = dataUrl;
      link.click();
      progress.complete();
    } catch (error) {
      stage.scale(previousScale);
      stage.size(previousSize);
      stage.batchDraw();
      progress.dismiss();
      throw error;
    }
  };

  const resetDocument = () => {
    const nextDocument = normalizeDocument(cloneDocument(defaultDocument));
    applyDocumentChange(nextDocument);
    setSelectedLayerId(null);
  };

  const uploadImageLayer = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const imageSrc = String(reader.result);
      const uploadedImage = new window.Image();
      const id = createLayerId("image");
      const zIndex = Math.max(...document.layers.map((layer) => layer.zIndex), 0) + 10;

      const addLayer = (naturalWidth: number, naturalHeight: number) => {
        const maxWidth = Math.round(document.width * 0.45);
        const maxHeight = Math.round(document.height * 0.45);
        const scale = Math.min(1, maxWidth / naturalWidth, maxHeight / naturalHeight);
        const width = Math.max(MIN_LAYER_SIZE, Math.round(naturalWidth * scale));
        const height = Math.max(MIN_LAYER_SIZE, Math.round(naturalHeight * scale));
        const nextLayer: ImageLayer = {
          id,
          name: file.name.replace(/\.[^.]+$/, "") || "Image",
          kind: "image",
          src: imageSrc,
          x: Math.round((document.width - width) / 2),
          y: Math.round((document.height - height) / 2),
          width,
          height,
          rotation: 0,
          zIndex,
          visible: true,
          locked: false,
          aspectRatioLocked: true,
        };
        applyDocumentChange((current) => ({ ...current, layers: [...current.layers, nextLayer] }));
        setSelectedLayerId(id);
      };

      uploadedImage.onload = () => addLayer(uploadedImage.naturalWidth || 260, uploadedImage.naturalHeight || 180);
      uploadedImage.onerror = () => addLayer(260, 180);
      uploadedImage.src = imageSrc;
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const renderLayer = (layer: TemplateLayer) => {
    if (!konva) return null;
    const common = {
      selected: layer.id === selectedLayerId,
      onSelect: () => setSelectedLayerId(layer.id),
      onDragEnd: handleDragEnd(layer),
      onTransformEnd: handleTransformEnd(layer),
    };

    if (layer.kind === "image") {
      return (
        <KonvaImageLayer
          key={layer.id}
          Group={konva.Group}
          Rect={konva.Rect}
          KonvaImage={konva.Image}
          layer={layer}
          {...common}
        />
      );
    }
    if (layer.kind === "table") {
      return (
        <TableLayerShape
          key={layer.id}
          Group={konva.Group}
          Rect={konva.Rect}
          Text={konva.Text}
          Line={konva.Line}
          KonvaImage={konva.Image}
          layer={layer}
          {...common}
        />
      );
    }
    if (layer.kind === "logo") {
      return (
        <LogoLayerShape
          key={layer.id}
          Group={konva.Group}
          Circle={konva.Circle}
          Text={konva.Text}
          layer={layer}
          {...common}
        />
      );
    }
    if (layer.kind === "socials") {
      return (
        <SocialsLayerShape
          key={layer.id}
          Group={konva.Group}
          Text={konva.Text}
          KonvaImage={konva.Image}
          layer={layer}
          {...common}
        />
      );
    }
    return <TextLayerShape key={layer.id} Text={konva.Text} layer={layer} onTransform={handleTextTransform(layer)} {...common} />;
  };

  const Stage = konva?.Stage;
  const Layer = konva?.Layer;
  const Rect = konva?.Rect;
  const Transformer = konva?.Transformer;

  return (
    <main className="min-h-0 flex-1 overflow-hidden p-6">
      <div className="mx-auto flex h-full max-w-[1540px] gap-6">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Top Header & Toolbar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <select
                value={selectedTemplateIndex}
                onChange={(e) => switchTemplate(Number(e.target.value))}
                className="h-9 rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[13px] font-semibold text-[#000000] outline-none transition focus:border-[#000000]"
              >
                {templatesList.map((tpl, index) => (
                  <option key={tpl.id || index} value={index}>
                    {tpl.name || `Template ${index + 1}`}
                  </option>
                ))}
              </select>

              <ToolbarButton onClick={handleCreateNewBlankTemplate} title="Create clean blank 4:5 canvas">
                <Plus className="h-4 w-4 text-[#000000]" />
                New
              </ToolbarButton>

              <ToolbarButton onClick={handleCloneTemplate} title="Clone current template">
                <Copy className="h-4 w-4 text-[#000000]" />
                Clone
              </ToolbarButton>

              <div className="hidden items-center gap-1.5 text-[12px] text-[#9aa1b0] xl:flex">
                <Image className="h-3.5 w-3.5 text-[#9aa1b0]" />
                {document.width} x {document.height} (4:5)
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ToolbarButton onClick={undo} disabled={!canUndo}>
                <Undo2 className="h-4 w-4" />
                Undo
              </ToolbarButton>
              <ToolbarButton onClick={redo} disabled={!canRedo}>
                <Redo2 className="h-4 w-4" />
                Redo
              </ToolbarButton>
              <ToolbarButton onClick={zoomOut} disabled={zoom <= 0.25}>
                <ZoomOut className="h-4 w-4" />
                Zoom
              </ToolbarButton>
              <button
                type="button"
                onClick={resetZoom}
                className="h-9 min-w-[58px] cursor-pointer rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[13px] font-semibold text-[#000000] transition hover:bg-[#f7f8fb]"
                title="Reset canvas zoom"
              >
                {Math.round(zoom * 100)}%
              </button>
              <ToolbarButton onClick={zoomIn} disabled={zoom >= 4}>
                <ZoomIn className="h-4 w-4" />
                Zoom
              </ToolbarButton>
              <ToolbarButton onClick={addLogo}>
                <Plus className="h-4 w-4" />
                Logo
              </ToolbarButton>
              <ToolbarButton onClick={addText}>
                <Type className="h-4 w-4" />
                Text
              </ToolbarButton>
              <ToolbarButton onClick={addTable} title="Add Standings Table Layer">
                <TableIcon className="h-4 w-4" />
                Table
              </ToolbarButton>
              <ToolbarButton onClick={() => uploadInputRef.current?.click()}>
                <Image className="h-4 w-4" />
                Image
              </ToolbarButton>
              <ToolbarButton onClick={exportPng}>
                <Download className="h-4 w-4" />
                Export
              </ToolbarButton>
              <input ref={uploadInputRef} type="file" accept="image/*" onChange={uploadImageLayer} className="hidden" />
            </div>
          </div>

          {/* Center Canvas */}
          <div ref={containerRef} className="min-h-0 flex-1 overflow-auto rounded-[12px] border border-[#dfe3eb] bg-[#f6f7fa] p-4">
            <div className="grid min-h-full min-w-full place-items-center">
              <div
                style={{
                  width: document.width * scale,
                  height: document.height * scale,
                  boxShadow: "0 18px 48px rgba(0,0,0,0.16)",
                }}
              >
                {Stage && Layer && Rect && Transformer ? (
                  <Stage
                    ref={stageRef}
                    width={document.width}
                    height={document.height}
                    scaleX={scale}
                    scaleY={scale}
                    onMouseDown={(event: Konva.KonvaEventObject<MouseEvent>) => {
                      if (event.target === event.target.getStage()) setSelectedLayerId(null);
                    }}
                    onTouchStart={(event: Konva.KonvaEventObject<TouchEvent>) => {
                      if (event.target === event.target.getStage()) setSelectedLayerId(null);
                    }}
                  >
                    <Layer>
                      <Rect width={document.width} height={document.height} fill={document.background || "#ffffff"} />
                      {layers.map(renderLayer)}
                      <Transformer
                        ref={transformerRef}
                        rotateEnabled={selectedLayer?.kind !== "socials"}
                        keepRatio={selectedLayer?.aspectRatioLocked ?? false}
                        enabledAnchors={
                          selectedLayer?.kind === "socials"
                            ? []
                            : [
                                "top-left",
                                "top-center",
                                "top-right",
                                "middle-left",
                                "middle-right",
                                "bottom-left",
                                "bottom-center",
                                "bottom-right",
                              ]
                        }
                        boundBoxFunc={(
                          oldBox: { x: number; y: number; width: number; height: number; rotation: number },
                          newBox: { x: number; y: number; width: number; height: number; rotation: number },
                        ) =>
                          newBox.width < MIN_LAYER_SIZE || newBox.height < MIN_LAYER_SIZE ? oldBox : newBox
                        }
                        borderStroke="#3b82f6"
                        anchorStroke="#3b82f6"
                        anchorFill="#ffffff"
                      />
                    </Layer>
                  </Stage>
                ) : (
                  <div className="grid h-full w-full place-items-center bg-[#111111] text-[13px] font-medium text-white">
                    Loading editor...
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Right Sidebar */}
        <aside
          className="flex w-[340px] shrink-0 flex-col overflow-hidden rounded-[12px] border border-[#dfe3eb] bg-white"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="border-b border-[#eef0f4] p-3">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#000000]">
              <Layers className="h-3.5 w-3.5" />
              Layers ({document.layers.length})
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {/* Layers List */}
            <div className="max-h-[220px] space-y-1.5 overflow-y-auto border-b border-[#eef0f4] p-3">
              {layers.length === 0 ? (
                <p className="py-4 text-center text-[12px] text-[#9aa1b0]">No layers. Click Logo, Text or Image to add elements.</p>
              ) : (
                [...layers].reverse().map((layer) => {
                  const isSelected = layer.id === selectedLayerId;
                  return (
                    <button
                      key={layer.id}
                      type="button"
                      onClick={() => setSelectedLayerId(layer.id)}
                      className={`flex h-[38px] w-full cursor-pointer items-center justify-between rounded-[8px] border px-3 text-left transition ${
                        isSelected
                          ? "border-[#000000] bg-[#f0f1f3] text-[#000000]"
                          : "border-transparent bg-white text-[#666666] hover:border-[#eef0f4] hover:bg-[#f9fbfc]"
                      }`}
                    >
                      <span className="min-w-0 truncate text-[13px] font-medium">{layer.name}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9aa1b0]">{layer.kind}</span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation();
                            updateLayer(layer.id, { visible: !layer.visible });
                            if (selectedLayerId === layer.id && layer.visible) setSelectedLayerId(null);
                          }}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter" && event.key !== " ") return;
                            event.preventDefault();
                            event.stopPropagation();
                            updateLayer(layer.id, { visible: !layer.visible });
                            if (selectedLayerId === layer.id && layer.visible) setSelectedLayerId(null);
                          }}
                          className="grid h-7 w-7 place-items-center rounded-[6px] text-[#9aa1b0] transition hover:bg-white hover:text-[#000000]"
                          aria-label={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
                          title={layer.visible ? "Hide layer" : "Show layer"}
                        >
                          {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-[#ef4444]" />}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Inspector */}
            <div className="p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[#000000]">
                    {selectedLayer ? selectedLayer.name : "Template Properties"}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#9aa1b0]">
                    {selectedLayer ? `${selectedLayer.kind} layer` : "Canvas & theme settings"}
                  </p>
                </div>
                <Move className="mt-0.5 h-4 w-4 shrink-0 text-[#9aa1b0]" />
              </div>

              {!selectedLayer ? (
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9aa1b0]">
                      Template Name
                    </span>
                    <input
                      value={document.name}
                      onChange={(e) => applyDocumentChange((curr) => ({ ...curr, name: e.target.value }))}
                      className="h-9 w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[13px] font-medium text-[#000000] outline-none focus:border-[#000000]"
                    />
                  </label>

                  <div className="grid grid-cols-[minmax(0,1fr)_80px] gap-3">
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9aa1b0]">
                        Canvas Background
                      </span>
                      <input
                        type="text"
                        value={document.background}
                        onChange={(e) => applyDocumentChange((curr) => ({ ...curr, background: e.target.value }))}
                        className="h-9 w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[13px] font-medium text-[#000000] outline-none focus:border-[#000000]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9aa1b0]">
                        Color
                      </span>
                      <input
                        type="color"
                        value={/^#[0-9a-fA-F]{6}$/.test(document.background) ? document.background : "#ffffff"}
                        onChange={(e) => applyDocumentChange((curr) => ({ ...curr, background: e.target.value }))}
                        className="h-9 w-full cursor-pointer rounded-[8px] border border-[#e2e5ec] bg-white p-1"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-[minmax(0,1fr)_80px] gap-3">
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9aa1b0]">
                        Default Accent
                      </span>
                      <input
                        type="text"
                        value={document.defaultAccent || DEFAULT_ACCENT}
                        onChange={(e) => applyDocumentChange((curr) => ({ ...curr, defaultAccent: e.target.value }))}
                        className="h-9 w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[13px] font-medium text-[#000000] outline-none focus:border-[#000000]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9aa1b0]">
                        Color
                      </span>
                      <input
                        type="color"
                        value={/^#[0-9a-fA-F]{6}$/.test(document.defaultAccent || "") ? document.defaultAccent : DEFAULT_ACCENT}
                        onChange={(e) => applyDocumentChange((curr) => ({ ...curr, defaultAccent: e.target.value }))}
                        className="h-9 w-full cursor-pointer rounded-[8px] border border-[#e2e5ec] bg-white p-1"
                      />
                    </label>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleDeleteTemplate}
                      className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-[#fca5a5] bg-[#fff5f5] text-[13px] font-semibold text-[#dc2626] transition hover:bg-[#fee2e2]"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Template
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <input
                    value={selectedLayer.name}
                    onChange={(event) => updateLayer(selectedLayer.id, { name: event.target.value })}
                    disabled={selectedLayer.kind === "socials"}
                    className="h-9 w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[13px] font-medium text-[#000000] outline-none focus:border-[#000000] disabled:bg-[#f7f8fb] disabled:text-[#9aa1b0]"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <InspectorInput
                      label="X"
                      value={selectedLayer.x}
                      disabled={selectedLayer.locked}
                      onChange={(value) => updateLayer(selectedLayer.id, { x: value })}
                    />
                    <InspectorInput
                      label="Y"
                      value={selectedLayer.y}
                      disabled={selectedLayer.locked}
                      onChange={(value) => updateLayer(selectedLayer.id, { y: value })}
                    />
                    <InspectorInput
                      label="W"
                      value={selectedLayer.width}
                      disabled={selectedLayer.locked || selectedLayer.kind === "socials"}
                      onChange={(value) => updateLayer(selectedLayer.id, { width: Math.max(MIN_LAYER_SIZE, value) })}
                    />
                    <InspectorInput
                      label="H"
                      value={selectedLayer.height}
                      disabled={selectedLayer.locked || selectedLayer.kind === "socials"}
                      onChange={(value) => updateLayer(selectedLayer.id, { height: Math.max(MIN_LAYER_SIZE, value) })}
                    />
                    <InspectorInput
                      label="Rot"
                      value={selectedLayer.rotation}
                      disabled={selectedLayer.locked || selectedLayer.kind === "socials"}
                      onChange={(value) => updateLayer(selectedLayer.id, { rotation: value })}
                    />
                    <InspectorInput
                      label="Z"
                      value={selectedLayer.zIndex}
                      onChange={(value) => updateLayer(selectedLayer.id, { zIndex: value })}
                    />
                  </div>

                  {selectedLayer.kind === "table" ? (
                    <div className="space-y-3">
                      {document.layers.some((l) => l.kind === "image" && l.id !== selectedLayer.id) ? (
                        <button
                          type="button"
                          onClick={() => {
                            const targetImg =
                              document.layers.find(
                                (l) => l.kind === "image" && (l.name.toLowerCase().includes("table") || l.name.toLowerCase().includes("card") || l.name.toLowerCase().includes("board"))
                              ) || document.layers.find((l) => l.kind === "image" && l.id !== selectedLayer.id);
                            if (targetImg) {
                              updateLayer(selectedLayer.id, {
                                x: targetImg.x,
                                y: targetImg.y,
                                width: targetImg.width,
                                height: targetImg.height,
                              });
                            }
                          }}
                          className="h-9 w-full cursor-pointer rounded-[8px] border border-[#000000] bg-[#000000] px-3 text-[12px] font-semibold text-white transition hover:bg-[#222]"
                        >
                          Snap Bounds to "{document.layers.find((l) => l.kind === "image" && (l.name.toLowerCase().includes("table") || l.name.toLowerCase().includes("card")))?.name || "Graphic Card"}"
                        </button>
                      ) : null}

                      <label className="block">
                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9aa1b0]">
                          Preset Dimensions & Columns
                        </span>
                        <select
                          onChange={(e) => {
                            if (e.target.value === "winter-8") {
                              updateLayer(selectedLayer.id, {
                                x: 47,
                                y: 490,
                                width: 1036,
                                height: 638,
                                headerHeight: 63,
                                rowCount: 8,
                                fontSize: 26,
                                accentColor: "#38bdf8",
                                columns: WINTER_SERIES_TABLE_COLUMNS,
                              });
                            } else if (e.target.value === "br-12") {
                              updateLayer(selectedLayer.id, {
                                x: 47,
                                y: 490,
                                width: 1036,
                                height: 638,
                                headerHeight: 50,
                                rowCount: 12,
                                fontSize: 21,
                                accentColor: "#ff6a00",
                                columns: STANDARD_BR_TABLE_COLUMNS,
                              });
                            } else if (e.target.value === "br-16") {
                              updateLayer(selectedLayer.id, {
                                x: 47,
                                y: 490,
                                width: 1036,
                                height: 638,
                                headerHeight: 44,
                                rowCount: 16,
                                fontSize: 17,
                                accentColor: "#ff6a00",
                                columns: STANDARD_BR_TABLE_COLUMNS,
                              });
                            }
                          }}
                          className="h-9 w-full rounded-[8px] border border-[#e2e5ec] bg-white px-2 text-[12px] font-medium text-[#000000] outline-none focus:border-[#000000]"
                          defaultValue={selectedLayer.rowCount === 8 ? "winter-8" : selectedLayer.rowCount === 16 ? "br-16" : "br-12"}
                        >
                          <option value="winter-8">Winter Series (8 Rows, 63px Header, Wins/Kills/Pts/Total)</option>
                          <option value="br-12">Universal BR (12 Rows, Match/WWCD/Fins/Total)</option>
                          <option value="br-16">Universal BR (16 Rows, Match/WWCD/Fins/Total)</option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9aa1b0]">
                          Table Style
                        </span>
                        <select
                          value={selectedLayer.variant || "text-only"}
                          onChange={(event) => updateLayer(selectedLayer.id, { variant: event.target.value as any })}
                          className="h-9 w-full rounded-[8px] border border-[#e2e5ec] bg-white px-2 text-[12px] font-medium text-[#000000] outline-none focus:border-[#000000]"
                        >
                          <option value="text-only">Text Only (Overlay on Graphic Card)</option>
                          <option value="premium-overall-standings">Full Styled Table Card</option>
                        </select>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <InspectorInput
                          label="Rows"
                          value={selectedLayer.rowCount}
                          onChange={(value) => updateLayer(selectedLayer.id, { rowCount: Math.max(1, Math.round(value)) })}
                        />
                        <InspectorInput
                          label="Header H"
                          value={selectedLayer.headerHeight}
                          onChange={(value) => updateLayer(selectedLayer.id, { headerHeight: Math.max(0, value) })}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => updateLayer(selectedLayer.id, { showHeader: selectedLayer.showHeader === false ? true : false })}
                        className="h-9 w-full cursor-pointer rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[13px] font-medium text-[#000000] transition hover:bg-[#f7f8fb]"
                      >
                        {selectedLayer.showHeader === false ? "Show Header Row Text" : "Hide Header Row Text"}
                      </button>

                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9aa1b0]">
                            Font Family
                          </span>
                          <select
                            value={selectedLayer.fontFamily || "Bebas Neue"}
                            onChange={(event) => {
                              const fontOption =
                                TEMPLATE_FONT_OPTIONS.find((font) => font.value === event.target.value) ||
                                TEMPLATE_FONT_OPTIONS[0];
                              updateLayer(selectedLayer.id, {
                                fontFamily: fontOption.value,
                                fontStyle: fontOption.weights[0].value,
                              });
                            }}
                            className="h-9 w-full rounded-[8px] border border-[#e2e5ec] bg-white px-2 text-[12px] font-medium text-[#000000] outline-none focus:border-[#000000]"
                          >
                            {TEMPLATE_FONT_OPTIONS.map((font) => (
                              <option key={font.value} value={font.value}>
                                {font.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9aa1b0]">
                            Weight
                          </span>
                          <select
                            value={selectedLayer.fontStyle || "bold"}
                            onChange={(event) => updateLayer(selectedLayer.id, { fontStyle: event.target.value })}
                            className="h-9 w-full rounded-[8px] border border-[#e2e5ec] bg-white px-2 text-[12px] font-medium text-[#000000] outline-none focus:border-[#000000]"
                          >
                            {(TEMPLATE_FONT_OPTIONS.find((f) => f.value === (selectedLayer.fontFamily || "Bebas Neue")) || TEMPLATE_FONT_OPTIONS[0]).weights.map((w) => (
                              <option key={w.value} value={w.value}>
                                {w.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <InspectorInput
                          label="Font Size"
                          value={selectedLayer.fontSize || 22}
                          onChange={(value) => updateLayer(selectedLayer.id, { fontSize: Math.max(8, value) })}
                        />
                        <InspectorInput
                          label="Line Height"
                          value={selectedLayer.lineHeight ?? 0.85}
                          step={0.05}
                          onChange={(value) => updateLayer(selectedLayer.id, { lineHeight: Math.max(0.4, value) })}
                        />
                      </div>

                      <div className="grid grid-cols-[minmax(0,1fr)_80px] gap-3">
                        <label className="block">
                          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9aa1b0]">
                            Text Color
                          </span>
                          <input
                            type="text"
                            value={selectedLayer.textColor || selectedLayer.fill || "#ffffff"}
                            onChange={(event) => updateLayer(selectedLayer.id, { textColor: event.target.value, fill: event.target.value })}
                            className="h-9 w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[13px] font-medium text-[#000000] outline-none focus:border-[#000000]"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9aa1b0]">
                            Color
                          </span>
                          <input
                            type="color"
                            value={/^#[0-9a-fA-F]{6}$/.test(selectedLayer.textColor || selectedLayer.fill || "") ? (selectedLayer.textColor || selectedLayer.fill) : "#ffffff"}
                            onChange={(event) => updateLayer(selectedLayer.id, { textColor: event.target.value, fill: event.target.value })}
                            className="h-9 w-full cursor-pointer rounded-[8px] border border-[#e2e5ec] bg-white p-1"
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-[minmax(0,1fr)_80px] gap-3">
                        <label className="block">
                          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9aa1b0]">
                            Total Column Glow
                          </span>
                          <input
                            type="text"
                            value={selectedLayer.accentColor || "#38bdf8"}
                            onChange={(event) => updateLayer(selectedLayer.id, { accentColor: event.target.value })}
                            className="h-9 w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[13px] font-medium text-[#000000] outline-none focus:border-[#000000]"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9aa1b0]">
                            Glow
                          </span>
                          <input
                            type="color"
                            value={/^#[0-9a-fA-F]{6}$/.test(selectedLayer.accentColor || "") ? selectedLayer.accentColor : "#38bdf8"}
                            onChange={(event) => updateLayer(selectedLayer.id, { accentColor: event.target.value })}
                            className="h-9 w-full cursor-pointer rounded-[8px] border border-[#e2e5ec] bg-white p-1"
                          />
                        </label>
                      </div>
                    </div>
                  ) : null}

                  {selectedLayer.kind === "text" ? (
                    <div className="space-y-3">
                      <textarea
                        ref={textInputRef}
                        value={selectedLayer.text}
                        onChange={(event) => updateLayer(selectedLayer.id, { text: event.target.value })}
                        className="min-h-[72px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 py-2 text-[13px] font-medium text-[#000000] outline-none focus:border-[#000000]"
                      />
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9aa1b0]">
                          Font Family
                        </span>
                        <select
                          value={selectedLayer.fontFamily || DEFAULT_TEXT_FONT}
                          onChange={(event) => {
                            const fontOption =
                              TEMPLATE_FONT_OPTIONS.find((font) => font.value === event.target.value) ||
                              TEMPLATE_FONT_OPTIONS[0];
                            updateLayer(selectedLayer.id, {
                              fontFamily: fontOption.value,
                              fontStyle: fontOption.weights[0].value,
                            });
                          }}
                          className="h-9 w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[13px] font-medium text-[#000000] outline-none focus:border-[#000000]"
                        >
                          {TEMPLATE_FONT_OPTIONS.map((font) => (
                            <option key={font.value} value={font.value}>
                              {font.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <InspectorInput
                        label="Font Size"
                        value={selectedLayer.fontSize}
                        onChange={(value) => updateLayer(selectedLayer.id, { fontSize: Math.max(8, value) })}
                      />
                      <div className="grid grid-cols-[minmax(0,1fr)_80px] gap-3">
                        <label className="block">
                          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9aa1b0]">
                            Text Color
                          </span>
                          <input
                            type="text"
                            value={selectedLayer.fill}
                            onChange={(event) => updateLayer(selectedLayer.id, { fill: event.target.value })}
                            className="h-9 w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[13px] font-medium text-[#000000] outline-none focus:border-[#000000]"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9aa1b0]">
                            Color
                          </span>
                          <input
                            type="color"
                            value={/^#[0-9a-fA-F]{6}$/.test(selectedLayer.fill) ? selectedLayer.fill : "#000000"}
                            onChange={(event) => updateLayer(selectedLayer.id, { fill: event.target.value })}
                            className="h-9 w-full cursor-pointer rounded-[8px] border border-[#e2e5ec] bg-white p-1"
                          />
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <InspectorInput
                          label="Letter Spacing"
                          value={selectedLayer.letterSpacing ?? 0}
                          onChange={(value) => updateLayer(selectedLayer.id, { letterSpacing: value })}
                        />
                        <InspectorInput
                          label="Line Height"
                          value={selectedLayer.lineHeight ?? 0.85}
                          step={0.05}
                          onChange={(value) => updateLayer(selectedLayer.id, { lineHeight: Math.max(0.4, value) })}
                        />
                      </div>
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9aa1b0]">
                          Thickness
                        </span>
                        <select
                          value={
                            selectedTextFontOption.weights.some((weight) => weight.value === selectedLayer.fontStyle)
                              ? selectedLayer.fontStyle
                              : selectedTextFontOption.weights[0].value
                          }
                          onChange={(event) => updateLayer(selectedLayer.id, { fontStyle: event.target.value })}
                          className="h-9 w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[13px] font-medium text-[#000000] outline-none focus:border-[#000000]"
                        >
                          {selectedTextFontOption.weights.map((weight) => (
                            <option key={weight.value} value={weight.value}>
                              {weight.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : null}

                  {selectedLayer.kind === "logo" ? (
                    <div className="space-y-3">
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9aa1b0]">
                          Logo Text
                        </span>
                        <input
                          value={selectedLayer.text}
                          onChange={(e) => updateLayer(selectedLayer.id, { text: e.target.value })}
                          className="h-9 w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[13px] font-medium text-[#000000] outline-none focus:border-[#000000]"
                        />
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9aa1b0]">
                            Fill Color
                          </span>
                          <input
                            type="color"
                            value={/^#[0-9a-fA-F]{6}$/.test(selectedLayer.fill) ? selectedLayer.fill : "#000000"}
                            onChange={(e) => updateLayer(selectedLayer.id, { fill: e.target.value })}
                            className="h-9 w-full cursor-pointer rounded-[8px] border border-[#e2e5ec] bg-white p-1"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9aa1b0]">
                            Text Color
                          </span>
                          <input
                            type="color"
                            value={/^#[0-9a-fA-F]{6}$/.test(selectedLayer.textColor) ? selectedLayer.textColor : "#ffffff"}
                            onChange={(e) => updateLayer(selectedLayer.id, { textColor: e.target.value })}
                            className="h-9 w-full cursor-pointer rounded-[8px] border border-[#e2e5ec] bg-white p-1"
                          />
                        </label>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateLayer(selectedLayer.id, { visible: !selectedLayer.visible })}
                      className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-[#e2e5ec] text-[13px] font-medium text-[#000000] hover:bg-[#f7f8fb]"
                    >
                      {selectedLayer.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      {selectedLayer.visible ? "Visible" : "Hidden"}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateLayer(selectedLayer.id, { locked: !selectedLayer.locked })}
                      className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-[#e2e5ec] text-[13px] font-medium text-[#000000] hover:bg-[#f7f8fb]"
                    >
                      {selectedLayer.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                      {selectedLayer.locked ? "Locked" : "Unlocked"}
                    </button>
                  </div>

                  {selectedLayer.kind === "image" || selectedLayer.kind === "logo" ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => scaleSelectedToFit("fill")}
                        disabled={selectedLayer.locked}
                        className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-[#000000] bg-[#000000] px-3 text-[13px] font-semibold text-white transition hover:bg-[#222222] disabled:opacity-40"
                        title="Scale image to fill 100% of the 4:5 canvas"
                      >
                        <Maximize2 className="h-4 w-4" />
                        Fit to Canvas (Full 4:5)
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => scaleSelectedToFit("contain")}
                          disabled={selectedLayer.locked}
                          className="inline-flex h-9 cursor-pointer items-center justify-center rounded-[8px] border border-[#e2e5ec] bg-white px-2 text-[12px] font-medium text-[#000000] hover:bg-[#f7f8fb] disabled:opacity-40"
                          title="Scale image proportionally to fit inside canvas"
                        >
                          Scale (Contain)
                        </button>
                        <button
                          type="button"
                          onClick={() => scaleSelectedToFit("cover")}
                          disabled={selectedLayer.locked}
                          className="inline-flex h-9 cursor-pointer items-center justify-center rounded-[8px] border border-[#e2e5ec] bg-white px-2 text-[12px] font-medium text-[#000000] hover:bg-[#f7f8fb] disabled:opacity-40"
                          title="Scale image proportionally to cover entire canvas"
                        >
                          Scale (Cover)
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateLayer(selectedLayer.id, {
                            aspectRatioLocked: !selectedLayer.aspectRatioLocked,
                          })
                        }
                        className={`h-9 w-full cursor-pointer rounded-[8px] border px-3 text-[13px] font-medium transition ${
                          selectedLayer.aspectRatioLocked
                            ? "border-[#000000] bg-[#000000] text-white"
                            : "border-[#e2e5ec] bg-white text-[#000000] hover:bg-[#f7f8fb]"
                        }`}
                      >
                        {selectedLayer.aspectRatioLocked ? "Aspect ratio locked" : "Aspect ratio unlocked"}
                      </button>
                    </div>
                  ) : null}

                  {/* 1px D-pad Nudge Controls */}
                  <div className="grid grid-cols-3 gap-2">
                    <div />
                    <button
                      type="button"
                      onClick={() => nudgeLayer(selectedLayer.id, 0, -1)}
                      disabled={selectedLayer.locked}
                      className="grid h-9 cursor-pointer place-items-center rounded-[8px] border border-[#e2e5ec] hover:bg-[#f7f8fb] disabled:opacity-40"
                      aria-label="Move up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <div />
                    <button
                      type="button"
                      onClick={() => nudgeLayer(selectedLayer.id, -1, 0)}
                      disabled={selectedLayer.locked}
                      className="grid h-9 cursor-pointer place-items-center rounded-[8px] border border-[#e2e5ec] hover:bg-[#f7f8fb] disabled:opacity-40"
                      aria-label="Move left"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateLayer(selectedLayer.id, {
                          x: selectedLayer.x,
                          y: selectedLayer.y,
                          width: selectedLayer.width,
                          height: selectedLayer.height,
                        })
                      }
                      disabled={selectedLayer.locked}
                      className="h-9 cursor-pointer rounded-[8px] border border-[#e2e5ec] text-[12px] font-medium text-[#666666] hover:bg-[#f7f8fb] disabled:opacity-40"
                    >
                      1px
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgeLayer(selectedLayer.id, 1, 0)}
                      disabled={selectedLayer.locked}
                      className="grid h-9 cursor-pointer place-items-center rounded-[8px] border border-[#e2e5ec] hover:bg-[#f7f8fb] disabled:opacity-40"
                      aria-label="Move right"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <div />
                    <button
                      type="button"
                      onClick={() => nudgeLayer(selectedLayer.id, 0, 1)}
                      disabled={selectedLayer.locked}
                      className="grid h-9 cursor-pointer place-items-center rounded-[8px] border border-[#e2e5ec] hover:bg-[#f7f8fb] disabled:opacity-40"
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <div />
                  </div>

                  {/* Alignment */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => alignSelectedLayer("horizontal")}
                      disabled={selectedLayer.locked}
                      className="h-9 cursor-pointer rounded-[8px] border border-[#e2e5ec] text-[13px] font-medium hover:bg-[#f7f8fb] disabled:opacity-40"
                    >
                      Center X
                    </button>
                    <button
                      type="button"
                      onClick={() => alignSelectedLayer("vertical")}
                      disabled={selectedLayer.locked}
                      className="h-9 cursor-pointer rounded-[8px] border border-[#e2e5ec] text-[13px] font-medium hover:bg-[#f7f8fb] disabled:opacity-40"
                    >
                      Center Y
                    </button>
                    <button
                      type="button"
                      onClick={() => alignSelectedLayer("both")}
                      disabled={selectedLayer.locked}
                      className="h-9 cursor-pointer rounded-[8px] border border-[#e2e5ec] text-[13px] font-medium hover:bg-[#f7f8fb] disabled:opacity-40"
                    >
                      Center Both
                    </button>
                    <button
                      type="button"
                      onClick={() => scaleSelectedToFit("fill")}
                      disabled={selectedLayer.locked}
                      className="h-9 cursor-pointer rounded-[8px] border border-[#e2e5ec] text-[13px] font-medium hover:bg-[#f7f8fb] disabled:opacity-40"
                      title="Scale selected layer to fit full canvas"
                    >
                      Fit Canvas
                    </button>
                  </div>

                  {/* Layer ordering & actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => moveLayerOrder("up")}
                      className="h-9 cursor-pointer rounded-[8px] border border-[#e2e5ec] text-[13px] font-medium hover:bg-[#f7f8fb]"
                    >
                      Forward
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLayerOrder("down")}
                      className="h-9 cursor-pointer rounded-[8px] border border-[#e2e5ec] text-[13px] font-medium hover:bg-[#f7f8fb]"
                    >
                      Backward
                    </button>
                    <button
                      type="button"
                      onClick={duplicateLayer}
                      disabled={selectedLayer.locked || selectedLayer.kind === "socials"}
                      className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-[#e2e5ec] text-[13px] font-medium hover:bg-[#f7f8fb] disabled:opacity-40"
                    >
                      <Copy className="h-4 w-4" />
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={deleteLayer}
                      disabled={selectedLayer.locked || selectedLayer.kind === "socials"}
                      className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-[#e2e5ec] text-[13px] font-medium hover:bg-[#f7f8fb] disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default TemplateStudioContent;
