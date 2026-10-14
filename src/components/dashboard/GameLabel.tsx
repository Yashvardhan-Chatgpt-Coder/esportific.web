import { useEffect, useState, type CSSProperties } from "react";
import { apiGameToCatalogGame, type CatalogGame } from "@/lib/games-catalog";
import { catalogApi } from "@/lib/api";
import { optimizeCloudinaryUrl } from "@/lib/utils";

let cachedGames: CatalogGame[] | null = null;
let pendingGames: Promise<CatalogGame[]> | null = null;

async function loadGames() {
  if (cachedGames) return cachedGames;
  if (!pendingGames) {
    pendingGames = catalogApi.getGames().then((games) => {
      cachedGames = games.map(apiGameToCatalogGame);
      return cachedGames;
    });
  }
  return pendingGames;
}

function useGameByName(name: string) {
  const [games, setGames] = useState<CatalogGame[]>(cachedGames || []);

  useEffect(() => {
    if (!name || cachedGames) return;
    loadGames()
      .then(setGames)
      .catch(() => setGames([]));
  }, [name]);

  return games.find((game) => game.name.toLowerCase() === name.toLowerCase());
}

type GameIconSize = "sm" | "md" | "dropdown" | "card";

const GAME_ICON_SIZES: Record<GameIconSize, CSSProperties> = {
  sm: { width: 28, height: 28 },
  md: { width: 112, height: 28 },
  dropdown: { width: 42, height: 34 },
  card: { width: 180, height: 64 },
};

export function GameIcon({
  name,
  logo,
  className = "",
  imageClassName = "",
  size = "md",
}: {
  name: string;
  logo?: string | null;
  className?: string;
  imageClassName?: string;
  size?: GameIconSize;
}) {
  const initial = (name || "?").charAt(0).toUpperCase();
  const sizeStyle = GAME_ICON_SIZES[size];

  if (logo) {
    return (
      <img
        src={optimizeCloudinaryUrl(logo, 320, 120)}
        alt=""
        loading="lazy"
        style={{
          ...sizeStyle,
          objectFit: "contain",
          objectPosition: "center",
        }}
        className={`${className} shrink-0 align-middle ${imageClassName}`}
      />
    );
  }

  return (
    <span
      style={sizeStyle}
      className={`${className} grid shrink-0 place-items-center overflow-visible text-[11px] font-semibold text-[#4b5563]`}
    >
      {initial}
    </span>
  );
}

export function GameLabel({
  name,
  logo,
  theme = "light",
  className = "",
  iconClassName,
  iconSize = "sm",
}: {
  name: string;
  logo?: string | null;
  theme?: "light" | "dark";
  className?: string;
  iconClassName?: string;
  iconSize?: GameIconSize;
}) {
  const game = useGameByName(name);
  const themedLogo = theme === "dark"
    ? game?.logoDark || game?.logoLight || game?.logo
    : game?.logoLight || game?.logoDark || game?.logo;
  const resolvedLogo = logo !== undefined ? logo : themedLogo;

  return (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
      <GameIcon name={name || "?"} logo={resolvedLogo} className={iconClassName} size={iconSize} />
      <span className="truncate">{name || "—"}</span>
    </span>
  );
}
