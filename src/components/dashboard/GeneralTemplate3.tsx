import {
  forwardRef,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

export type GeneralTemplate3Row = {
  rank: number | string;
  team: string;
  teamLogoSrc?: string | null;
  wins: number | string;
  killPoints: number | string;
  placementPoints: number | string;
  totalPoints: number | string;
};

export type GeneralTemplate3Props = {
  eventName?: string;
  eventSubtitle?: string;
  gameName?: string;
  rows?: GeneralTemplate3Row[];
  hue?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  className?: string;
  style?: CSSProperties;
};

export const GENERAL_TEMPLATE_3_WIDTH = 1080;
export const GENERAL_TEMPLATE_3_HEIGHT = 1350;
export const GENERAL_TEMPLATE_3_BG_SRC =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/General%20Template%203/Background.png";
export const GENERAL_TEMPLATE_3_BRAND_LOGO =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/General%20Template%203/esportific-logo.png";

// Preset team crest SVG icons matching reference image
const CREST_SVGS = [
  // 1. Phoenix / Red Bird
  `<svg viewBox="0 0 24 24" fill="#d91d1d"><path d="M12 2L14 7L19 4L16 9L22 10L17 14L20 19L14 16L12 22L10 16L4 19L7 14L2 10L8 9L5 4L10 7Z"/></svg>`,
  // 2. Titans / Blue Shield
  `<svg viewBox="0 0 24 24"><path d="M12 2L4 5V11C4 16.5 7.4 21.6 12 23C16.6 21.6 20 16.5 20 11V5L12 2Z" fill="#182848"/><path d="M7 8H17V11H13.5V18H10.5V11H7V8Z" fill="#ffffff"/></svg>`,
  // 3. Shadow Clan / Purple Hood
  `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#2d124d"/><path d="M12 4C8 4 6 8 6 12C6 16 9 20 12 20C15 20 18 16 18 12C18 8 16 4 12 4ZM9 12L10.5 13.5L9 15L7.5 13.5L9 12ZM15 12L16.5 13.5L15 15L13.5 13.5L15 12Z" fill="#a855f7"/></svg>`,
  // 4. Royal Kings / Crown
  `<svg viewBox="0 0 24 24" fill="#eab308"><path d="M3 18H21V20H3V18ZM4 6L8.5 10L12 4L15.5 10L20 6L18.5 16H5.5L4 6Z"/></svg>`,
  // 5. Vortex / Blue Swirl
  `<svg viewBox="0 0 24 24" fill="#0284c7"><path d="M12 2A10 10 0 1 0 22 12A10 10 0 0 0 12 2Zm0 17a7 7 0 1 1 7-7 7 7 0 0 1-7 7Zm-2-7a2 2 0 1 1 2 2 2 2 0 0 1-2-2Z"/></svg>`,
  // 6. Team Nexus / Orange Diamond N
  `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4" fill="#ea580c"/><path d="M7 7H10L14 13V7H17V17H14L10 11V17H7V7Z" fill="#ffffff"/></svg>`,
  // 7. Blaze / Orange Flame
  `<svg viewBox="0 0 24 24" fill="#f97316"><path d="M12 2C9 7 6 9 6 13C6 17 9 21 12 22C15 21 18 17 18 13C18 10 16 6 12 2ZM12 19C10.5 19 9 17.5 9 15C9 13 10.5 11 12 10C13.5 11 15 13 15 15C15 17.5 13.5 19 12 19Z"/></svg>`,
  // 8. Eclipse / Crescent
  `<svg viewBox="0 0 24 24" fill="#0f172a"><path d="M12 2A10 10 0 1 0 22 12A10 10 0 0 0 12 2Z"/></svg>`,
  // 9. Quantum / Atom
  `<svg viewBox="0 0 24 24" fill="#2563eb"><circle cx="12" cy="12" r="3"/><path d="M12 3C7 3 3 7 3 12S7 21 12 21 21 17 21 12 17 3 12 3ZM12 19C8.1 19 5 15.9 5 12S8.1 5 12 5 19 8.1 19 12 15.9 19 12 19Z"/></svg>`,
  // 10. Apex / Red Delta
  `<svg viewBox="0 0 24 24"><polygon points="12,2 22,20 2,20" fill="#dc2626"/><polygon points="12,8 18,18 6,18" fill="#ffffff"/></svg>`,
  // 11. Inferno / Dark Red Beast
  `<svg viewBox="0 0 24 24" fill="#991b1b"><path d="M12 2L15 8L21 9L16.5 13.5L18 20L12 16.5L6 20L7.5 13.5L3 9L9 8L12 2Z"/></svg>`,
  // 12. Celestials / Wings
  `<svg viewBox="0 0 24 24" fill="#06b6d4"><path d="M12 3C7 3 3 8 3 13C3 18 8 21 12 21C16 21 21 18 21 13C21 8 17 3 12 3ZM7 14L10 11L12 14L14 11L17 14L12 18L7 14Z"/></svg>`,
  // 13. Nova Esports / Star Trails
  `<svg viewBox="0 0 24 24" fill="#9333ea"><polygon points="12,1 15,9 23,10 17,16 19,23 12,19 5,23 7,16 1,10 9,9"/></svg>`,
  // 14. Revenant / Skull
  `<svg viewBox="0 0 24 24" fill="#1e293b"><circle cx="12" cy="10" r="7"/><rect x="8" y="15" width="8" height="6" rx="2"/><circle cx="9.5" cy="10" r="1.5" fill="#ffffff"/><circle cx="14.5" cy="10" r="1.5" fill="#ffffff"/></svg>`,
  // 15. Nemesis / Hexagon
  `<svg viewBox="0 0 24 24" fill="#450a0a"><polygon points="12,2 21,7 21,17 12,22 3,17 3,7"/></svg>`,
  // 16. Horizon / Sun & Mountain
  `<svg viewBox="0 0 24 24" fill="#d97706"><circle cx="12" cy="8" r="4"/><path d="M2 20L8 12L13 18L17 14L22 20H2Z"/></svg>`,
];

const DEFAULT_ROWS: GeneralTemplate3Row[] = [
  { rank: 1, team: "Phoenix Esports", wins: 0, killPoints: 0, placementPoints: 0, totalPoints: 0 },
  { rank: 2, team: "Titans", wins: 0, killPoints: 0, placementPoints: 0, totalPoints: 0 },
  { rank: 3, team: "Shadow Clan", wins: 0, killPoints: 0, placementPoints: 0, totalPoints: 0 },
  { rank: 4, team: "Royal Kings", wins: 0, killPoints: 0, placementPoints: 0, totalPoints: 0 },
  { rank: 5, team: "Vortex", wins: 0, killPoints: 0, placementPoints: 0, totalPoints: 0 },
  { rank: 6, team: "Team Nexus", wins: 0, killPoints: 0, placementPoints: 0, totalPoints: 0 },
  { rank: 7, team: "Blaze", wins: 0, killPoints: 0, placementPoints: 0, totalPoints: 0 },
  { rank: 8, team: "Eclipse", wins: 0, killPoints: 0, placementPoints: 0, totalPoints: 0 },
  { rank: 9, team: "Quantum", wins: 0, killPoints: 0, placementPoints: 0, totalPoints: 0 },
  { rank: 10, team: "Apex", wins: 0, killPoints: 0, placementPoints: 0, totalPoints: 0 },
  { rank: 11, team: "Inferno", wins: 0, killPoints: 0, placementPoints: 0, totalPoints: 0 },
  { rank: 12, team: "Celestials", wins: 0, killPoints: 0, placementPoints: 0, totalPoints: 0 },
  { rank: 13, team: "Nova Esports", wins: 0, killPoints: 0, placementPoints: 0, totalPoints: 0 },
  { rank: 14, team: "Revenant", wins: 0, killPoints: 0, placementPoints: 0, totalPoints: 0 },
  { rank: 15, team: "Nemesis", wins: 0, killPoints: 0, placementPoints: 0, totalPoints: 0 },
  { rank: 16, team: "Horizon", wins: 0, killPoints: 0, placementPoints: 0, totalPoints: 0 },
];

/**
 * GeneralTemplate3StandingsRenderer:
 * Standalone leaderboard renderer matching General Template 3.
 */
export const GeneralTemplate3StandingsRenderer = forwardRef<HTMLDivElement, GeneralTemplate3Props>(
  function GeneralTemplate3StandingsRenderer(
    {
      eventName = "EVENT NAME HERE",
      rows = [],
      hue = 0,
      brightness = 100,
      contrast = 100,
      saturation = 100,
      className = "",
      style,
    },
    ref,
  ) {
    // Pad rows up to 16 rows to maintain consistent layout
    const displayRows = useMemo(() => {
      const source = rows.length > 0 ? rows : DEFAULT_ROWS;
      const padded: GeneralTemplate3Row[] = [...source.slice(0, 16)];
      while (padded.length < 16) {
        const slot = padded.length + 1;
        padded.push({
          rank: slot,
          team: "",
          teamLogoSrc: null,
          wins: 0,
          killPoints: 0,
          placementPoints: 0,
          totalPoints: 0,
        });
      }
      return padded;
    }, [rows]);

    const filterStyle: CSSProperties = {
      filter: `hue-rotate(${hue}deg) brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
    };

    const fontStyle = {
      fontFamily: "'Plus Jakarta Sans', 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    };

    return (
      <div
        ref={ref}
        className={`general-template-3-canvas ${className}`}
        style={{
          width: `${GENERAL_TEMPLATE_3_WIDTH}px`,
          height: `${GENERAL_TEMPLATE_3_HEIGHT}px`,
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#015f5f",
          backgroundImage: `url('${GENERAL_TEMPLATE_3_BG_SRC}')`,
          backgroundSize: "100% 100%",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          boxSizing: "border-box",
          userSelect: "none",
          ...filterStyle,
          ...style,
        }}
      >
        {/* Arched / Rounded Event Title Section (No background) */}
        <div
          style={{
            position: "absolute",
            top: "365px",
            left: 0,
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          <svg
            viewBox="0 0 1000 90"
            style={{
              width: "1000px",
              height: "90px",
              overflow: "visible",
            }}
          >
            <defs>
              <path id="gt3TitleCurve" d="M 100,75 Q 500,20 900,75" fill="none" />
            </defs>
            <text
              textAnchor="middle"
              fill="#006d6a"
              stroke="#006d6a"
              strokeWidth="1.8"
              strokeLinejoin="round"
              strokeLinecap="round"
              style={{
                fontFamily: "'Arial Rounded MT Bold', 'Arial Rounded MT', 'Nunito', sans-serif",
                fontSize: "36px",
                fontWeight: 900,
                letterSpacing: "0.5px",
                textAnchor: "middle",
                paintOrder: "stroke fill",
              }}
            >
              <textPath href="#gt3TitleCurve" startOffset="50%" textAnchor="middle">
                <tspan style={{ fontSize: "24px" }} dy="-2">✦ </tspan>
                {eventName || "EVENT NAME HERE"}
                <tspan style={{ fontSize: "24px" }} dy="-2"> ✦</tspan>
              </textPath>
            </text>
          </svg>
        </div>

        {/* Standings Table Container */}
        <div
          style={{
            position: "absolute",
            top: "454px",
            left: "28px",
            width: "1024px",
            borderRadius: "14px",
            overflow: "hidden",
            zIndex: 10,
            backgroundColor: "#f3ebde",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              tableLayout: "fixed",
              ...fontStyle,
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#006d6a",
                  height: "60px",
                }}
              >
                <th
                  style={{
                    width: "70px",
                    color: "#ffffff",
                    textAlign: "center",
                    verticalAlign: "middle",
                    fontSize: "18px",
                    fontWeight: 800,
                    letterSpacing: "0.6px",
                    textTransform: "uppercase",
                    padding: "0 6px",
                    borderRight: "1.5px solid rgba(255, 255, 255, 0.35)",
                  }}
                >
                  #
                </th>
                <th
                  style={{
                    width: "384px",
                    color: "#ffffff",
                    textAlign: "left",
                    verticalAlign: "middle",
                    fontSize: "18px",
                    fontWeight: 800,
                    letterSpacing: "0.6px",
                    textTransform: "uppercase",
                    paddingLeft: "22px",
                    paddingRight: "6px",
                    borderRight: "1.5px solid rgba(255, 255, 255, 0.35)",
                  }}
                >
                  TEAM
                </th>
                <th
                  style={{
                    width: "130px",
                    color: "#ffffff",
                    textAlign: "center",
                    verticalAlign: "middle",
                    fontSize: "16px",
                    fontWeight: 800,
                    letterSpacing: "0.6px",
                    textTransform: "uppercase",
                    padding: "0 6px",
                    borderRight: "1.5px solid rgba(255, 255, 255, 0.35)",
                  }}
                >
                  WINS
                </th>
                <th
                  style={{
                    width: "130px",
                    color: "#ffffff",
                    textAlign: "center",
                    verticalAlign: "middle",
                    fontSize: "14.5px",
                    fontWeight: 800,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    padding: "0 6px",
                    lineHeight: 1.15,
                    borderRight: "1.5px solid rgba(255, 255, 255, 0.35)",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span>KILL</span>
                    <span>POINTS</span>
                  </div>
                </th>
                <th
                  style={{
                    width: "155px",
                    color: "#ffffff",
                    textAlign: "center",
                    verticalAlign: "middle",
                    fontSize: "14.5px",
                    fontWeight: 800,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    padding: "0 6px",
                    lineHeight: 1.15,
                    borderRight: "1.5px solid rgba(255, 255, 255, 0.35)",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span>PLACEMENT</span>
                    <span>POINTS</span>
                  </div>
                </th>
                <th
                  style={{
                    width: "155px",
                    color: "#ffffff",
                    textAlign: "center",
                    verticalAlign: "middle",
                    fontSize: "14.5px",
                    fontWeight: 800,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    padding: "0 6px",
                    lineHeight: 1.15,
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span>TOTAL</span>
                    <span>POINTS</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, idx) => {
                const isEven = idx % 2 !== 0;
                const isLast = idx === displayRows.length - 1;

                return (
                  <tr
                    key={idx}
                    style={{
                      height: "45.6px",
                      background: isEven ? "#e8e1cf" : "#f3ebde",
                      borderBottom: isLast ? "none" : "1px solid #dcd3c3",
                    }}
                  >
                    {/* Rank */}
                    <td
                      style={{
                        textAlign: "center",
                        verticalAlign: "middle",
                        fontSize: "20px",
                        fontWeight: 800,
                        color: "#18181a",
                        borderRight: "1px solid #dcd3c3",
                        padding: "0 8px",
                      }}
                    >
                      {row.rank}
                    </td>

                    {/* Team */}
                    <td
                      style={{
                        verticalAlign: "middle",
                        paddingLeft: "18px",
                        paddingRight: "8px",
                        borderRight: "1px solid #dcd3c3",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "14px",
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            width: "28px",
                            height: "28px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {row.teamLogoSrc ? (
                            <img
                              src={row.teamLogoSrc}
                              alt={row.team}
                              style={{
                                width: "28px",
                                height: "28px",
                                objectFit: "contain",
                                display: "block",
                              }}
                            />
                          ) : (
                            <span
                              style={{
                                display: "flex",
                                width: "28px",
                                height: "28px",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              dangerouslySetInnerHTML={{
                                __html: CREST_SVGS[idx % CREST_SVGS.length] || "",
                              }}
                            />
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: "18.5px",
                            fontWeight: 800,
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

                    {/* Wins */}
                    <td
                      style={{
                        textAlign: "center",
                        verticalAlign: "middle",
                        fontSize: "19.5px",
                        fontWeight: 800,
                        color: "#18181a",
                        borderRight: "1px solid #dcd3c3",
                        padding: "0 8px",
                      }}
                    >
                      {row.wins}
                    </td>

                    {/* Kill Points */}
                    <td
                      style={{
                        textAlign: "center",
                        verticalAlign: "middle",
                        fontSize: "19.5px",
                        fontWeight: 800,
                        color: "#18181a",
                        borderRight: "1px solid #dcd3c3",
                        padding: "0 8px",
                      }}
                    >
                      {row.killPoints}
                    </td>

                    {/* Placement Points */}
                    <td
                      style={{
                        textAlign: "center",
                        verticalAlign: "middle",
                        fontSize: "19.5px",
                        fontWeight: 800,
                        color: "#18181a",
                        borderRight: "1px solid #dcd3c3",
                        padding: "0 8px",
                      }}
                    >
                      {row.placementPoints}
                    </td>

                    {/* Total Points */}
                    <td
                      style={{
                        textAlign: "center",
                        verticalAlign: "middle",
                        fontSize: "19.5px",
                        fontWeight: 800,
                        color: "#18181a",
                        padding: "0 8px",
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

        {/* Bottom Branding: Made With + Esportific Logo */}
        <div
          style={{
            position: "absolute",
            bottom: "16px",
            left: 0,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "5px",
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontFamily: "'Arial Rounded MT Bold', 'Arial Rounded MT', 'Nunito', sans-serif",
              fontSize: "15px",
              fontWeight: 700,
              color: "#006d6a",
              lineHeight: 1,
              letterSpacing: "0.4px",
            }}
          >
            Made With
          </span>
          <img
            src={GENERAL_TEMPLATE_3_BRAND_LOGO}
            alt="Esportific"
            style={{
              height: "26px",
              width: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>
      </div>
    );
  },
);

/**
 * GeneralTemplate3Viewport:
 * Responsive auto-scaling container that fits the 1080x1350 template into any container.
 */
export function GeneralTemplate3Viewport({
  children,
  className = "",
  style,
  padding = 0,
}: {
  children: ReactNode;
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
        const scaleX = availableW / GENERAL_TEMPLATE_3_WIDTH;
        const scaleY = availableH / GENERAL_TEMPLATE_3_HEIGHT;
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
          width: `${GENERAL_TEMPLATE_3_WIDTH * scale}px`,
          height: `${GENERAL_TEMPLATE_3_HEIGHT * scale}px`,
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: `${GENERAL_TEMPLATE_3_WIDTH}px`,
            height: `${GENERAL_TEMPLATE_3_HEIGHT}px`,
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
