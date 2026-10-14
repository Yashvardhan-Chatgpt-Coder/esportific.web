import type { TemplateDocument } from "@/lib/html-standings-template-engine";

export const PREMIUM_2_STANDINGS_TEMPLATE_ROOT =
  "/Templates/Finalized/premium-2-battle-royale-standings-template";

const PREMIUM_2_SOURCE_ROOT =
  "/Templates/Leaderboard/Universal/Battle Royal/Team Results/Premium/Template 2/";

export function isPremium2StandingsTemplate(document: TemplateDocument) {
  if (/^premium\s*3$/i.test(document.name.trim())) return false;
  return (
    /^premium\s*2$/i.test(document.name.trim()) ||
    document.id === "premium-2-battle-royale-standings-template" ||
    document.layers.some((layer) => layer.id === "template-2-leaderboard-table") ||
    ["frame", "dividers", "branding esportific"].every((name) =>
      document.layers.some((layer) => layer.name.trim().toLowerCase() === name),
    )
  );
}

function safePremium2AssetSource(source: string) {
  if (!source.startsWith(PREMIUM_2_SOURCE_ROOT)) return source;
  const filename = source.slice(PREMIUM_2_SOURCE_ROOT.length);
  return `${PREMIUM_2_STANDINGS_TEMPLATE_ROOT}/${filename}`;
}

export function finalizePremium2StandingsTemplate(document: TemplateDocument): TemplateDocument {
  if (!isPremium2StandingsTemplate(document)) return document;

  return {
    ...document,
    layers: document.layers.map((layer) => {
      const name = layer.name.trim().toLowerCase();

      if (layer.kind === "image") {
        const nextLayer = {
          ...layer,
          src: safePremium2AssetSource(layer.src),
        };
        if (name === "frame") return { ...nextLayer, hueSource: 211 };
        if (layer.id === "template-2-feature-image" || name === "feature image") {
          return { ...nextLayer, binding: "mapImage" as const };
        }
        return nextLayer;
      }

      if (layer.kind === "logo") {
        if (name.includes("logo") && !name.includes("esportific") && !name.includes("brand")) {
          return { ...layer, binding: "organizerLogo" as const };
        }
        return layer;
      }

      if (layer.kind === "table" && (layer.id === "template-2-leaderboard-table" || name.includes("leaderboard"))) {
        return {
          ...layer,
          variant: "template2Leaderboard" as const,
          headerFill: "hueDark" as const,
          slotTextColor: "hueBright" as const,
          totalTextColor: "hueBright" as const,
        };
      }

      if (layer.kind === "socials" && (layer.id === "template-2-social-bar" || name.includes("social"))) {
        return {
          ...layer,
          binding: "socials" as const,
          variant: "platformBar" as const,
          fill: "hueDark" as const,
        };
      }

      if (layer.kind !== "text") return layer;

      const text = layer.text.trim().replace(/\s+/g, " ").toUpperCase();
      if (text === "NEXUS SHOWDOWN SERIES" || name === "event name") {
        return { ...layer, binding: "eventName" as const };
      }
      if (text === "NEXUS" || name.includes("organizer first")) {
        return { ...layer, binding: "organizerFirstName" as const };
      }
      if (text === "ESPORTS" || name.includes("organizer last")) {
        return { ...layer, binding: "organizerLastName" as const, fill: "hueBright" as const };
      }
      if (text === "EVENT" || text === "MAP") {
        return { ...layer, fill: "hueBright" as const };
      }
      if (["MATCH", "FOR MATCH", "TILL MATCH"].includes(text) || name === "match label") {
        return { ...layer, binding: "matchLabel" as const, fill: "hueBright" as const };
      }
      if (/^\d+\s*\/\s*\d+$/.test(text) || name === "match number" || name === "match value") {
        return { ...layer, binding: "matchValue" as const };
      }
      if (text === "ERANGEL" || name === "map name") {
        return { ...layer, binding: "mapName" as const };
      }
      return layer;
    }),
  };
}

export const PREMIUM_2_BATTLE_ROYALE_STANDINGS_TEMPLATE: TemplateDocument = {
  id: "premium-2-battle-royale-standings-template",
  name: "Premium 2",
  version: 1,
  width: 1122,
  height: 1402,
  ratioLabel: "4:5",
  category: "Leaderboard",
  format: "Battle Royale",
  background: "#f6f7fa",
  defaultAccent: "#0758ad",
  layers: [
    {
      id: "template-2-feature-image",
      name: "Feature Image",
      kind: "image",
      binding: "mapImage",
      src: "",
      fit: "cover",
      box: { x: 63.7, y: 0, width: 36.3, height: 20.6 },
      zIndex: 1,
      visible: true,
      locked: true,
    },
    {
      id: "premium-2-frame",
      name: "Frame",
      kind: "image",
      src: `${PREMIUM_2_STANDINGS_TEMPLATE_ROOT}/Frame.png`,
      fit: "stretch",
      hueSource: 211,
      box: { x: 0, y: 0, width: 100, height: 100 },
      zIndex: 3,
      visible: true,
      locked: true,
    },
    {
      id: "premium-2-dividers",
      name: "Dividers",
      kind: "image",
      src: `${PREMIUM_2_STANDINGS_TEMPLATE_ROOT}/Dividers.png`,
      fit: "stretch",
      box: { x: 0, y: 0, width: 100, height: 100 },
      zIndex: 4,
      visible: true,
      locked: true,
    },
    {
      id: "premium-2-table-border",
      name: "Table Border",
      kind: "image",
      src: `${PREMIUM_2_STANDINGS_TEMPLATE_ROOT}/Table Border.png`,
      fit: "stretch",
      box: { x: 0, y: -2.6, width: 100, height: 100 },
      zIndex: 2,
      visible: true,
      locked: true,
    },
    {
      id: "premium-2-branding-frame",
      name: "Branding Esportific",
      kind: "image",
      src: `${PREMIUM_2_STANDINGS_TEMPLATE_ROOT}/Branding Esportific.png`,
      fit: "stretch",
      box: { x: 0, y: 0, width: 100, height: 100 },
      zIndex: 4,
      visible: true,
      locked: true,
    },
    {
      id: "premium-2-organized-by",
      name: "Organized By",
      kind: "text",
      text: "ORGANIZED BY",
      fill: "#4d5667",
      fontFamily: "Bebas Neue",
      fontWeight: "400",
      fontSizePct: 1.25,
      letterSpacingPct: 0.08,
      uppercase: true,
      box: { x: 5.2, y: 3.85, width: 18, height: 2.2 },
      zIndex: 6,
      visible: true,
      locked: true,
    },
    {
      id: "premium-2-organizer-logo",
      name: "Organizer Logo",
      kind: "logo",
      binding: "organizerLogo",
      fallbackText: "YOUR\nLOGO",
      fill: "transparent",
      textColor: "#071b39",
      radius: 0,
      fit: "contain",
      box: { x: 5.2, y: 7.2, width: 7.3, height: 6.8 },
      zIndex: 6,
      visible: true,
      locked: true,
    },
    {
      id: "premium-2-organizer-first",
      name: "Organizer First Name",
      kind: "text",
      binding: "organizerFirstName",
      text: "NEXUS FORCE",
      fill: "#101b30",
      fontFamily: "Plus Jakarta Sans",
      fontWeight: "800",
      fontSizePct: 2.45,
      lineHeight: 0.95,
      uppercase: true,
      box: { x: 14.15, y: 7.15, width: 18.8, height: 5.1 },
      zIndex: 6,
      visible: true,
      locked: true,
    },
    {
      id: "premium-2-organizer-last",
      name: "Organizer Last Name",
      kind: "text",
      binding: "organizerLastName",
      text: "ESPORTS",
      fill: "hueBright",
      fontFamily: "Plus Jakarta Sans",
      fontWeight: "700",
      fontSizePct: 1.4,
      letterSpacingPct: 0.38,
      uppercase: true,
      box: { x: 14.2, y: 10.35, width: 18.8, height: 2.1 },
      zIndex: 6,
      visible: true,
      locked: true,
    },
    {
      id: "premium-2-event-label",
      name: "Event Label",
      kind: "text",
      text: "EVENT",
      fill: "hueBright",
      fontFamily: "Bebas Neue",
      fontWeight: "400",
      fontSizePct: 1.4,
      uppercase: true,
      box: { x: 37.65, y: 6.35, width: 12, height: 2.2 },
      zIndex: 6,
      visible: true,
      locked: true,
    },
    {
      id: "premium-2-event-name",
      name: "Event Name",
      kind: "text",
      binding: "eventName",
      text: "NEXUS SHOWDOWN SERIES",
      fill: "#111a2c",
      fontFamily: "Plus Jakarta Sans",
      fontWeight: "800",
      fontSizePct: 1.75,
      uppercase: true,
      box: { x: 37.65, y: 8.45, width: 27.7, height: 2.5 },
      zIndex: 6,
      visible: true,
      locked: true,
    },
    {
      id: "premium-2-match-label",
      name: "Match Label",
      kind: "text",
      binding: "matchLabel",
      text: "MATCH",
      fill: "hueBright",
      fontFamily: "Bebas Neue",
      fontWeight: "400",
      fontSizePct: 1.4,
      uppercase: true,
      box: { x: 37.65, y: 14.05, width: 11, height: 2.2 },
      zIndex: 6,
      visible: true,
      locked: true,
    },
    {
      id: "premium-2-match-value",
      name: "Match Number",
      kind: "text",
      binding: "matchValue",
      text: "05 / 24",
      fill: "#101b30",
      fontFamily: "Bebas Neue",
      fontWeight: "400",
      fontSizePct: 2.6,
      uppercase: true,
      box: { x: 37.65, y: 16.15, width: 12.5, height: 3.15 },
      zIndex: 6,
      visible: true,
      locked: true,
    },
    {
      id: "premium-2-map-label",
      name: "Map Label",
      kind: "text",
      text: "MAP",
      fill: "hueBright",
      fontFamily: "Bebas Neue",
      fontWeight: "400",
      fontSizePct: 1.4,
      uppercase: true,
      box: { x: 50.4, y: 14.05, width: 10, height: 2.2 },
      zIndex: 6,
      visible: true,
      locked: true,
    },
    {
      id: "premium-2-map-name",
      name: "Map Name",
      kind: "text",
      binding: "mapName",
      text: "ERANGEL",
      fill: "#101b30",
      fontFamily: "Bebas Neue",
      fontWeight: "400",
      fontSizePct: 2.6,
      uppercase: true,
      box: { x: 50.4, y: 16.15, width: 14.5, height: 3.15 },
      zIndex: 6,
      visible: true,
      locked: true,
    },
    {
      id: "premium-2-follow-us",
      name: "Follow Us",
      kind: "text",
      text: "FOLLOW US",
      fill: "#4d5667",
      fontFamily: "Bebas Neue",
      fontWeight: "400",
      fontSizePct: 1.25,
      letterSpacingPct: 0.04,
      uppercase: true,
      box: { x: 5.2, y: 17.95, width: 14, height: 2 },
      zIndex: 6,
      visible: true,
      locked: true,
    },
    {
      id: "template-2-social-bar",
      name: "Social Bar",
      kind: "socials",
      binding: "socials",
      variant: "platformBar",
      handle: "nexusforce.gg",
      fill: "hueDark",
      textColor: "#263247",
      fontFamily: "Plus Jakarta Sans",
      fontWeight: "600",
      box: { x: 5.2, y: 20.1, width: 50.1, height: 2.7 },
      zIndex: 6,
      visible: true,
      locked: true,
    },
    {
      id: "premium-2-leaderboard-label",
      name: "Leaderboard Label",
      kind: "text",
      text: "LEADERBOARD",
      fill: "#ffffff",
      fontFamily: "Plus Jakarta Sans",
      fontWeight: "800",
      fontSizePct: 1.8,
      letterSpacingPct: 0.5,
      align: "center",
      uppercase: true,
      box: { x: 34.35, y: 23.2, width: 31.3, height: 3 },
      zIndex: 6,
      visible: true,
      locked: true,
    },
    {
      id: "template-2-leaderboard-table",
      name: "Leaderboard Table",
      kind: "table",
      variant: "template2Leaderboard",
      columns: [
        { key: "slot", label: "#", widthPct: 8 },
        { key: "team", label: "Team Name", widthPct: 31 },
        { key: "wins", label: "Wins", widthPct: 10 },
        { key: "kills", label: "Kill Points", widthPct: 15 },
        { key: "placement", label: "Placement Points", widthPct: 20 },
        { key: "total", label: "Total Points", widthPct: 16 },
      ],
      rowCount: 16,
      headerHeightPct: 4.7,
      radius: 0.7,
      headerFill: "hueDark",
      slotFill: "#ffffff",
      totalFill: "#ffffff",
      bodyFill: "rgba(255,255,255,0.82)",
      rowSeparator: "#9ca5b2",
      columnSeparator: "transparent",
      headerTextColor: "#ffffff",
      bodyTextColor: "#172238",
      slotTextColor: "hueBright",
      totalTextColor: "hueBright",
      fontFamily: "Plus Jakarta Sans",
      bodyFontWeight: "700",
      headerFontFamily: "Plus Jakarta Sans",
      headerFontWeight: "700",
      box: { x: 5.2, y: 27.7, width: 89.55, height: 59.65 },
      zIndex: 5,
      visible: true,
      locked: true,
    },
    {
      id: "premium-2-powered-by",
      name: "Powered By",
      kind: "text",
      text: "POWERED BY",
      fill: "#5f6878",
      fontFamily: "Plus Jakarta Sans",
      fontWeight: "600",
      fontSizePct: 1.05,
      uppercase: true,
      box: { x: 11.0, y: 94.3, width: 24, height: 3.4 },
      zIndex: 6,
      visible: true,
      locked: true,
    },
    {
      id: "premium-2-esportific-logo",
      name: "Esportific Logo",
      kind: "image",
      src: `${PREMIUM_2_STANDINGS_TEMPLATE_ROOT}/esportific-logo.png`,
      fit: "contain",
      box: { x: 16.7, y: 94.8, width: 16.1, height: 2.1 },
      zIndex: 6,
      visible: true,
      locked: true,
    },
  ],
};
