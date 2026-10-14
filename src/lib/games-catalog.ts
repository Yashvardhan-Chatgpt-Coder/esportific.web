import { getCodeDefinedFormatsForGame, type GameFormat } from "@/lib/tournament-formats";

export type CatalogGame = {
  id: string;
  name: string;
  logo: string | null;
  logoLight: string | null;
  logoDark: string | null;
  logoLightFile?: File | null;
  logoDarkFile?: File | null;
  maps: string[];
  modes: string[];
  formats: GameFormat[];
  updatedAt: string;
};

export const CODE_DEFINED_GAMES = [
  {
    name: "BGMI",
    aliases: ["bgmi", "pubg", "battlegrounds mobile india"],
    logo: "/Games/Logo/BGMI.png",
  },
  {
    name: "Free Fire",
    aliases: ["free fire", "freefire"],
    logo: "/Games/Logo/Free%20Fire.png",
  },
] as const;

export function createGameId() {
  return `game-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeGameName(value: string) {
  return value.trim().toLowerCase();
}

function matchesCodeDefinedGame(gameName: string, aliases: readonly string[]) {
  const normalized = normalizeGameName(gameName);
  return aliases.some((alias) => normalized === alias || normalized.includes(alias));
}

export function getCodeDefinedGameLogo(gameName: string) {
  return CODE_DEFINED_GAMES.find((definition) => matchesCodeDefinedGame(gameName, definition.aliases))?.logo || null;
}

export function getGameNameOptions(games: CatalogGame[]): string[] {
  const names = games.map((g) => g.name);
  if (!names.includes("Other")) names.push("Other");
  return names;
}

export function apiGameToCatalogGame(game: {
  _id: string;
  name: string;
  logo?: string | null;
  logoLight?: string | null;
  logoDark?: string | null;
  maps?: string[];
  modes?: string[];
  formats?: GameFormat[];
  updatedAt: string;
}): CatalogGame {
  const modes = game.modes || [];
  const formats = getCodeDefinedFormatsForGame(game.name);
  const codeLogo = getCodeDefinedGameLogo(game.name);
  return {
    id: game._id,
    name: game.name,
    logo: game.logo || game.logoLight || game.logoDark || codeLogo,
    logoLight: game.logoLight || game.logo || game.logoDark || codeLogo,
    logoDark: game.logoDark || game.logo || game.logoLight || codeLogo,
    maps: game.maps || [],
    modes: formats.map((format) => format.name),
    formats,
    updatedAt: game.updatedAt,
  };
}

export function apiGamesToCodeCatalogGames(games: Array<Parameters<typeof apiGameToCatalogGame>[0]>): CatalogGame[] {
  return CODE_DEFINED_GAMES.map((definition) => {
    const dbGame = games.find((game) => matchesCodeDefinedGame(game.name, definition.aliases));
    const formats = getCodeDefinedFormatsForGame(definition.name);
    const logo = dbGame?.logo || dbGame?.logoLight || dbGame?.logoDark || definition.logo;
    return {
      id: dbGame?._id || `code-${definition.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: definition.name,
      logo,
      logoLight: dbGame?.logoLight || logo,
      logoDark: dbGame?.logoDark || logo,
      maps: dbGame?.maps || [],
      modes: formats.map((format) => format.name),
      formats,
      updatedAt: dbGame?.updatedAt || new Date(0).toISOString(),
    };
  });
}

export function catalogGameToApiPayload(game: CatalogGame) {
  const formats = getCodeDefinedFormatsForGame(game.name);
  return {
    name: game.name,
    logo: game.logoLight || game.logoDark || game.logo,
    logoLight: game.logoLight || game.logoDark || game.logo,
    logoDark: game.logoDark || game.logoLight || game.logo,
    logoLightFile: game.logoLightFile,
    logoDarkFile: game.logoDarkFile,
    maps: game.maps,
    modes: formats.map((format) => format.name),
    formats,
  };
}
