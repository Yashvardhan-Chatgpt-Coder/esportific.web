export const STANDINGS_TEMPLATE_WIDTH = 1122;
export const STANDINGS_TEMPLATE_HEIGHT = 1402;

export const STANDINGS_TEMPLATE_ROOT =
  "/Templates/Finalized/battle-royale-points-template";

export type TemplateLayerBase = {
  id: string;
  name: string;
  kind: "image" | "table" | "logo" | "text";
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
  fontFamily?: string;
  fontStyle: string;
};

export type TableLayer = TemplateLayerBase & {
  kind: "table";
  columns: Array<{ key: string; label: string; width: number }>;
  rowCount: number;
  headerHeight: number;
  fill: string;
  stroke: string;
  textColor: string;
  fontSize: number;
};

export type TemplateLayer = ImageLayer | LogoLayer | TextLayer | TableLayer;

export type TemplateDocument = {
  id: string;
  name: string;
  width: number;
  height: number;
  background: string;
  layers: TemplateLayer[];
};

export const FINALIZED_BATTLE_ROYALE_POINTS_TEMPLATE: TemplateDocument = {
  id: "battle-royale-points-template",
  name: "Battle Royale Points Template",
  width: STANDINGS_TEMPLATE_WIDTH,
  height: STANDINGS_TEMPLATE_HEIGHT,
  background: "#000000",
  layers: [
    {
      id: "base",
      name: "Base",
      kind: "image",
      src: `${STANDINGS_TEMPLATE_ROOT}/Base.png`,
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
      id: "standings-table",
      name: "Standings Table",
      kind: "table",
      x: 70,
      y: 420,
      width: 982,
      height: 760,
      rotation: 0,
      zIndex: 10,
      visible: true,
      locked: false,
      aspectRatioLocked: false,
      rowCount: 16,
      headerHeight: 48,
      fill: "#ff6a00",
      stroke: "#ff6a00",
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
      id: "dummy-logo",
      name: "Dummy Logo",
      kind: "logo",
      x: 486,
      y: 84,
      width: 150,
      height: 150,
      rotation: 0,
      zIndex: 20,
      visible: true,
      locked: false,
      aspectRatioLocked: true,
      text: "YOUR\nLOGO",
      fill: "#000000",
      stroke: "#ff6a00",
      textColor: "#ffffff",
    },
    {
      id: "footer-powered-by",
      name: "Powered By",
      kind: "text",
      x: 386,
      y: 1248,
      width: 150,
      height: 34,
      rotation: 0,
      zIndex: 30,
      visible: true,
      locked: false,
      aspectRatioLocked: false,
      text: "POWERED BY",
      fill: "#ff6a00",
      fontSize: 20,
      fontStyle: "800",
    },
    {
      id: "footer-brand-logo",
      name: "Brand Logo",
      kind: "image",
      src: `${STANDINGS_TEMPLATE_ROOT}/new-logo.png`,
      x: 546,
      y: 1242,
      width: 190,
      height: 46,
      rotation: 0,
      zIndex: 31,
      visible: true,
      locked: false,
      aspectRatioLocked: true,
    },
  ],
};
