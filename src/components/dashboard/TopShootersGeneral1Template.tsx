import {
  forwardRef,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

export type TopShooterItem = {
  rank: number | string;
  player: string;
  team: string;
  teamLogoSrc?: string | null;
  kills: number | string;
};

export type TopShootersGeneral1TemplateProps = {
  eventName?: string;
  shooters?: TopShooterItem[];
  rows?: any[]; // Flexible compatibility with generic leaderboard rows
  hue?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  className?: string;
  style?: CSSProperties;
};

export const TOP_SHOOTERS_GENERAL1_WIDTH = 1122;
export const TOP_SHOOTERS_GENERAL1_HEIGHT = 1402;

export const TOP_SHOOTERS_GENERAL1_BG_SRC =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Top%20Shooters/General%201%20Template/Background.png";
export const TOP_SHOOTERS_GENERAL1_FF_LOGO =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Top%20Shooters/General%201%20Template/free-fire-logo.png";
export const TOP_SHOOTERS_GENERAL1_BRAND_LOGO =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Top%20Shooters/General%201%20Template/esportific-logo.png";

// Default reference shooters
const DEFAULT_SHOOTERS: TopShooterItem[] = [
  {
    rank: 1,
    player: "KAIROS",
    team: "TEAM NEXUS",
    teamLogoSrc:
      "/Templates/Leaderboard/Universal/Battle%20Royal/Top%20Shooters/General%201%20Template/logo-nexus.png",
    kills: 24,
  },
  {
    rank: 2,
    player: "LUNA",
    team: "PHOENIX ESPORTS",
    teamLogoSrc:
      "/Templates/Leaderboard/Universal/Battle%20Royal/Top%20Shooters/General%201%20Template/logo-phoenix.png",
    kills: 18,
  },
  {
    rank: 3,
    player: "ZORO",
    team: "ECLIPSE",
    teamLogoSrc:
      "/Templates/Leaderboard/Universal/Battle%20Royal/Top%20Shooters/General%201%20Template/logo-eclipse.png",
    kills: 15,
  },
  {
    rank: 4,
    player: "RYZEN",
    team: "APEX UNION",
    teamLogoSrc:
      "/Templates/Leaderboard/Universal/Battle%20Royal/Top%20Shooters/General%201%20Template/logo-apex.png",
    kills: 12,
  },
  {
    rank: 5,
    player: "NOVA",
    team: "ROYAL KINGS",
    teamLogoSrc:
      "/Templates/Leaderboard/Universal/Battle%20Royal/Top%20Shooters/General%201%20Template/logo-royal-kings.png",
    kills: 11,
  },
];

// Helper to format player name - strictly first word only
function formatPlayerName(name: string) {
  if (!name) return "";
  return String(name).trim().split(/\s+/)[0].toUpperCase();
}

/**
 * TopShootersGeneral1TemplateStandingsRenderer
 * Pure Standings Canvas matching 1122x1402 General 1 Top Shooters layout
 */
export const TopShootersGeneral1TemplateStandingsRenderer = forwardRef<
  HTMLDivElement,
  TopShootersGeneral1TemplateProps
>(function TopShootersGeneral1TemplateStandingsRenderer(
  {
    eventName = "AFTER MATCH 04",
    shooters,
    rows,
    hue = 0,
    brightness = 100,
    contrast = 100,
    saturation = 100,
    className = "",
    style,
  },
  ref,
) {
  // Map shooters or generic rows
  const mappedShooters: TopShooterItem[] = useMemo(() => {
    if (shooters && shooters.length > 0) return shooters.slice(0, 5);
    if (rows && rows.length > 0) {
      return rows.slice(0, 5).map((r, i) => ({
        rank: r.rank ?? i + 1,
        player: r.player || r.playerName || r.name || `PLAYER ${i + 1}`,
        team: r.team || r.teamName || `TEAM ${i + 1}`,
        teamLogoSrc: r.teamLogoSrc || r.logo || r.teamLogo || DEFAULT_SHOOTERS[i]?.teamLogoSrc,
        kills: r.kills ?? r.totalKills ?? r.pts ?? 0,
      }));
    }
    return DEFAULT_SHOOTERS;
  }, [shooters, rows]);

  // Image filter styling
  const filterStyle = useMemo(() => {
    const filters: string[] = [];
    if (hue !== 0) filters.push(`hue-rotate(${hue}deg)`);
    if (brightness !== 100) filters.push(`brightness(${brightness}%)`);
    if (contrast !== 100) filters.push(`contrast(${contrast}%)`);
    if (saturation !== 100) filters.push(`saturate(${saturation}%)`);
    return filters.length > 0 ? filters.join(" ") : undefined;
  }, [hue, brightness, contrast, saturation]);

  const slotLeftPositions = [38, 252, 467, 679, 893];

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden font-['Plus_Jakarta_Sans',sans-serif] text-black select-none ${className}`}
      style={{
        width: TOP_SHOOTERS_GENERAL1_WIDTH,
        height: TOP_SHOOTERS_GENERAL1_HEIGHT,
        backgroundColor: "#0d0e12",
        ...style,
      }}
    >
      {/* BACKGROUND IMAGE */}
      <img
        src={TOP_SHOOTERS_GENERAL1_BG_SRC}
        alt="Background"
        className="absolute inset-0 h-full w-full object-fill pointer-events-none"
        style={{ filter: filterStyle }}
      />

      {/* TOP BRANDING LOGO */}
      <div className="absolute top-[32px] left-[50px] z-10">
        <img
          src={TOP_SHOOTERS_GENERAL1_FF_LOGO}
          alt="Free Fire"
          className="h-[25px] w-auto object-contain"
        />
      </div>

      {/* SLANTED RECTANGLE WITH 3 STRIPES (EVENT NAME) */}
      <div className="absolute top-[388px] left-[47px] z-10 inline-flex items-center gap-[9px]">
        <div
          className="inline-flex items-center justify-center bg-[#ff5801] px-[22px] pt-[7px] pb-[6px]"
          style={{ transform: "skewX(-24deg)" }}
        >
          <span
            className="font-['Plus_Jakarta_Sans'] text-[16.5px] font-extrabold tracking-[0.8px] text-white uppercase leading-none whitespace-nowrap"
            style={{ transform: "skewX(24deg)" }}
          >
            {eventName}
          </span>
        </div>
        <div className="inline-flex items-center gap-[5px]">
          <span className="block w-[5.5px] h-[31px] bg-[#ff5801]" style={{ transform: "skewX(-24deg)" }} />
          <span className="block w-[5.5px] h-[31px] bg-[#ff5801]" style={{ transform: "skewX(-24deg)" }} />
          <span className="block w-[5.5px] h-[31px] bg-[#ff5801]" style={{ transform: "skewX(-24deg)" }} />
        </div>
      </div>

      {/* 5 CARDS CONTENT LAYER */}
      <div className="absolute top-[850px] left-0 w-[1122px] h-[350px] z-10 pointer-events-none">
        {mappedShooters.map((shooter, idx) => {
          const leftPos = slotLeftPositions[idx] ?? 38;
          const firstName = formatPlayerName(shooter.player);

          return (
            <div
              key={idx}
              className="absolute top-0 w-[198px] h-[350px] flex flex-col items-center text-center"
              style={{ left: leftPos }}
            >
              {/* Upper Section */}
              <div className="w-full h-[195px] flex flex-col items-center justify-start pt-[20px]">
                <div className="font-['Plus_Jakarta_Sans'] text-[26px] font-black tracking-[0.2px] text-[#111827] uppercase leading-none mb-[15px] max-w-[184px] overflow-hidden text-ellipsis whitespace-nowrap">
                  {firstName}
                </div>
                <div className="w-[60px] h-[60px] flex items-center justify-center mb-[12px]">
                  {shooter.teamLogoSrc ? (
                    <img
                      src={shooter.teamLogoSrc}
                      alt={shooter.team}
                      className="max-w-[60px] max-h-[60px] w-auto h-auto object-contain"
                    />
                  ) : (
                    <div className="w-[50px] h-[50px] rounded-full bg-black/10 flex items-center justify-center font-bold text-black/50 text-[14px]">
                      {shooter.team.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="font-['Plus_Jakarta_Sans'] text-[13.5px] font-extrabold tracking-[0.5px] text-[#111827] uppercase leading-[1.15] max-w-[184px] overflow-hidden text-ellipsis whitespace-nowrap">
                  {shooter.team}
                </div>
              </div>

              {/* Lower Section */}
              <div className="w-full h-[150px] flex flex-col items-center justify-start pt-[18px]">
                <div className="font-['Plus_Jakarta_Sans'] text-[16px] font-black tracking-[1px] text-[#334155] uppercase leading-none mb-[4px]">
                  KILLS
                </div>
                <div className="font-['Bebas_Neue','Plus_Jakarta_Sans'] text-[68px] font-bold text-[#ff5801] leading-[0.95] tracking-[0.5px]">
                  {shooter.kills}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER BAR */}
      <footer className="absolute bottom-0 left-0 right-0 h-[72px] bg-transparent flex items-center justify-between pl-[54px] pr-[50px] z-10">
        <div className="flex flex-col items-start justify-center gap-[5px]">
          <span className="font-['Plus_Jakarta_Sans'] text-[15px] font-bold tracking-[0.5px] text-white leading-none">
            Made with
          </span>
          <img
            src={TOP_SHOOTERS_GENERAL1_BRAND_LOGO}
            alt="Esportific"
            className="h-[29px] w-auto object-contain brightness-0 invert"
          />
        </div>

        <div className="font-['Plus_Jakarta_Sans'] text-[15px] font-extrabold tracking-[0.5px] text-[#111113] uppercase">
          <span>Compete. Survive. </span>
          <span className="text-[#ff5801]">Booyah!</span>
        </div>
      </footer>
    </div>
  );
});

/**
 * TopShootersGeneral1TemplateViewport
 * Interactive viewport wrapper that scales the 1122x1402 poster to fit its container
 */
export function TopShootersGeneral1TemplateViewport({
  children,
  padding = 16,
  className = "",
  style,
}: {
  children: ReactNode;
  padding?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateScale = () => {
      const rect = el.getBoundingClientRect();
      const availW = Math.max(100, rect.width - padding * 2);
      const availH = Math.max(100, rect.height - padding * 2);
      const nextScale = Math.min(
        availW / TOP_SHOOTERS_GENERAL1_WIDTH,
        availH / TOP_SHOOTERS_GENERAL1_HEIGHT,
      );
      setScale(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, [padding]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-0 flex items-center justify-center overflow-hidden bg-[#0a0b0e] ${className}`}
      style={style}
    >
      <div
        style={{
          width: TOP_SHOOTERS_GENERAL1_WIDTH,
          height: TOP_SHOOTERS_GENERAL1_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
        className="flex-shrink-0"
      >
        {children}
      </div>
    </div>
  );
}
