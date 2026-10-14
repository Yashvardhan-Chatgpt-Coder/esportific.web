import {
  forwardRef,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

export type GeneralTemplate2Row = {
  rank: number | string;
  team: string;
  teamLogoSrc?: string | null;
  wins: number | string;
  killPoints: number | string;
  placementPoints: number | string;
  totalPoints: number | string;
};

export type GeneralTemplate2Props = {
  eventName?: string;
  eventSubtitle?: string;
  gameName?: string;
  rows?: GeneralTemplate2Row[];
  hue?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  className?: string;
  style?: CSSProperties;
};

export const GENERAL_TEMPLATE_2_WIDTH = 1080;
export const GENERAL_TEMPLATE_2_HEIGHT = 1350;
export const GENERAL_TEMPLATE_2_BG_SRC =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/General%20Template%202/Background.png";
export const GENERAL_TEMPLATE_2_FF_LOGO =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/General%20Template%202/free-fire-logo.png";
export const GENERAL_TEMPLATE_2_BGMI_LOGO =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/General%20Template%202/bgmi-logo.png";
export const GENERAL_TEMPLATE_2_BRAND_LOGO =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/General%20Template%202/esportific-logo.png";

// Preset team crest SVG icons
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
  // Nova Esports / Star Trails
  `<svg viewBox="0 0 24 24" fill="#9333ea"><polygon points="12,1 15,9 23,10 17,16 19,23 12,19 5,23 7,16 1,10 9,9"/></svg>`,
  // Revenant / Skull
  `<svg viewBox="0 0 24 24" fill="#1e293b"><circle cx="12" cy="10" r="7"/><rect x="8" y="15" width="8" height="6" rx="2"/><circle cx="9.5" cy="10" r="1.5" fill="#ffffff"/><circle cx="14.5" cy="10" r="1.5" fill="#ffffff"/></svg>`,
  // Nemesis / Hexagon
  `<svg viewBox="0 0 24 24" fill="#450a0a"><polygon points="12,2 21,7 21,17 12,22 3,17 3,7"/></svg>`,
  // Horizon / Sun & Mountain
  `<svg viewBox="0 0 24 24" fill="#d97706"><circle cx="12" cy="8" r="4"/><path d="M2 20L8 12L13 18L17 14L22 20H2Z"/></svg>`,
];

/**
 * GeneralTemplate2StandingsRenderer:
 * Standalone leaderboard renderer matching General Template 2 design.html.
 */
export const GeneralTemplate2StandingsRenderer = forwardRef<HTMLDivElement, GeneralTemplate2Props>(
  function GeneralTemplate2StandingsRenderer(
    {
      eventName = "Reformers Connect",
      eventSubtitle = "Youth Festival with Prince Obadiaba JNR",
      gameName = "Free Fire",
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
    const isBgmi = useMemo(() => {
      const normalized = (gameName || "").toLowerCase();
      return (
        normalized.includes("bgmi") ||
        normalized.includes("battlegrounds") ||
        normalized.includes("pubg")
      );
    }, [gameName]);

    // Pad rows up to 16 rows to maintain consistent layout
    const displayRows = useMemo(() => {
      const padded: GeneralTemplate2Row[] = [...rows.slice(0, 16)];
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
      fontFamily: "'Arial Rounded MT Bold', 'Arial Rounded MT', 'Nunito', sans-serif",
    };

    return (
      <div
        ref={ref}
        className={`general-template-2-canvas ${className}`}
        style={{
          width: `${GENERAL_TEMPLATE_2_WIDTH}px`,
          height: `${GENERAL_TEMPLATE_2_HEIGHT}px`,
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#f7a01d",
          backgroundImage: `url('${GENERAL_TEMPLATE_2_BG_SRC}')`,
          backgroundSize: "100% 100%",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          boxSizing: "border-box",
          userSelect: "none",
          ...fontStyle,
          ...filterStyle,
          ...style,
        }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap');
          @font-face {
            font-family: 'Arial Rounded MT Bold';
            src: url('/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/General%20Template%202/ArialRoundedMTBold.ttf') format('truetype');
            font-weight: 700;
            font-style: normal;
          }
        `}</style>

        {/* Top Game Logo */}
        <div
          style={{
            position: "absolute",
            top: "52px",
            left: 0,
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10,
          }}
        >
          <img
            src={isBgmi ? GENERAL_TEMPLATE_2_BGMI_LOGO : GENERAL_TEMPLATE_2_FF_LOGO}
            alt={isBgmi ? "BGMI" : "Free Fire"}
            style={{
              height: isBgmi ? "44px" : "48px",
              width: "auto",
              objectFit: "contain",
            }}
          />
        </div>

        {/* Arched / Rounded Event Title */}
        <div
          style={{
            position: "absolute",
            top: "275px",
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
            viewBox="0 0 1000 100"
            style={{
              width: "1000px",
              height: "100px",
              overflow: "visible",
            }}
          >
            <defs>
              <path id="gt2TitleCurve" d="M 120,86 Q 500,28 880,86" fill="none" />
            </defs>
            <text
              fill="#18181a"
              stroke="#18181a"
              strokeWidth="2.2"
              strokeLinejoin="round"
              strokeLinecap="round"
              style={{
                fontFamily: "'Arial Rounded MT Bold', 'Arial Rounded MT', 'Nunito', sans-serif",
                fontSize: "46px",
                fontWeight: 900,
                letterSpacing: "-0.3px",
                paintOrder: "stroke fill",
              }}
            >
              <textPath href="#gt2TitleCurve" startOffset="50%" textAnchor="middle">
                <tspan style={{ fontSize: "28px" }} dy="-2">✦ </tspan>
                {eventName || "Reformers Connect"}
                <tspan style={{ fontSize: "28px" }} dy="-2"> ✦</tspan>
              </textPath>
            </text>
          </svg>
        </div>

        {/* Standings Table Container */}
        <div
          style={{
            position: "absolute",
            top: "382px",
            left: "38px",
            width: "1004px",
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
            zIndex: 10,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              tableLayout: "fixed",
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "#c80f0a",
                  height: "58px",
                }}
              >
                <th
                  style={{
                    width: "75px",
                    color: "#ffffff",
                    fontSize: "22px",
                    fontWeight: 700,
                    textAlign: "center",
                    padding: 0,
                    borderRight: "1px solid rgba(255, 255, 255, 0.22)",
                    verticalAlign: "middle",
                  }}
                >
                  #
                </th>
                <th
                  style={{
                    width: "315px",
                    color: "#ffffff",
                    fontSize: "15px",
                    fontWeight: 700,
                    textAlign: "left",
                    paddingLeft: "20px",
                    letterSpacing: "0.5px",
                    borderRight: "1px solid rgba(255, 255, 255, 0.22)",
                    verticalAlign: "middle",
                  }}
                >
                  TEAM
                </th>
                <th
                  style={{
                    width: "120px",
                    color: "#ffffff",
                    fontSize: "15px",
                    fontWeight: 700,
                    textAlign: "center",
                    letterSpacing: "0.5px",
                    borderRight: "1px solid rgba(255, 255, 255, 0.22)",
                    verticalAlign: "middle",
                  }}
                >
                  WINS
                </th>
                <th
                  style={{
                    width: "150px",
                    color: "#ffffff",
                    borderRight: "1px solid rgba(255, 255, 255, 0.22)",
                    verticalAlign: "middle",
                    padding: "0 6px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      lineHeight: 1.15,
                      fontSize: "13.5px",
                      fontWeight: 700,
                      gap: "1px",
                    }}
                  >
                    <span>KILL</span>
                    <span>POINTS</span>
                  </div>
                </th>
                <th
                  style={{
                    width: "184px",
                    color: "#ffffff",
                    borderRight: "1px solid rgba(255, 255, 255, 0.22)",
                    verticalAlign: "middle",
                    padding: "0 6px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      lineHeight: 1.15,
                      fontSize: "13.5px",
                      fontWeight: 700,
                      gap: "1px",
                    }}
                  >
                    <span>PLACEMENT</span>
                    <span>POINTS</span>
                  </div>
                </th>
                <th
                  style={{
                    width: "160px",
                    color: "#ffffff",
                    verticalAlign: "middle",
                    padding: "0 6px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      lineHeight: 1.15,
                      fontSize: "13.5px",
                      fontWeight: 700,
                      gap: "1px",
                    }}
                  >
                    <span>TOTAL</span>
                    <span>POINTS</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, idx) => {
                const isEven = idx % 2 === 1;
                const rowBg = isEven ? "#f7e5bf" : "#fdf2dc";

                return (
                  <tr
                    key={`gt2-row-${idx}`}
                    style={{
                      height: "45.5px",
                      backgroundColor: rowBg,
                    }}
                  >
                    {/* Rank */}
                    <td
                      style={{
                        textAlign: "center",
                        fontSize: "18px",
                        fontWeight: 700,
                        color: "#18181a",
                        borderRight: "1px solid #ebd0a0",
                        borderTop: idx === 0 ? "none" : "1px solid #ebcf9f",
                        padding: 0,
                        verticalAlign: "middle",
                      }}
                    >
                      {row.rank}
                    </td>

                    {/* Team */}
                    <td
                      style={{
                        paddingLeft: "18px",
                        borderRight: "1px solid #ebd0a0",
                        borderTop: idx === 0 ? "none" : "1px solid #ebcf9f",
                        verticalAlign: "middle",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "14px",
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
                              style={{ width: "100%", height: "100%", objectFit: "contain" }}
                            />
                          ) : (
                            <div
                              style={{ width: "100%", height: "100%" }}
                              dangerouslySetInnerHTML={{
                                __html: CREST_SVGS[idx % CREST_SVGS.length],
                              }}
                            />
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: "16px",
                            fontWeight: 700,
                            color: "#18181a",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            letterSpacing: "-0.2px",
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
                        fontSize: "17px",
                        fontWeight: 700,
                        color: "#18181a",
                        borderRight: "1px solid #ebd0a0",
                        borderTop: idx === 0 ? "none" : "1px solid #ebcf9f",
                        verticalAlign: "middle",
                      }}
                    >
                      {row.wins}
                    </td>

                    {/* Kill Points */}
                    <td
                      style={{
                        textAlign: "center",
                        fontSize: "17px",
                        fontWeight: 700,
                        color: "#18181a",
                        borderRight: "1px solid #ebd0a0",
                        borderTop: idx === 0 ? "none" : "1px solid #ebcf9f",
                        verticalAlign: "middle",
                      }}
                    >
                      {row.killPoints}
                    </td>

                    {/* Placement Points */}
                    <td
                      style={{
                        textAlign: "center",
                        fontSize: "17px",
                        fontWeight: 700,
                        color: "#18181a",
                        borderRight: "1px solid #ebd0a0",
                        borderTop: idx === 0 ? "none" : "1px solid #ebcf9f",
                        verticalAlign: "middle",
                      }}
                    >
                      {row.placementPoints}
                    </td>

                    {/* Total Points */}
                    <td
                      style={{
                        textAlign: "center",
                        fontSize: "17px",
                        fontWeight: 700,
                        color: "#18181a",
                        borderTop: idx === 0 ? "none" : "1px solid #ebcf9f",
                        verticalAlign: "middle",
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

        {/* Bottom Left Branding: Made With + Esportific Logo */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            left: "48px",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "7px",
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontFamily: "'Arial Rounded MT', 'Nunito', sans-serif",
              fontSize: "17.5px",
              fontWeight: 500,
              color: "#ffffff",
              lineHeight: 1,
              letterSpacing: "0.3px",
            }}
          >
            Made With
          </span>
          <img
            src={GENERAL_TEMPLATE_2_BRAND_LOGO}
            alt="Esportific"
            style={{
              height: "35px",
              width: "auto",
              objectFit: "contain",
              filter: "brightness(0) invert(1)",
              display: "block",
            }}
          />
        </div>

        {/* Bottom Right Tagline */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            right: "48px",
            display: "flex",
            alignItems: "center",
            zIndex: 10,
            pointerEvents: "none",
            fontFamily: "'Arial Rounded MT Bold', 'Arial Rounded MT', 'Nunito', sans-serif",
            fontSize: "16.5px",
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "0.6px",
            textTransform: "uppercase",
          }}
        >
          {isBgmi ? "Winner Winner Chicken Dinner" : "Compete Survive Booyah"}
        </div>
      </div>
    );
  },
);

/**
 * GeneralTemplate2Viewport:
 * Responsive auto-scaling container that fits the 1080x1350 template into any container.
 */
export function GeneralTemplate2Viewport({
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
        const scaleX = availableW / GENERAL_TEMPLATE_2_WIDTH;
        const scaleY = availableH / GENERAL_TEMPLATE_2_HEIGHT;
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
          width: `${GENERAL_TEMPLATE_2_WIDTH * scale}px`,
          height: `${GENERAL_TEMPLATE_2_HEIGHT * scale}px`,
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: `${GENERAL_TEMPLATE_2_WIDTH}px`,
            height: `${GENERAL_TEMPLATE_2_HEIGHT}px`,
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
