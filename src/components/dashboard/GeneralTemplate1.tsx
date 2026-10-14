import {
  forwardRef,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

export type GeneralTemplate1Row = {
  rank: number | string;
  team: string;
  teamLogoSrc?: string | null;
  wins: number | string;
  killPoints: number | string;
  placementPoints: number | string;
  totalPoints: number | string;
};

export type GeneralTemplate1Props = {
  eventName?: string;
  gameName?: string;
  rows?: GeneralTemplate1Row[];
  hue?: number; // -180 to 180 or 0 to 360, default 0
  brightness?: number; // 50 to 150, default 100
  contrast?: number; // 50 to 150, default 100
  saturation?: number; // 0 to 200, default 100
  className?: string;
  style?: CSSProperties;
};

export const GENERAL_TEMPLATE_1_WIDTH = 1080;
export const GENERAL_TEMPLATE_1_HEIGHT = 1350;
export const GENERAL_TEMPLATE_1_BG_SRC =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/General%20Template%201/Background.png";
export const GENERAL_TEMPLATE_1_FF_LOGO =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/General%20Template%201/free-fire-logo.png";
export const GENERAL_TEMPLATE_1_BGMI_LOGO =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/General%20Template%201/bgmi-logo.png";
export const GENERAL_TEMPLATE_1_BRAND_LOGO =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/General%20Template%201/esportific-logo.png";

/**
 * GeneralTemplate1StandingsRenderer:
 * 1080x1350 standalone leaderboard renderer matching General Template 1 design.html.
 */
export const GeneralTemplate1StandingsRenderer = forwardRef<HTMLDivElement, GeneralTemplate1Props>(
  function GeneralTemplate1StandingsRenderer(
    {
      eventName = "Grand Arena Championship",
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

    // Pad rows up to 16 rows to preserve table layout and bottom margins
    const displayRows = useMemo(() => {
      const padded: GeneralTemplate1Row[] = [...rows.slice(0, 16)];
      while (padded.length < 16) {
        const slot = padded.length + 1;
        padded.push({
          rank: slot,
          team: "",
          teamLogoSrc: null,
          wins: "",
          killPoints: "",
          placementPoints: "",
          totalPoints: "",
        });
      }
      return padded;
    }, [rows]);

    const filterStyle: CSSProperties = {
      filter: `hue-rotate(${hue}deg) brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
    };

    return (
      <div
        ref={ref}
        className={`general-template-1-canvas ${className}`}
        style={{
          width: `${GENERAL_TEMPLATE_1_WIDTH}px`,
          height: `${GENERAL_TEMPLATE_1_HEIGHT}px`,
          position: "relative",
          backgroundImage: `url("${GENERAL_TEMPLATE_1_BG_SRC}")`,
          backgroundSize: "100% 100%",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          userSelect: "none",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          WebkitFontSmoothing: "antialiased",
          flexShrink: 0,
          ...filterStyle,
          ...style,
        }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=League+Gothic&family=Plus+Jakarta+Sans:wght@700;800;900&family=Bebas+Neue&display=swap');
        `}</style>

        {/* TOP BAR: Left-Aligned Game Logo */}
        <header
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            padding: "42px 50px 0 50px",
            height: "84px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
            <img
              src={isBgmi ? GENERAL_TEMPLATE_1_BGMI_LOGO : GENERAL_TEMPLATE_1_FF_LOGO}
              alt={isBgmi ? "BGMI" : "Free Fire"}
              style={{
                height: isBgmi ? "42px" : "33px",
                width: "auto",
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>
        </header>

        {/* TITLE BLOCK */}
        <section
          style={{
            position: "relative",
            zIndex: 2,
            padding: "30px 50px 0 50px",
            boxSizing: "border-box",
          }}
        >
          <h1
            style={{
              fontFamily: "'League Gothic', sans-serif",
              fontSize: "128px",
              fontWeight: 400,
              lineHeight: 0.88,
              letterSpacing: "-2.8px",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "baseline",
              gap: "12px",
              margin: 0,
            }}
          >
            <span style={{ color: "#111111" }}>Overall</span>
            <span style={{ color: "#ff5801" }}>Standings</span>
          </h1>

          {/* Slanted Rectangle with 3 Slanted Strips */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "9px",
              marginTop: "14px",
            }}
          >
            <div
              style={{
                background: "#ff5801",
                transform: "skewX(-24deg)",
                padding: "7px 24px 6px 24px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  transform: "skewX(24deg)",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: "17px",
                  fontWeight: 800,
                  letterSpacing: "0.8px",
                  color: "#ffffff",
                  textTransform: "uppercase",
                  lineHeight: 1,
                  display: "inline-block",
                }}
              >
                {eventName || "GRAND ARENA CHAMPIONSHIP"}
              </span>
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <span
                style={{
                  display: "block",
                  width: "5.5px",
                  height: "31px",
                  background: "#ff5801",
                  transform: "skewX(-24deg)",
                }}
              />
              <span
                style={{
                  display: "block",
                  width: "5.5px",
                  height: "31px",
                  background: "#ff5801",
                  transform: "skewX(-24deg)",
                }}
              />
              <span
                style={{
                  display: "block",
                  width: "5.5px",
                  height: "31px",
                  background: "#ff5801",
                  transform: "skewX(-24deg)",
                }}
              />
            </div>
          </div>
        </section>

        {/* TABLE CONTAINER */}
        <section
          style={{
            position: "relative",
            zIndex: 2,
            margin: "50px 50px 0 50px",
            borderRadius: "14px 14px 6px 6px",
            overflow: "hidden",
            boxShadow: "none",
            background: "#ffffff",
          }}
        >
          {/* Table Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "64px 320px 115px 140px 185px 156px",
              height: "50px",
              background: "#ff5801",
              color: "#ffffff",
              fontSize: "13.5px",
              fontWeight: 700,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              borderTopLeftRadius: "14px",
              borderTopRightRadius: "14px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "24px",
                fontWeight: 400,
                borderRight: "1px solid rgba(255, 255, 255, 0.22)",
              }}
            >
              #
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                paddingLeft: "22px",
                gap: "8px",
                borderRight: "1px solid rgba(255, 255, 255, 0.22)",
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: "16px", height: "16px", fill: "currentColor" }}>
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
              <span>Team</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                borderRight: "1px solid rgba(255, 255, 255, 0.22)",
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: "16px", height: "16px", fill: "currentColor" }}>
                <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1c1.8-.41 3.23-1.8 3.61-3.6 2.47-.31 4.39-2.39 4.39-4.94V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
              </svg>
              <span>WINS</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                borderRight: "1px solid rgba(255, 255, 255, 0.22)",
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: "16px", height: "16px", fill: "currentColor" }}>
                <path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
              <span>Kill Pts</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                borderRight: "1px solid rgba(255, 255, 255, 0.22)",
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: "16px", height: "16px", fill: "currentColor" }}>
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
              </svg>
              <span>Place Pts</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                background: "#111113",
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: "16px", height: "16px", fill: "currentColor" }}>
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
              <span>Total Pts</span>
            </div>
          </div>

          {/* Table Body (16 Rows) */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {displayRows.map((row, idx) => {
              const isEven = idx % 2 === 1;
              const isLast = idx === displayRows.length - 1;
              const hasRank = row.rank !== "" && row.rank !== undefined;
              const hasTeam = Boolean(row.team && row.team.trim());

              return (
                <div
                  key={idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "64px 320px 115px 140px 185px 156px",
                    height: "48px",
                    alignItems: "center",
                    background: isEven ? "#f0f2f5" : "#ffffff",
                    borderBottom: isLast ? "none" : "1px solid #d5d8de",
                    boxSizing: "border-box",
                  }}
                >
                  {/* Rank Cell (Orange Column) */}
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#ff5801",
                      color: "#ffffff",
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: "24px",
                      fontWeight: 400,
                      letterSpacing: "0.5px",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.35)",
                      lineHeight: 1,
                    }}
                  >
                    {hasRank ? row.rank : idx + 1}
                  </div>

                  {/* Team Cell */}
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      paddingLeft: "16px",
                      gap: "14px",
                      overflow: "hidden",
                    }}
                  >
                    {hasTeam && row.teamLogoSrc ? (
                      <img
                        src={row.teamLogoSrc}
                        alt=""
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "4px",
                          objectFit: "contain",
                          flexShrink: 0,
                        }}
                      />
                    ) : hasTeam ? (
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "4px",
                          background: "#e5e7eb",
                          color: "#374151",
                          fontSize: "12px",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          textTransform: "uppercase",
                          flexShrink: 0,
                        }}
                      >
                        {row.team.charAt(0)}
                      </div>
                    ) : null}

                    <span
                      style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontSize: "14.5px",
                        fontWeight: 700,
                        color: "#111111",
                        textTransform: "uppercase",
                        letterSpacing: "0.3px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {row.team || ""}
                    </span>
                  </div>

                  {/* Wins Cell */}
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "#111111",
                      borderLeft: "1px solid #d5d8de",
                      lineHeight: 1,
                    }}
                  >
                    {row.wins !== "" && row.wins !== undefined ? row.wins : "-"}
                  </div>

                  {/* Kill Points Cell */}
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "#111111",
                      borderLeft: "1px solid #d5d8de",
                      lineHeight: 1,
                    }}
                  >
                    {row.killPoints !== "" && row.killPoints !== undefined ? row.killPoints : "-"}
                  </div>

                  {/* Placement Points Cell */}
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "#111111",
                      borderLeft: "1px solid #d5d8de",
                      lineHeight: 1,
                    }}
                  >
                    {row.placementPoints !== "" && row.placementPoints !== undefined
                      ? row.placementPoints
                      : "-"}
                  </div>

                  {/* Total Points Cell (Black Column with Orange Numbers) */}
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#111113",
                      color: "#ff5801",
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: "32px",
                      fontWeight: 400,
                      letterSpacing: "0.5px",
                      borderBottom: isLast ? "none" : "1px solid #1e1f23",
                      lineHeight: 1,
                    }}
                  >
                    {row.totalPoints !== "" && row.totalPoints !== undefined ? row.totalPoints : "-"}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* FOOTER BAR */}
        <footer
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "72px",
            background: "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingLeft: "54px",
            paddingRight: "50px",
            zIndex: 3,
            boxSizing: "border-box",
          }}
        >
          {/* Bottom Left: Made with + Esportific Logo */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "center",
              gap: "5px",
            }}
          >
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: "15px",
                fontWeight: 700,
                letterSpacing: "0.5px",
                color: "#ffffff",
                textTransform: "none",
                lineHeight: 1,
              }}
            >
              Made with
            </span>
            <img
              src={GENERAL_TEMPLATE_1_BRAND_LOGO}
              alt="Esportific"
              style={{
                height: "29px",
                width: "auto",
                objectFit: "contain",
                filter: "brightness(0) invert(1)",
                display: "block",
              }}
            />
          </div>

          {/* Bottom Right: Dynamic Tagline */}
          <div
            style={{
              fontSize: "15px",
              fontWeight: 800,
              letterSpacing: "0.5px",
              color: "#111113",
              textTransform: "uppercase",
            }}
          >
            {isBgmi ? (
              <>
                <span>Winner Winner </span>
                <span style={{ color: "#ff5801" }}>Chicken Dinner!</span>
              </>
            ) : (
              <>
                <span>Compete. Survive. </span>
                <span style={{ color: "#ff5801" }}>Booyah!</span>
              </>
            )}
          </div>
        </footer>
      </div>
    );
  },
);

/**
 * GeneralTemplate1Viewport:
 * Responsive auto-scaling container that fits the 1080x1350 template into any container.
 */
export function GeneralTemplate1Viewport({
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
        const scaleX = availableW / GENERAL_TEMPLATE_1_WIDTH;
        const scaleY = availableH / GENERAL_TEMPLATE_1_HEIGHT;
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
          width: `${GENERAL_TEMPLATE_1_WIDTH * scale}px`,
          height: `${GENERAL_TEMPLATE_1_HEIGHT * scale}px`,
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: `${GENERAL_TEMPLATE_1_WIDTH}px`,
            height: `${GENERAL_TEMPLATE_1_HEIGHT}px`,
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
