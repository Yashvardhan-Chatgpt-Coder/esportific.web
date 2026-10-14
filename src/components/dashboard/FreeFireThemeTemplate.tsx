import {
  forwardRef,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

export type FreeFireThemeTemplateRow = {
  rank: number | string;
  team: string;
  teamLogoSrc?: string | null;
  wins: number | string;
  killPoints: number | string;
  placementPoints: number | string;
  totalPoints: number | string;
};

export type FreeFireThemeTemplateProps = {
  eventName?: string;
  rows?: FreeFireThemeTemplateRow[];
  hue?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  className?: string;
  style?: CSSProperties;
};

export const FREE_FIRE_TEMPLATE_WIDTH = 1080;
export const FREE_FIRE_TEMPLATE_HEIGHT = 1350;
export const FREE_FIRE_TEMPLATE_BG_SRC =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/Free%20Fire%20Theme%20Template/Background.png";
export const FREE_FIRE_TEMPLATE_LOGO =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/Free%20Fire%20Theme%20Template/free-fire-white.png";
export const FREE_FIRE_TEMPLATE_BRAND_LOGO =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/Free%20Fire%20Theme%20Template/esportific-logo.png";

// Preset team crest SVG icons matching reference image
const CREST_SVGS = [
  // Phoenix / Red Bird
  `<svg viewBox="0 0 24 24" fill="#d91d1d"><path d="M12 2L14 7L19 4L16 9L22 10L17 14L20 19L14 16L12 22L10 16L4 19L7 14L2 10L8 9L5 4L10 7Z"/></svg>`,
  // Titans / Blue Shield
  `<svg viewBox="0 0 24 24"><path d="M12 2L4 5V11C4 16.5 7.4 21.6 12 23C16.6 21.6 20 16.5 20 11V5L12 2Z" fill="#182848"/><path d="M7 8H17V11H13.5V18H10.5V11H7V8Z" fill="#ffffff"/></svg>`,
  // Shadow Clan / Purple Hood
  `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#2d124d"/><path d="M12 4C8 4 6 8 6 12C6 16 9 20 12 20C15 20 18 16 18 12C18 8 16 4 12 4ZM9 12L10.5 13.5L9 15L7.5 13.5L9 12ZM15 12L16.5 13.5L15 15L13.5 13.5L15 12Z" fill="#a855f7"/></svg>`,
  // Royal Kings / Crown
  `<svg viewBox="0 0 24 24" fill="#eab308"><path d="M3 18H21V20H3V18ZM4 6L8.5 10L12 4L15.5 10L20 6L18.5 16H5.5L4 6Z"/></svg>`,
  // Vortex / Blue Swirl
  `<svg viewBox="0 0 24 24" fill="#0284c7"><path d="M12 2A10 10 0 1 0 22 12A10 10 0 0 0 12 2Zm0 17a7 7 0 1 1 7-7 7 7 0 0 1-7 7Zm-2-7a2 2 0 1 1 2 2 2 2 0 0 1-2-2Z"/></svg>`,
  // Team Nexus / Orange Diamond N
  `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4" fill="#ea580c"/><path d="M7 7H10L14 13V7H17V17H14L10 11V17H7V7Z" fill="#ffffff"/></svg>`,
  // Blaze / Orange Flame
  `<svg viewBox="0 0 24 24" fill="#f97316"><path d="M12 2C9 7 6 9 6 13C6 17 9 21 12 22C15 21 18 17 18 13C18 10 16 6 12 2ZM12 19C10.5 19 9 17.5 9 15C9 13 10.5 11 12 10C13.5 11 15 13 15 15C15 17.5 13.5 19 12 19Z"/></svg>`,
  // Eclipse / Crescent
  `<svg viewBox="0 0 24 24" fill="#0f172a"><path d="M12 2A10 10 0 1 0 22 12A10 10 0 0 1 12 2Z"/></svg>`,
  // Quantum / Atom
  `<svg viewBox="0 0 24 24" fill="#2563eb"><circle cx="12" cy="12" r="3"/><path d="M12 3C7 3 3 7 3 12S7 21 12 21 21 17 21 12 17 3 12 3ZM12 19C8.1 19 5 15.9 5 12S8.1 5 12 5 19 8.1 19 12 15.9 19 12 19Z"/></svg>`,
  // Apex / Red Delta
  `<svg viewBox="0 0 24 24"><polygon points="12,2 22,20 2,20" fill="#dc2626"/><polygon points="12,8 18,18 6,18" fill="#ffffff"/></svg>`,
  // Inferno / Dark Red Beast
  `<svg viewBox="0 0 24 24" fill="#991b1b"><path d="M12 2L15 8L21 9L16.5 13.5L18 20L12 16.5L6 20L7.5 13.5L3 9L9 8L12 2Z"/></svg>`,
  // Celestials / Wings
  `<svg viewBox="0 0 24 24" fill="#06b6d4"><path d="M12 3C7 3 3 8 3 13C3 18 8 21 12 21C16 21 21 18 21 13C21 8 17 3 12 3ZM7 14L10 11L12 14L14 11L17 14L12 18L7 14Z"/></svg>`,
  // Nova Esports / Purple Star
  `<svg viewBox="0 0 24 24" fill="#9333ea"><polygon points="12,1 15,9 23,10 17,16 19,23 12,19 5,23 7,16 1,10 9,9"/></svg>`,
  // Revenant / Skull
  `<svg viewBox="0 0 24 24" fill="#1e293b"><circle cx="12" cy="10" r="7"/><rect x="8" y="15" width="8" height="6" rx="2"/><circle cx="9.5" cy="10" r="1.5" fill="#ffffff"/><circle cx="14.5" cy="10" r="1.5" fill="#ffffff"/></svg>`,
  // Nemesis / Hexagon
  `<svg viewBox="0 0 24 24" fill="#0f172a"><polygon points="12,2 21,7 21,17 12,22 3,17 3,7"/><circle cx="12" cy="12" r="5" fill="#f97316"/></svg>`,
  // Horizon / Sunset over water
  `<svg viewBox="0 0 24 24"><defs><linearGradient id="ffhz" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f97316"/><stop offset="100%" stop-color="#1e3a8a"/></linearGradient></defs><circle cx="12" cy="12" r="10" fill="url(#ffhz)"/><circle cx="12" cy="10" r="4" fill="#fef08a"/><rect x="4" y="12" width="16" height="2" fill="#1e3a8a"/></svg>`,
];

// Preset teams matching reference image
const DEFAULT_PRESET_TEAMS = [
  "Phoenix Esports",
  "Titans",
  "Shadow Clan",
  "Royal Kings",
  "Vortex",
  "Team Nexus",
  "Blaze",
  "Eclipse",
  "Quantum",
  "Apex",
  "Inferno",
  "Celestials",
  "Nova Esports",
  "Revenant",
  "Nemesis",
  "Horizon",
];

const DEFAULT_ROWS: FreeFireThemeTemplateRow[] = DEFAULT_PRESET_TEAMS.map(
  (name, index) => ({
    rank: index + 1,
    team: name,
    wins: 0,
    killPoints: 0,
    placementPoints: 0,
    totalPoints: 0,
  }),
);

/**
 * FreeFireThemeTemplate:
 * Premium Free Fire themed standings template at 1080x1350 resolution.
 * Features:
 * - Top Left Free Fire wordmark logo
 * - Gold crown angled above OVERALL
 * - Dynamic SVG brush-stroke banner adapting width to event name without texture distortion
 * - Flanking speed dashes
 * - Standings table with rounded corners, orange header, and alternating cream rows
 */
export const FreeFireThemeTemplate = forwardRef<
  HTMLDivElement,
  FreeFireThemeTemplateProps
>(function FreeFireThemeTemplate(
  {
    eventName = "EVENT NAME HERE",
    rows = DEFAULT_ROWS,
    hue = 0,
    brightness = 100,
    contrast = 100,
    saturation = 100,
    className,
    style,
  },
  ref,
) {
  const displayRows = useMemo(() => {
    const combined = [...rows];
    while (combined.length < 16) {
      const idx = combined.length;
      combined.push({
        rank: idx + 1,
        team: DEFAULT_PRESET_TEAMS[idx % DEFAULT_PRESET_TEAMS.length],
        wins: 0,
        killPoints: 0,
        placementPoints: 0,
        totalPoints: 0,
      });
    }
    return combined.slice(0, 16);
  }, [rows]);

  const cleanEventName = (eventName || "EVENT NAME HERE").trim();

  // Dynamic SVG Brush Banner dimensions
  const bannerMetrics = useMemo(() => {
    const charWidth = cleanEventName.length <= 10 ? 17 : 14.5;
    const calculatedWidth = Math.max(
      340,
      Math.min(780, cleanEventName.length * charWidth + 110),
    );
    const W = calculatedWidth;
    const H = 58;
    const leftW = 45;
    const rightW = 55;
    const rightStart = W - rightW;

    const brushPath = `
      M 0,22
      L 2,19 L 6,18 L 10,18 L 16,17 L 22,17 L 28,16 L 36,15 L 45,14
      Q ${W * 0.5},1 ${rightStart},6
      L ${W - 48},5 L ${W - 36},6 L ${W - 24},8 L ${W - 14},8 L ${W - 4},7 L ${W},8
      L ${W - 12},17 L ${W - 2},20 L ${W - 8},25 L ${W - 18},28 L ${W - 6},32 L ${W - 16},36
      L ${W - 4},40 L ${W - 14},44 L ${W - 22},46 L ${W - 38},47 L ${rightStart},48
      Q ${W * 0.5},54 ${leftW},51
      L 34,51 L 24,50 L 16,49 L 10,48 L 4,45 L 8,38 L 2,34 L 7,28 L 0,22
      Z
    `;

    return { W, H, brushPath };
  }, [cleanEventName]);

  const filterStyle: CSSProperties = useMemo(() => {
    const filters: string[] = [];
    if (hue !== 0) filters.push(`hue-rotate(${hue}deg)`);
    if (brightness !== 100) filters.push(`brightness(${brightness}%)`);
    if (contrast !== 100) filters.push(`contrast(${contrast}%)`);
    if (saturation !== 100) filters.push(`saturate(${saturation}%)`);
    return filters.length > 0 ? { filter: filters.join(" ") } : {};
  }, [hue, brightness, contrast, saturation]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        position: "relative",
        width: `${FREE_FIRE_TEMPLATE_WIDTH}px`,
        height: `${FREE_FIRE_TEMPLATE_HEIGHT}px`,
        backgroundColor: "#0a0a0c",
        backgroundImage: `url("${FREE_FIRE_TEMPLATE_BG_SRC}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        overflow: "hidden",
        boxSizing: "border-box",
        userSelect: "none",
        fontFamily: "'Montserrat', 'Inter', -apple-system, sans-serif",
        ...filterStyle,
        ...style,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800;900&family=Permanent+Marker&family=Sedgwick+Ave&family=Inter:wght@600;700;800;900&display=swap');
      `}</style>

      {/* Top Left Free Fire Wordmark Logo */}
      <img
        src={FREE_FIRE_TEMPLATE_LOGO}
        alt="Free Fire"
        style={{
          position: "absolute",
          top: "34px",
          left: "38px",
          height: "38px",
          width: "auto",
          objectFit: "contain",
          zIndex: 15,
          filter: "drop-shadow(0 2px 8px rgba(0, 0, 0, 0.6))",
          pointerEvents: "none",
        }}
      />

      {/* Dynamic SVG Brush-Stroke Banner for Event Name (Shifted down below STANDINGS) */}
      <div
        style={{
          position: "absolute",
          top: "458px",
          left: "395px",
          transform: "translate(-50%, 0) rotate(-2.8deg)",
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={bannerMetrics.W + 80}
          height={bannerMetrics.H + 16}
          viewBox={`-55 -4 ${bannerMetrics.W + 110} ${bannerMetrics.H + 16}`}
          style={{ overflow: "visible" }}
        >
          <defs>
            <filter id="ffBrushShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow
                dx="0"
                dy="3"
                stdDeviation="3.5"
                floodColor="#000000"
                floodOpacity="0.6"
              />
            </filter>
          </defs>

          {/* Left speed dashes */}
          <g transform="translate(-46, 10)" fill="#fba000">
            <polygon points="4,24 28,16 26,19 2,27" />
            <polygon points="10,36 34,31 32,34 8,39" />
          </g>

          {/* Right speed dashes */}
          <g transform={`translate(${bannerMetrics.W + 12}, 10)`} fill="#fba000">
            <polygon points="4,16 28,24 26,27 2,19" />
            <polygon points="6,31 30,36 28,39 4,34" />
          </g>

          {/* Dynamic brush stroke banner */}
          <path
            d={bannerMetrics.brushPath}
            fill="#fba000"
            filter="url(#ffBrushShadow)"
          />

          {/* Centered Event Name */}
          <text
            x={bannerMetrics.W * 0.5}
            y="32"
            fontFamily="'Permanent Marker', 'Sedgwick Ave', cursive, sans-serif"
            fontSize="25"
            fontWeight="900"
            fill="#08080a"
            textAnchor="middle"
            dominantBaseline="middle"
            letterSpacing="1.4"
          >
            {cleanEventName}
          </text>
        </svg>
      </div>

      {/* Standings Table Container (Shifted down below banner) */}
      <div
        style={{
          position: "absolute",
          top: "536px",
          left: "38px",
          width: "1004px",
          height: "730px",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 12px 30px rgba(0, 0, 0, 0.5)",
          zIndex: 10,
          background: "transparent",
        }}
      >
        <table
          style={{
            width: "100%",
            height: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
            fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: "#ef4303",
                height: "58px",
              }}
            >
              <th
                style={{
                  width: "68px",
                  textAlign: "center",
                  color: "#ffffff",
                  fontFamily: "'Arial Black', Gadget, 'Impact', Arial, sans-serif",
                  fontWeight: 900,
                  fontSize: "19px",
                  padding: 0,
                  border: "none",
                }}
              >
                #
              </th>
              <th
                style={{
                  width: "356px",
                  textAlign: "left",
                  paddingLeft: "28px",
                  color: "#ffffff",
                  fontFamily: "'Arial Black', Gadget, 'Impact', Arial, sans-serif",
                  fontWeight: 900,
                  fontSize: "16px",
                  letterSpacing: "0.4px",
                  textTransform: "uppercase",
                  border: "none",
                }}
              >
                TEAM
              </th>
              <th
                style={{
                  width: "145px",
                  textAlign: "center",
                  color: "#ffffff",
                  fontFamily: "'Arial Black', Gadget, 'Impact', Arial, sans-serif",
                  fontWeight: 900,
                  fontSize: "16px",
                  letterSpacing: "0.4px",
                  textTransform: "uppercase",
                  border: "none",
                  borderLeft: "1px solid rgba(255, 255, 255, 0.22)",
                }}
              >
                WINS
              </th>
              <th
                style={{
                  width: "145px",
                  textAlign: "center",
                  color: "#ffffff",
                  fontFamily: "'Arial Black', Gadget, 'Impact', Arial, sans-serif",
                  fontWeight: 900,
                  fontSize: "16px",
                  letterSpacing: "0.4px",
                  textTransform: "uppercase",
                  border: "none",
                  borderLeft: "1px solid rgba(255, 255, 255, 0.22)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1.12,
                  }}
                >
                  <span style={{ fontSize: "13.5px" }}>KILL</span>
                  <span style={{ fontSize: "13.5px" }}>POINTS</span>
                </div>
              </th>
              <th
                style={{
                  width: "145px",
                  textAlign: "center",
                  color: "#ffffff",
                  fontFamily: "'Arial Black', Gadget, 'Impact', Arial, sans-serif",
                  fontWeight: 900,
                  fontSize: "16px",
                  letterSpacing: "0.4px",
                  textTransform: "uppercase",
                  border: "none",
                  borderLeft: "1px solid rgba(255, 255, 255, 0.22)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1.12,
                  }}
                >
                  <span style={{ fontSize: "13.5px" }}>PLACEMENT</span>
                  <span style={{ fontSize: "13.5px" }}>POINTS</span>
                </div>
              </th>
              <th
                style={{
                  width: "145px",
                  textAlign: "center",
                  color: "#ffffff",
                  fontFamily: "'Arial Black', Gadget, 'Impact', Arial, sans-serif",
                  fontWeight: 900,
                  fontSize: "16px",
                  letterSpacing: "0.4px",
                  textTransform: "uppercase",
                  border: "none",
                  borderLeft: "1px solid rgba(255, 255, 255, 0.22)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1.12,
                  }}
                >
                  <span style={{ fontSize: "13.5px" }}>TOTAL</span>
                  <span style={{ fontSize: "13.5px" }}>POINTS</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, index) => {
              const isEven = index % 2 === 1;
              const bg = isEven ? "#ede4d5" : "#f7ede1";
              const defaultCrest = CREST_SVGS[index % CREST_SVGS.length];

              return (
                <tr
                  key={index}
                  style={{
                    backgroundColor: bg,
                    height: "42px",
                    borderBottom:
                      index === 15
                        ? "none"
                        : "1px solid rgba(215, 202, 185, 0.45)",
                  }}
                >
                  <td
                    style={{
                      textAlign: "center",
                      fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
                      fontSize: "17px",
                      fontWeight: 700,
                      color: "#18181a",
                      padding: 0,
                    }}
                  >
                    {row.rank}
                  </td>
                  <td
                    style={{
                      paddingLeft: "20px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: "26px",
                          height: "26px",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {row.teamLogoSrc ? (
                          <img
                            src={row.teamLogoSrc}
                            alt={row.team}
                            style={{
                              width: "26px",
                              height: "26px",
                              objectFit: "contain",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "26px",
                              height: "26px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            dangerouslySetInnerHTML={{ __html: defaultCrest }}
                          />
                        )}
                      </div>
                      <span
                        style={{
                          fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
                          fontSize: "16.5px",
                          fontWeight: 700,
                          color: "#18181a",
                          letterSpacing: "0.2px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {row.team}
                      </span>
                    </div>
                  </td>
                  <td
                    style={{
                      textAlign: "center",
                      fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
                      fontSize: "17.5px",
                      fontWeight: 700,
                      color: "#18181a",
                    }}
                  >
                    {row.wins}
                  </td>
                  <td
                    style={{
                      textAlign: "center",
                      fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
                      fontSize: "17.5px",
                      fontWeight: 700,
                      color: "#18181a",
                    }}
                  >
                    {row.killPoints}
                  </td>
                  <td
                    style={{
                      textAlign: "center",
                      fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
                      fontSize: "17.5px",
                      fontWeight: 700,
                      color: "#18181a",
                    }}
                  >
                    {row.placementPoints}
                  </td>
                  <td
                    style={{
                      textAlign: "center",
                      fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
                      fontSize: "17.5px",
                      fontWeight: 700,
                      color: "#18181a",
                    }}
                  >
                    {row.totalPoints}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom Branding: Made With & Esportific Logo */}
      <div
        style={{
          position: "absolute",
          bottom: "14px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          zIndex: 20,
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
            fontSize: "13px",
            fontWeight: 700,
            color: "#ffffff",
            opacity: 0.9,
            lineHeight: 1,
            letterSpacing: "0.6px",
          }}
        >
          Made With
        </span>
        <img
          src={FREE_FIRE_TEMPLATE_BRAND_LOGO}
          alt="Esportific"
          style={{
            height: "24px",
            width: "auto",
            objectFit: "contain",
            display: "block",
            filter: "drop-shadow(0 2px 6px rgba(0, 0, 0, 0.7))",
          }}
        />
      </div>
    </div>
  );
});

/**
 * FreeFireThemeTemplateViewport:
 * Responsive auto-scaling container that fits the 1080x1350 template into any container.
 */
export function FreeFireThemeTemplateViewport({
  children,
  className = "",
  style,
  padding = 0,
}: {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  padding?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(0.3);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateScale = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const availableW = Math.max(0, rect.width - padding);
        const availableH = Math.max(0, rect.height - padding);
        const scaleX = availableW / FREE_FIRE_TEMPLATE_WIDTH;
        const scaleY = availableH / FREE_FIRE_TEMPLATE_HEIGHT;
        const computed = Math.min(scaleX, scaleY);
        if (Number.isFinite(computed) && computed > 0) {
          setScale(computed);
        }
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, [padding]);

  return (
    <div
      ref={containerRef}
      className={`relative flex h-full w-full items-center justify-center overflow-hidden ${className}`}
      style={style}
    >
      <div
        style={{
          width: `${FREE_FIRE_TEMPLATE_WIDTH * scale}px`,
          height: `${FREE_FIRE_TEMPLATE_HEIGHT * scale}px`,
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: `${FREE_FIRE_TEMPLATE_WIDTH}px`,
            height: `${FREE_FIRE_TEMPLATE_HEIGHT}px`,
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          {children || <FreeFireThemeTemplate />}
        </div>
      </div>
    </div>
  );
}

export const FreeFireThemeTemplateStandingsRenderer = FreeFireThemeTemplate;
