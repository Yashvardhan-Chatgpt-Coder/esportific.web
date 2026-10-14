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

export type TopShootersGeneral2TemplateProps = {
  eventName?: string;
  shooters?: TopShooterItem[];
  rows?: any[]; // Compatibility with generic leaderboard rows
  hue?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  className?: string;
  style?: CSSProperties;
};

export const TOP_SHOOTERS_GENERAL2_WIDTH = 1122;
export const TOP_SHOOTERS_GENERAL2_HEIGHT = 1402;

export const TOP_SHOOTERS_GENERAL2_BG_SRC =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Top%20Shooters/General%202%20Template/Background.png";
export const TOP_SHOOTERS_GENERAL2_FF_LOGO =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Top%20Shooters/General%202%20Template/free-fire-logo.png";
export const TOP_SHOOTERS_GENERAL2_BRAND_LOGO =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Top%20Shooters/General%202%20Template/esportific-logo.png";

// Default reference shooters
const DEFAULT_SHOOTERS: TopShooterItem[] = [
  {
    rank: 1,
    player: "KAIROS",
    team: "TEAM NEXUS",
    teamLogoSrc:
      "/Templates/Leaderboard/Universal/Battle%20Royal/Top%20Shooters/General%202%20Template/logo-nexus.png",
    kills: 24,
  },
  {
    rank: 2,
    player: "LUNA",
    team: "PHOENIX ESPORTS",
    teamLogoSrc:
      "/Templates/Leaderboard/Universal/Battle%20Royal/Top%20Shooters/General%202%20Template/logo-phoenix.png",
    kills: 18,
  },
  {
    rank: 3,
    player: "ZORO",
    team: "ECLIPSE",
    teamLogoSrc:
      "/Templates/Leaderboard/Universal/Battle%20Royal/Top%20Shooters/General%202%20Template/logo-eclipse.png",
    kills: 15,
  },
  {
    rank: 4,
    player: "RYZEN",
    team: "APEX UNION",
    teamLogoSrc:
      "/Templates/Leaderboard/Universal/Battle%20Royal/Top%20Shooters/General%202%20Template/logo-apex.png",
    kills: 12,
  },
  {
    rank: 5,
    player: "NOVA",
    team: "ROYAL KINGS",
    teamLogoSrc:
      "/Templates/Leaderboard/Universal/Battle%20Royal/Top%20Shooters/General%202%20Template/logo-royal-kings.png",
    kills: 11,
  },
];

// Helper to format player name - strictly first word only
function formatPlayerName(name: string) {
  if (!name) return "";
  return String(name).trim().split(/\s+/)[0].toUpperCase();
}

/**
 * TopShootersGeneral2TemplateStandingsRenderer
 * Pure Standings Canvas matching 1122x1402 General 2 Top Shooters layout
 */
export const TopShootersGeneral2TemplateStandingsRenderer = forwardRef<
  HTMLDivElement,
  TopShootersGeneral2TemplateProps
>(function TopShootersGeneral2TemplateStandingsRenderer(
  {
    eventName = "BGMI Invitational 2025 36",
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

  // Podium order: [Rank 4, Rank 2, Rank 1, Rank 3, Rank 5]
  const podiumSlots = useMemo(() => {
    const r1 = mappedShooters[0] ?? DEFAULT_SHOOTERS[0];
    const r2 = mappedShooters[1] ?? DEFAULT_SHOOTERS[1];
    const r3 = mappedShooters[2] ?? DEFAULT_SHOOTERS[2];
    const r4 = mappedShooters[3] ?? DEFAULT_SHOOTERS[3];
    const r5 = mappedShooters[4] ?? DEFAULT_SHOOTERS[4];

    return [
      { shooter: r4, left: 33, width: 201, isCenter: false },
      { shooter: r2, left: 245, width: 201, isCenter: false },
      { shooter: r1, left: 456, width: 214, isCenter: true },
      { shooter: r3, left: 682, width: 201, isCenter: false },
      { shooter: r5, left: 892, width: 201, isCenter: false },
    ];
  }, [mappedShooters]);

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden font-['Plus_Jakarta_Sans',sans-serif] text-black select-none ${className}`}
      style={{
        width: TOP_SHOOTERS_GENERAL2_WIDTH,
        height: TOP_SHOOTERS_GENERAL2_HEIGHT,
        backgroundColor: "#f7ede0",
        ...style,
      }}
    >
      {/* BACKGROUND IMAGE */}
      <img
        src={TOP_SHOOTERS_GENERAL2_BG_SRC}
        alt="Background"
        className="absolute inset-0 h-full w-full object-fill pointer-events-none"
        style={{ filter: filterStyle }}
      />

      {/* TOP BRANDING LOGO */}
      <div className="absolute top-[36px] left-[52px] z-10">
        <img
          src={TOP_SHOOTERS_GENERAL2_FF_LOGO}
          alt="Free Fire"
          className="h-[26px] w-auto object-contain"
        />
      </div>

      {/* EVENT SUBTITLE */}
      <div className="absolute top-[404px] left-0 w-[1122px] flex items-center justify-center gap-[18px] z-10">
        <span className="block w-[52px] h-[3.5px] bg-[#ff5801] rounded-[2px]" />
        <span className="font-['Plus_Jakarta_Sans'] text-[28px] font-extrabold text-[#111827] tracking-[0.5px] leading-none whitespace-nowrap">
          {eventName}
        </span>
        <span className="block w-[52px] h-[3.5px] bg-[#ff5801] rounded-[2px]" />
      </div>

      {/* 5 CARDS CONTENT LAYER */}
      <div className="absolute top-[920px] left-0 w-[1122px] h-[310px] z-10 pointer-events-none">
        {podiumSlots.map(({ shooter, left, width, isCenter }, slotIdx) => {
          const firstName = formatPlayerName(shooter.player);

          return (
            <div
              key={slotIdx}
              className="absolute top-0 h-[310px] flex flex-col items-center text-center"
              style={{ left, width }}
            >
              {/* Upper Info Section */}
              <div className="w-full h-[188px] flex flex-col items-center justify-start pt-[10px]">
                <div className="font-['Plus_Jakarta_Sans'] text-[24px] font-black tracking-[0.2px] text-[#111827] uppercase leading-none mb-[12px] max-w-[184px] overflow-hidden text-ellipsis whitespace-nowrap">
                  {firstName}
                </div>

                {/* Divider Line Above Team */}
                <div className="w-[82%] h-[1.5px] bg-[#dfd8cc] mx-auto flex-shrink-0" />

                {/* Team Section */}
                <div className="w-full flex-1 flex flex-col items-center justify-center pt-[4px] pb-[3px]">
                  <div className="w-[48px] h-[46px] flex items-center justify-center mb-[8px]">
                    {shooter.teamLogoSrc ? (
                      <img
                        src={shooter.teamLogoSrc}
                        alt={shooter.team}
                        className="max-w-[48px] max-h-[46px] w-auto h-auto object-contain"
                      />
                    ) : (
                      <div className="w-[44px] h-[44px] rounded-full bg-black/10 flex items-center justify-center font-bold text-black/50 text-[13px]">
                        {shooter.team.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="font-['Plus_Jakarta_Sans'] text-[13px] font-extrabold tracking-[0.5px] text-[#111827] uppercase leading-[1.15] max-w-[184px] overflow-hidden text-ellipsis whitespace-nowrap">
                    {shooter.team}
                  </div>
                </div>

                {/* Divider Line Below Team */}
                <div className="w-[82%] h-[1.5px] bg-[#dfd8cc] mx-auto flex-shrink-0" />
              </div>

              {/* Lower Kills Section */}
              <div
                className={`w-full h-[116px] flex flex-col items-center pb-[4px] ${
                  isCenter ? "justify-start pt-[14px]" : "justify-center"
                }`}
              >
                <div className="font-['Plus_Jakarta_Sans'] text-[14.5px] font-extrabold tracking-[0.8px] text-[#111827] uppercase leading-none mb-[2px]">
                  KILLS
                </div>
                <div
                  className={`font-['Bebas_Neue','Plus_Jakarta_Sans'] font-bold text-[#ff5801] tracking-[0.5px] ${
                    isCenter
                      ? "text-[82px] leading-[0.9] translate-y-[4px]"
                      : "text-[68px] leading-[0.95]"
                  }`}
                >
                  {shooter.kills}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* BOTTOM BRANDING (from General Template 2) */}
      <div className="absolute bottom-[36px] left-[52px] flex flex-col items-start gap-[6px] z-10 pointer-events-none">
        <span className="font-['Plus_Jakarta_Sans'] text-[16px] font-semibold text-white leading-none tracking-[0.3px]">
          Made With
        </span>
        <img
          src={TOP_SHOOTERS_GENERAL2_BRAND_LOGO}
          alt="Esportific"
          className="h-[32px] w-auto object-contain brightness-0 invert"
        />
      </div>

      <div className="absolute bottom-[42px] right-[52px] flex items-center z-10 pointer-events-none font-['Plus_Jakarta_Sans'] text-[16.5px] font-extrabold text-white tracking-[0.6px] uppercase leading-none">
        Compete Survive Booyah
      </div>
    </div>
  );
});

/**
 * TopShootersGeneral2TemplateViewport
 * Auto-scaling responsive viewport wrapper
 */
export function TopShootersGeneral2TemplateViewport({
  children,
  className = "",
  padding = 0,
}: {
  children: ReactNode;
  className?: string;
  padding?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateScale = () => {
      const availW = el.clientWidth - padding * 2;
      const availH = el.clientHeight - padding * 2;
      if (availW <= 0 || availH <= 0) return;

      const scaleX = availW / TOP_SHOOTERS_GENERAL2_WIDTH;
      const scaleY = availH / TOP_SHOOTERS_GENERAL2_HEIGHT;
      setScale(Math.min(scaleX, scaleY));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, [padding]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className}`}
      style={{ padding }}
    >
      <div
        style={{
          width: TOP_SHOOTERS_GENERAL2_WIDTH,
          height: TOP_SHOOTERS_GENERAL2_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          flexShrink: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
