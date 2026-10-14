export const STANDINGS_TEMPLATE_WIDTH = 1122;
export const STANDINGS_TEMPLATE_HEIGHT = 1402;
export const STANDINGS_TEMPLATE_ROOT = "/Templates/Finalized/premium-battle-royale-standings-template";
const LEGACY_STANDINGS_TEMPLATE_ROOT = "/Templates/Finalized/battle-royale-points-template";

export type StandingsExportView = "overall" | "single-match" | "till-match";
export type StandingsTemplateSocialPlatform = "instagram" | "facebook" | "youtube";

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

export type TemplateBinding =
  | "gameLogo"
  | "mapImage"
  | "mapName"
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
  kind: "image" | "table" | "logo" | "text" | "socials";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  aspectRatioLocked?: boolean;
  binding?: TemplateBinding;
};

export type ImageLayer = TemplateLayerBase & {
  kind: "image";
  src: string;
  fit?: "contain" | "cover" | "stretch";
  variant?: "right-faded-monochrome";
  recolor?: "accent" | "accentHalf";
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
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
  align?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  letterSpacing?: number;
  recolor?: "accent";
  shownWhen?: StandingsExportView[];
  hiddenWhen?: StandingsExportView[];
};

export type TableLayer = TemplateLayerBase & {
  kind: "table";
  variant: "premium-battle-royale-standings" | "legacy-battle-royale-points";
  columns: Array<{ key: "slot" | "team" | "wins" | "kills" | "placement" | "total"; label: string; width: number }>;
  rowCount: number;
  headerHeight: number;
  fill: string;
  textColor: string;
  fontSize: number;
};

export type SocialsLayer = TemplateLayerBase & {
  kind: "socials";
  handle: string;
  recolor?: "accent";
};

export type TemplateLayer = ImageLayer | LogoLayer | TextLayer | TableLayer | SocialsLayer;

export type TemplateDocument = {
  id: string;
  name: string;
  version: number;
  width: number;
  height: number;
  background: string;
  layers: TemplateLayer[];
};

export const DEFAULT_VISIBLE_SOCIALS: StandingsTemplateVisibleSocials = {
  instagram: true,
  facebook: true,
  youtube: true,
};

export const PREMIUM_BATTLE_ROYALE_STANDINGS_TEMPLATE: TemplateDocument = {
  id: "premium-battle-royale-standings-template",
  name: "Premium Battle Royale Standings",
  version: 1,
  width: STANDINGS_TEMPLATE_WIDTH,
  height: STANDINGS_TEMPLATE_HEIGHT,
  background: "#f6f7fa",
  layers: [
    {
      id: "map-image",
      name: "Map Image",
      kind: "image",
      binding: "mapImage",
      src: "",
      fit: "cover",
      variant: "right-faded-monochrome",
      x: 582,
      y: 170,
      width: 540,
      height: 250,
      rotation: 0,
      zIndex: -10,
      visible: true,
      locked: true,
      aspectRatioLocked: true,
    },
    {
      id: "base-1",
      name: "Base 1",
      kind: "image",
      src: `${STANDINGS_TEMPLATE_ROOT}/base.png`,
      fit: "stretch",
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
      id: "base-2",
      name: "Base 2",
      kind: "image",
      src: `${STANDINGS_TEMPLATE_ROOT}/base-2.png`,
      fit: "stretch",
      recolor: "accent",
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
      id: "base-3",
      name: "Base 3",
      kind: "image",
      src: `${STANDINGS_TEMPLATE_ROOT}/base-3.png`,
      fit: "stretch",
      recolor: "accentHalf",
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
    {
      id: "game-logo",
      name: "Game Logo",
      kind: "image",
      binding: "gameLogo",
      src: "",
      fit: "contain",
      x: 53,
      y: 54,
      width: 207,
      height: 74,
      rotation: 0,
      zIndex: 5,
      visible: true,
      locked: true,
      aspectRatioLocked: true,
    },
    {
      id: "organizer-logo-header",
      name: "Organizer Logo Header",
      kind: "logo",
      binding: "organizerLogo",
      x: 438,
      y: 29,
      width: 70,
      height: 70,
      rotation: 0,
      zIndex: 6,
      visible: true,
      locked: true,
      aspectRatioLocked: true,
      text: "YOUR\nLOGO",
      fill: "#000000",
      stroke: "transparent",
      textColor: "#ffffff",
    },
    {
      id: "presented-by-header",
      name: "Presented By Header",
      kind: "text",
      text: "PRESENTED BY",
      fill: "#111111",
      fontFamily: "Bebas Neue",
      fontSize: 18,
      fontStyle: "400",
      align: "left",
      verticalAlign: "middle",
      x: 520,
      y: 29,
      width: 150,
      height: 21,
      rotation: 0,
      zIndex: 7,
      visible: true,
      locked: true,
    },
    {
      id: "organizer-first-header",
      name: "Organizer First Header",
      kind: "text",
      binding: "organizerFirstName",
      text: "YOUR",
      fill: "#111111",
      fontFamily: "Nexa",
      fontSize: 24,
      fontStyle: "800",
      align: "left",
      verticalAlign: "middle",
      x: 520,
      y: 51,
      width: 300,
      height: 36,
      rotation: 0,
      zIndex: 7,
      visible: true,
      locked: true,
    },
    {
      id: "organizer-last-header",
      name: "Organizer Last Header",
      kind: "text",
      binding: "organizerLastName",
      text: "NAME",
      fill: "#ff6a00",
      recolor: "accent",
      fontFamily: "Nexa",
      fontSize: 18,
      fontStyle: "600",
      align: "left",
      verticalAlign: "middle",
      letterSpacing: 4,
      x: 520,
      y: 86,
      width: 210,
      height: 28,
      rotation: 0,
      zIndex: 7,
      visible: true,
      locked: true,
    },
    {
      id: "map-name",
      name: "Map Name",
      kind: "text",
      binding: "mapName",
      text: "BERMUDA",
      fill: "#ff6a00",
      recolor: "accent",
      fontFamily: "Bebas Neue",
      fontSize: 45,
      fontStyle: "400",
      align: "center",
      verticalAlign: "middle",
      x: 827,
      y: 32,
      width: 190,
      height: 56,
      rotation: 0,
      zIndex: 7,
      visible: true,
      locked: true,
    },
    {
      id: "for-match-label",
      name: "For Match Label",
      kind: "text",
      binding: "forMatchLabel",
      text: "FOR MATCH 01",
      fill: "#ffffff",
      fontFamily: "Plus Jakarta Sans",
      fontSize: 22,
      fontStyle: "800",
      align: "center",
      verticalAlign: "middle",
      shownWhen: ["single-match"],
      x: 43,
      y: 285,
      width: 226,
      height: 36,
      rotation: 0,
      zIndex: 7,
      visible: true,
      locked: true,
    },
    {
      id: "till-match-label",
      name: "Till Match Label",
      kind: "text",
      binding: "tillMatchLabel",
      text: "TILL MATCH 01",
      fill: "#ffffff",
      fontFamily: "Plus Jakarta Sans",
      fontSize: 22,
      fontStyle: "800",
      align: "center",
      verticalAlign: "middle",
      shownWhen: ["till-match"],
      x: 43,
      y: 285,
      width: 226,
      height: 36,
      rotation: 0,
      zIndex: 7,
      visible: true,
      locked: true,
    },
    {
      id: "final-results-label",
      name: "Final Results Label",
      kind: "text",
      binding: "finalMatchLabel",
      text: "FINAL RESULTS",
      fill: "#ffffff",
      fontFamily: "Plus Jakarta Sans",
      fontSize: 22,
      fontStyle: "800",
      align: "center",
      verticalAlign: "middle",
      shownWhen: ["overall"],
      x: 43,
      y: 285,
      width: 226,
      height: 36,
      rotation: 0,
      zIndex: 7,
      visible: true,
      locked: true,
    },
    {
      id: "standings-table",
      name: "Standings Table",
      kind: "table",
      variant: "premium-battle-royale-standings",
      x: 50,
      y: 370,
      width: 1022,
      height: 910,
      rotation: 0,
      zIndex: 10,
      visible: true,
      locked: true,
      aspectRatioLocked: false,
      rowCount: 16,
      headerHeight: 50,
      fill: "#ff6a00",
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
    },
    {
      id: "organizer-logo-footer",
      name: "Organizer Logo Footer",
      kind: "logo",
      binding: "organizerLogo",
      x: 42,
      y: 1324,
      width: 65,
      height: 65,
      rotation: 0,
      zIndex: 20,
      visible: true,
      locked: true,
      aspectRatioLocked: true,
      text: "YOUR\nLOGO",
      fill: "#000000",
      stroke: "transparent",
      textColor: "#ffffff",
    },
    {
      id: "presented-by-footer",
      name: "Presented By Footer",
      kind: "text",
      text: "PRESENTED BY",
      fill: "#ffffff",
      fontFamily: "Bebas Neue",
      fontSize: 14,
      fontStyle: "400",
      align: "left",
      verticalAlign: "middle",
      x: 116,
      y: 1326,
      width: 125,
      height: 18,
      rotation: 0,
      zIndex: 21,
      visible: true,
      locked: true,
    },
    {
      id: "organizer-first-footer",
      name: "Organizer First Footer",
      kind: "text",
      binding: "organizerFirstName",
      text: "YOUR",
      fill: "#ffffff",
      fontFamily: "Plus Jakarta Sans",
      fontSize: 20,
      fontStyle: "800",
      align: "left",
      verticalAlign: "middle",
      x: 116,
      y: 1344,
      width: 260,
      height: 31,
      rotation: 0,
      zIndex: 21,
      visible: true,
      locked: true,
    },
    {
      id: "organizer-last-footer",
      name: "Organizer Last Footer",
      kind: "text",
      binding: "organizerLastName",
      text: "NAME",
      fill: "#ff6a00",
      recolor: "accent",
      fontFamily: "Plus Jakarta Sans",
      fontSize: 14,
      fontStyle: "600",
      align: "left",
      verticalAlign: "middle",
      letterSpacing: 4,
      x: 116,
      y: 1372,
      width: 178,
      height: 22,
      rotation: 0,
      zIndex: 21,
      visible: true,
      locked: true,
    },
    {
      id: "socials",
      name: "Socials",
      kind: "socials",
      binding: "socials",
      handle: "@NEXUSESPORTS",
      recolor: "accent",
      x: 828,
      y: 1353,
      width: 278,
      height: 26,
      rotation: 0,
      zIndex: 24,
      visible: true,
      locked: true,
      aspectRatioLocked: true,
    },
    {
      id: "footer-powered-by",
      name: "Powered By",
      kind: "text",
      text: "Powered By",
      fill: "#111111",
      fontFamily: "Plus Jakarta Sans",
      fontSize: 17,
      fontStyle: "400",
      align: "left",
      verticalAlign: "middle",
      x: 469,
      y: 1354,
      width: 112,
      height: 28,
      rotation: 0,
      zIndex: 22,
      visible: true,
      locked: true,
    },
    {
      id: "footer-esportific-logo",
      name: "Esportific Footer Logo",
      kind: "image",
      src: `${STANDINGS_TEMPLATE_ROOT}/esportific-logo.png`,
      fit: "contain",
      x: 578,
      y: 1350,
      width: 128,
      height: 35,
      rotation: 0,
      zIndex: 23,
      visible: true,
      locked: true,
      aspectRatioLocked: true,
    },
  ],
};

export const LEGACY_BATTLE_ROYALE_POINTS_TEMPLATE: TemplateDocument = {
  id: "battle-royale-points-template",
  name: "Battle Royale Points Template",
  version: 1,
  width: STANDINGS_TEMPLATE_WIDTH,
  height: STANDINGS_TEMPLATE_HEIGHT,
  background: "#000000",
  layers: [
    {
      id: "legacy-base",
      name: "Base",
      kind: "image",
      src: `${LEGACY_STANDINGS_TEMPLATE_ROOT}/Base.png`,
      fit: "stretch",
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
      id: "legacy-standings-table",
      name: "Standings Table",
      kind: "table",
      variant: "legacy-battle-royale-points",
      x: 70,
      y: 420,
      width: 982,
      height: 760,
      rotation: 0,
      zIndex: 10,
      visible: true,
      locked: true,
      aspectRatioLocked: false,
      rowCount: 16,
      headerHeight: 48,
      fill: "#ff6a00",
      textColor: "#ffffff",
      fontSize: 18,
      columns: [
        { key: "slot", label: "Slot No.", width: 0.12 },
        { key: "team", label: "Team Name", width: 0.3 },
        { key: "wins", label: "Wins", width: 0.1 },
        { key: "kills", label: "Kill Points", width: 0.14 },
        { key: "placement", label: "Placement Points", width: 0.18 },
        { key: "total", label: "Total Points", width: 0.16 },
      ],
    },
    {
      id: "legacy-organizer-logo",
      name: "Organizer Logo",
      kind: "logo",
      binding: "organizerLogo",
      x: 486,
      y: 84,
      width: 150,
      height: 150,
      rotation: 0,
      zIndex: 20,
      visible: true,
      locked: true,
      aspectRatioLocked: true,
      text: "YOUR\nLOGO",
      fill: "#000000",
      stroke: "#ff6a00",
      textColor: "#ffffff",
    },
    {
      id: "legacy-footer-powered-by",
      name: "Powered By",
      kind: "text",
      text: "POWERED BY",
      fill: "#ff6a00",
      recolor: "accent",
      fontFamily: "Plus Jakarta Sans",
      fontSize: 20,
      fontStyle: "800",
      align: "left",
      verticalAlign: "middle",
      x: 386,
      y: 1248,
      width: 150,
      height: 34,
      rotation: 0,
      zIndex: 30,
      visible: true,
      locked: true,
    },
    {
      id: "legacy-footer-brand-logo",
      name: "Brand Logo",
      kind: "image",
      src: `${LEGACY_STANDINGS_TEMPLATE_ROOT}/new-logo.png`,
      fit: "contain",
      x: 546,
      y: 1242,
      width: 190,
      height: 46,
      rotation: 0,
      zIndex: 31,
      visible: true,
      locked: true,
      aspectRatioLocked: true,
    },
  ],
};
