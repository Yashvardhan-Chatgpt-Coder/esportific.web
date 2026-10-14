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

export type TopShootersAutumnTemplateProps = {
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

export const TOP_SHOOTERS_AUTUMN_WIDTH = 1080;
export const TOP_SHOOTERS_AUTUMN_HEIGHT = 1350;

export const TOP_SHOOTERS_AUTUMN_BG_SRC =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Top%20Shooters/Autumn%20Theme%20Template/Background.png";
export const TOP_SHOOTERS_AUTUMN_FF_LOGO =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Top%20Shooters/Autumn%20Theme%20Template/free-fire-logo.png";
export const TOP_SHOOTERS_AUTUMN_BRAND_LOGO =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Top%20Shooters/Autumn%20Theme%20Template/esportific-logo.png";

// Preset default shooters matching reference design
const DEFAULT_SHOOTERS: TopShooterItem[] = [
  {
    rank: 1,
    player: "KAIROS",
    team: "TEAM NEXUS",
    teamLogoSrc:
      "/Templates/Leaderboard/Universal/Battle%20Royal/Top%20Shooters/Autumn%20Theme%20Template/logo-nexus.svg",
    kills: 24,
  },
  {
    rank: 2,
    player: "LUNA",
    team: "PHOENIX ESPORTS",
    teamLogoSrc:
      "/Templates/Leaderboard/Universal/Battle%20Royal/Top%20Shooters/Autumn%20Theme%20Template/logo-phoenix.svg",
    kills: 18,
  },
  {
    rank: 3,
    player: "ZORO",
    team: "ECLIPSE",
    teamLogoSrc:
      "/Templates/Leaderboard/Universal/Battle%20Royal/Top%20Shooters/Autumn%20Theme%20Template/logo-eclipse.svg",
    kills: 15,
  },
  {
    rank: 4,
    player: "RYZEN",
    team: "APEX UNION",
    teamLogoSrc:
      "/Templates/Leaderboard/Universal/Battle%20Royal/Top%20Shooters/Autumn%20Theme%20Template/logo-apex.svg",
    kills: 12,
  },
  {
    rank: 5,
    player: "NOVA",
    team: "ROYAL KINGS",
    teamLogoSrc:
      "/Templates/Leaderboard/Universal/Battle%20Royal/Top%20Shooters/Autumn%20Theme%20Template/logo-royal-kings.svg",
    kills: 11,
  },
];

// Helper to format player name with 2-word line wrapping
function renderPlayerName(name: string) {
  const clean = (name || "").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const mid = Math.ceil(words.length / 2);
    const line1 = words.slice(0, mid).join(" ");
    const line2 = words.slice(mid).join(" ");
    return (
      <div className="player-name two-lines">
        <span>{line1}</span>
        <span>{line2}</span>
      </div>
    );
  }
  return (
    <div className="player-name">
      <span>{clean || "PLAYER"}</span>
    </div>
  );
}

export const TopShootersAutumnTemplateStandingsRenderer = forwardRef<
  HTMLDivElement,
  TopShootersAutumnTemplateProps
>(function TopShootersAutumnTemplateStandingsRenderer(
  {
    shooters,
    rows,
    hue = 0,
    brightness = 100,
    contrast = 100,
    saturation = 100,
    className = "",
    style,
  },
  ref
) {
  // Normalize input data: either shooters prop or rows prop
  const activeShooters: TopShooterItem[] = useMemo(() => {
    const source = (shooters && shooters.length > 0) ? shooters : rows;
    if (source && source.length > 0) {
      const mapped: TopShooterItem[] = source.slice(0, 5).map((item, idx) => {
        const rank = item.rank ?? idx + 1;
        const player = item.player || item.name || item.team || `PLAYER ${rank}`;
        const team = item.team || "TEAM";
        const teamLogoSrc = item.teamLogoSrc || null;
        const kills = item.kills ?? item.killPoints ?? 0;
        return { rank, player, team, teamLogoSrc, kills };
      });
      // Ensure we have 5 slots
      while (mapped.length < 5) {
        const fallback = DEFAULT_SHOOTERS[mapped.length];
        mapped.push(fallback);
      }
      return mapped;
    }
    return DEFAULT_SHOOTERS;
  }, [shooters, rows]);

  // Find shooter by rank (or fallback to slot)
  const rank1 = activeShooters.find((s) => Number(s.rank) === 1) || activeShooters[0];
  const rank2 = activeShooters.find((s) => Number(s.rank) === 2) || activeShooters[1];
  const rank3 = activeShooters.find((s) => Number(s.rank) === 3) || activeShooters[2];
  const rank4 = activeShooters.find((s) => Number(s.rank) === 4) || activeShooters[3];
  const rank5 = activeShooters.find((s) => Number(s.rank) === 5) || activeShooters[4];

  const filterStyle = useMemo(() => {
    const parts: string[] = [];
    if (hue !== 0) parts.push(`hue-rotate(${hue}deg)`);
    if (brightness !== 100) parts.push(`brightness(${brightness}%)`);
    if (contrast !== 100) parts.push(`contrast(${contrast}%)`);
    if (saturation !== 100) parts.push(`saturate(${saturation}%)`);
    return parts.length > 0 ? parts.join(" ") : "none";
  }, [hue, brightness, contrast, saturation]);

  return (
    <div
      ref={ref}
      className={`top-shooters-autumn-canvas ${className}`}
      style={{
        width: `${TOP_SHOOTERS_AUTUMN_WIDTH}px`,
        height: `${TOP_SHOOTERS_AUTUMN_HEIGHT}px`,
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#08090b",
        fontFamily: "'Arial Black', Gadget, Impact, sans-serif",
        userSelect: "none",
        flexShrink: 0,
        ...style,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');

        .top-shooters-autumn-canvas * {
          box-sizing: border-box;
          -webkit-font-smoothing: antialiased;
        }

        .top-shooters-autumn-canvas .bg-art {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          background: #0d0c0c url('${TOP_SHOOTERS_AUTUMN_BG_SRC}') no-repeat center top;
          background-size: 1080px 1350px;
          pointer-events: none;
        }

        .top-shooters-autumn-canvas .top-brand-logo {
          position: absolute;
          top: 42px;
          left: 45px;
          height: 38px;
          width: auto;
          object-fit: contain;
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.6));
          z-index: 10;
        }

        .top-shooters-autumn-canvas .player-stats-stage {
          position: absolute;
          top: 960px;
          left: 0;
          width: 1080px;
          height: 250px;
          z-index: 10;
          pointer-events: none;
        }

        .top-shooters-autumn-canvas .player-card {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          text-align: center;
        }

        .top-shooters-autumn-canvas .card-rank-4 {
          left: 28px;
          width: 188px;
          top: 10px;
        }

        .top-shooters-autumn-canvas .card-rank-2 {
          left: 226px;
          width: 190px;
          top: 10px;
        }

        .top-shooters-autumn-canvas .card-rank-1 {
          left: 430px;
          width: 220px;
          top: 0px;
        }

        .top-shooters-autumn-canvas .card-rank-3 {
          left: 665px;
          width: 190px;
          top: 10px;
        }

        .top-shooters-autumn-canvas .card-rank-5 {
          left: 868px;
          width: 188px;
          top: 10px;
        }

        .top-shooters-autumn-canvas .player-name {
          font-family: 'Bebas Neue', Impact, sans-serif;
          font-size: 32px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: 2px;
          text-transform: uppercase;
          line-height: 0.92;
          margin-bottom: 12px;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.9);
          text-align: center;
          max-width: 175px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .top-shooters-autumn-canvas .player-name span {
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        .top-shooters-autumn-canvas .player-name.two-lines {
          font-size: 26px;
          line-height: 0.92;
          margin-bottom: 8px;
        }

        .top-shooters-autumn-canvas .card-rank-1 .player-name {
          font-size: 37px;
          letter-spacing: 2.2px;
          margin-bottom: 14px;
          max-width: 205px;
        }

        .top-shooters-autumn-canvas .card-rank-1 .player-name.two-lines {
          font-size: 30px;
          line-height: 0.92;
          margin-bottom: 10px;
        }

        .top-shooters-autumn-canvas .team-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          margin-bottom: 22px;
          max-width: 100%;
          padding: 0 4px;
        }

        .top-shooters-autumn-canvas .card-rank-1 .team-badge {
          margin-bottom: 24px;
          gap: 8px;
        }

        .top-shooters-autumn-canvas .team-logo {
          height: 17px;
          width: auto;
          max-width: 23px;
          object-fit: contain;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8));
          flex-shrink: 0;
        }

        .top-shooters-autumn-canvas .card-rank-1 .team-logo {
          height: 19px;
          max-width: 25px;
        }

        .top-shooters-autumn-canvas .team-name {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
          line-height: 1;
        }

        .top-shooters-autumn-canvas .card-rank-1 .team-name {
          font-size: 12px;
          letter-spacing: 0.9px;
        }

        .top-shooters-autumn-canvas .kills-label {
          font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
          font-size: 13.5px;
          font-weight: 900;
          color: #8c939e;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 4px;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
        }

        .top-shooters-autumn-canvas .card-rank-1 .kills-label {
          font-size: 14.5px;
          margin-bottom: 4px;
        }

        .top-shooters-autumn-canvas .kills-count {
          font-family: 'Arial Black', Gadget, Impact, sans-serif;
          font-size: 68px;
          font-weight: 900;
          color: #ff6a00;
          line-height: 0.92;
          letter-spacing: -1.5px;
          filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.85));
        }

        .top-shooters-autumn-canvas .card-rank-1 .kills-count {
          font-size: 80px;
          filter: drop-shadow(0 4px 14px rgba(255, 106, 0, 0.35)) drop-shadow(0 4px 10px rgba(0, 0, 0, 0.85));
        }

        .top-shooters-autumn-canvas .bottom-branding {
          position: absolute;
          bottom: 42px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
          z-index: 25;
          pointer-events: none;
        }

        .top-shooters-autumn-canvas .made-with-label {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #ffffff;
          opacity: 0.92;
          line-height: 1;
          letter-spacing: 0.6px;
          text-shadow: 0 2px 6px rgba(0, 0, 0, 0.9);
        }

        .top-shooters-autumn-canvas .branding-logo {
          height: 25px;
          width: auto;
          object-fit: contain;
          display: block;
          filter: brightness(0) invert(1) drop-shadow(0 2px 8px rgba(0, 0, 0, 0.9));
        }
      `}</style>

      {/* Background artwork with CSS filters applied */}
      <div className="bg-art" style={{ filter: filterStyle }} />

      {/* Top Left Free Fire Wordmark Logo */}
      <img
        src={TOP_SHOOTERS_AUTUMN_FF_LOGO}
        alt="Free Fire"
        className="top-brand-logo"
      />

      {/* 5-Pillar Player Stats Content Stage */}
      <div className="player-stats-stage">
        {/* Rank 4 Player (Far Left) */}
        <div className="player-card card-rank-4">
          {renderPlayerName(rank4.player)}
          <div className="team-badge">
            {rank4.teamLogoSrc && (
              <img
                src={rank4.teamLogoSrc}
                alt={rank4.team}
                className="team-logo"
              />
            )}
            <span className="team-name">{rank4.team}</span>
          </div>
          <div className="kills-label">KILLS</div>
          <div className="kills-count">{rank4.kills}</div>
        </div>

        {/* Rank 2 Player (Inner Left) */}
        <div className="player-card card-rank-2">
          {renderPlayerName(rank2.player)}
          <div className="team-badge">
            {rank2.teamLogoSrc && (
              <img
                src={rank2.teamLogoSrc}
                alt={rank2.team}
                className="team-logo"
              />
            )}
            <span className="team-name">{rank2.team}</span>
          </div>
          <div className="kills-label">KILLS</div>
          <div className="kills-count">{rank2.kills}</div>
        </div>

        {/* Rank 1 Player (Center Champion) */}
        <div className="player-card card-rank-1">
          {renderPlayerName(rank1.player)}
          <div className="team-badge">
            {rank1.teamLogoSrc && (
              <img
                src={rank1.teamLogoSrc}
                alt={rank1.team}
                className="team-logo"
              />
            )}
            <span className="team-name">{rank1.team}</span>
          </div>
          <div className="kills-label">KILLS</div>
          <div className="kills-count">{rank1.kills}</div>
        </div>

        {/* Rank 3 Player (Inner Right) */}
        <div className="player-card card-rank-3">
          {renderPlayerName(rank3.player)}
          <div className="team-badge">
            {rank3.teamLogoSrc && (
              <img
                src={rank3.teamLogoSrc}
                alt={rank3.team}
                className="team-logo"
              />
            )}
            <span className="team-name">{rank3.team}</span>
          </div>
          <div className="kills-label">KILLS</div>
          <div className="kills-count">{rank3.kills}</div>
        </div>

        {/* Rank 5 Player (Far Right) */}
        <div className="player-card card-rank-5">
          {renderPlayerName(rank5.player)}
          <div className="team-badge">
            {rank5.teamLogoSrc && (
              <img
                src={rank5.teamLogoSrc}
                alt={rank5.team}
                className="team-logo"
              />
            )}
            <span className="team-name">{rank5.team}</span>
          </div>
          <div className="kills-label">KILLS</div>
          <div className="kills-count">{rank5.kills}</div>
        </div>
      </div>

      {/* Bottom Software Branding */}
      <div className="bottom-branding">
        <span className="made-with-label">Made With</span>
        <img
          src={TOP_SHOOTERS_AUTUMN_BRAND_LOGO}
          alt="Esportific"
          className="branding-logo"
        />
      </div>
    </div>
  );
});

export type TopShootersAutumnTemplateViewportProps = {
  children: ReactNode;
  padding?: number;
  className?: string;
  style?: CSSProperties;
};

export function TopShootersAutumnTemplateViewport({
  children,
  padding = 16,
  className = "",
  style,
}: TopShootersAutumnTemplateViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function updateScale() {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const availW = Math.max(0, rect.width - padding * 2);
      const availH = Math.max(0, rect.height - padding * 2);

      const nextScale = Math.min(
        availW / TOP_SHOOTERS_AUTUMN_WIDTH,
        availH / TOP_SHOOTERS_AUTUMN_HEIGHT
      );
      setScale(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1);
    }

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    window.addEventListener("resize", updateScale);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, [padding]);

  return (
    <div
      ref={containerRef}
      className={`relative flex h-full w-full items-center justify-center overflow-hidden ${className}`}
      style={style}
    >
      <div
        style={{
          width: `${TOP_SHOOTERS_AUTUMN_WIDTH}px`,
          height: `${TOP_SHOOTERS_AUTUMN_HEIGHT}px`,
          transform: `scale(${scale}) translateZ(0)`,
          transformOrigin: "center center",
          flexShrink: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
