import {
  forwardRef,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

export type AutumnSeasonTemplateRow = {
  rank: number | string;
  team: string;
  teamLogoSrc?: string | null;
  wins: number | string;
  killPoints: number | string;
  placementPoints: number | string;
  totalPoints: number | string;
};

export type AutumnSeasonTemplateProps = {
  eventName?: string;
  gameName?: string;
  rows?: AutumnSeasonTemplateRow[];
  hue?: number; // -180 to 180 or 0 to 360, default 0
  brightness?: number; // 50 to 150, default 100
  contrast?: number; // 50 to 150, default 100
  saturation?: number; // 0 to 200, default 100
  className?: string;
  style?: CSSProperties;
};

export const AUTUMN_TEMPLATE_WIDTH = 1080;
export const AUTUMN_TEMPLATE_HEIGHT = 1350;
export const AUTUMN_TEMPLATE_BG_SRC =
  "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/Autumn%20Season%20Template/Background.png";
export const AUTUMN_TEMPLATE_BRAND_LOGO_SRC = "/Brand/new-logo.png";

/**
 * AutumnSeasonStandingsRenderer:
 * 1080x1350 standalone leaderboard renderer matching Autumn Season Design.html.
 */
export const AutumnSeasonStandingsRenderer = forwardRef<HTMLDivElement, AutumnSeasonTemplateProps>(
  function AutumnSeasonStandingsRenderer(
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
    // If any single team has a logo, all teams without a logo get an initial-letter badge
    const anyTeamHasLogo = useMemo(() => {
      return rows.some((row) => Boolean(row.team && row.teamLogoSrc && String(row.teamLogoSrc).trim()));
    }, [rows]);

    // Pad rows up to 16 rows to preserve table layout and bottom margins
    const displayRows = useMemo(() => {
      const padded: AutumnSeasonTemplateRow[] = [...rows.slice(0, 16)];
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
        className={`autumn-canvas ${className}`}
        style={{
          width: `${AUTUMN_TEMPLATE_WIDTH}px`,
          height: `${AUTUMN_TEMPLATE_HEIGHT}px`,
          position: "relative",
          backgroundImage: `url("${AUTUMN_TEMPLATE_BG_SRC}")`,
          backgroundSize: "cover",
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
          @font-face {
            font-family: 'Bebas Neue Pro';
            src: url('/Templates/Fonts/Bebas%20Neue%20Pro/Bebas-Neue-Pro-Bold-BF66cf3d7770dfe.ttf') format('truetype');
            font-weight: 700;
            font-style: normal;
          }
          @font-face {
            font-family: 'Bebas Neue Pro';
            src: url('/Templates/Fonts/Bebas%20Neue%20Pro/Bebas-Neue-Pro-Bold-BF66cf3d7770dfe.ttf') format('truetype');
            font-weight: 900;
            font-style: normal;
          }
          @font-face {
            font-family: 'Bebas Neue Pro';
            src: url('/Templates/Fonts/Bebas%20Neue%20Pro/Bebas-Neue-Pro-Regular-BF66cf3d7814160.ttf') format('truetype');
            font-weight: 400;
            font-style: normal;
          }
        `}</style>
        <div
          style={{
            padding: "85px 108px 30px 108px",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            position: "relative",
            zIndex: 2,
          }}
        >
          {/* Top Section */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", marginLeft: "55px" }}>
              {/* Event Name */}
              <div
                style={{
                  fontFamily: "'Bebas Neue Pro', 'Bebas Neue', sans-serif",
                  fontSize: "38px",
                  fontWeight: 700,
                  letterSpacing: "1.5px",
                  color: "#120e0c",
                  textTransform: "uppercase",
                  lineHeight: 1,
                  marginBottom: "2px",
                }}
              >
                {eventName || "Grand Arena Championship"}
              </div>

              {/* Main Title - Overall Standings static */}
              <div
                style={{
                  fontFamily: "'Bebas Neue Pro', 'Bebas Neue', sans-serif",
                  fontSize: "120px",
                  fontWeight: 900,
                  lineHeight: 0.85,
                  letterSpacing: "1px",
                  color: "#14100e",
                  WebkitTextStroke: "1.5px #14100e",
                  textTransform: "uppercase",
                  display: "flex",
                  flexDirection: "column",
                  marginTop: "2px",
                  marginBottom: "12px",
                }}
              >
                <span>Overall</span>
                <span>Standings</span>
              </div>

              <div
                style={{
                  width: "100%",
                  height: "1px",
                  background: "rgba(80, 60, 44, 0.8)",
                  marginTop: "2px",
                  marginBottom: "12px",
                }}
              />

              {/* Game Metadata */}
              <div
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: "11.5px",
                  letterSpacing: "1.8px",
                  textTransform: "uppercase",
                  color: "#4b3e34",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span>
                  Game:{" "}
                  <span style={{ fontWeight: 800, color: "#181310" }}>
                    {gameName || "Free Fire"}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Main Leaderboard Table */}
          <div
            style={{
              width: "100%",
              marginTop: "28px",
              borderRadius: "6px",
              overflow: "hidden",
              border: "1px solid rgba(140, 108, 81, 0.5)",
              boxShadow: "0 6px 20px rgba(60, 40, 20, 0.08)",
            }}
          >
            {/* Table Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "76px 1fr 85px 125px 155px 120px",
                width: "100%",
                height: "40px",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: "12.5px",
                fontWeight: 800,
                letterSpacing: "1.4px",
                textTransform: "uppercase",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  background: "#efd7b7",
                  color: "#2e2219",
                  paddingLeft: "20px",
                  borderRight: "1px solid rgba(185, 155, 122, 0.3)",
                }}
              >
                Rank
              </div>
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  background: "#efd7b7",
                  color: "#2e2219",
                  paddingLeft: "14px",
                  borderRight: "1px solid rgba(185, 155, 122, 0.3)",
                }}
              >
                Team
              </div>
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#efd7b7",
                  color: "#2e2219",
                  borderRight: "1px solid rgba(185, 155, 122, 0.3)",
                }}
              >
                Wins
              </div>
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#efd7b7",
                  color: "#2e2219",
                  borderRight: "1px solid rgba(185, 155, 122, 0.3)",
                }}
              >
                Kill Points
              </div>
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#efd7b7",
                  color: "#2e2219",
                  borderRight: "1px solid rgba(185, 155, 122, 0.3)",
                }}
              >
                Placement Points
              </div>
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#b84e22",
                  color: "#ffffff",
                  borderLeft: "1px solid rgba(0, 0, 0, 0.15)",
                }}
              >
                Total Points
              </div>
            </div>

            {/* Table Rows */}
            {displayRows.map((row, idx) => {
              const rankNum = typeof row.rank === "number" ? row.rank : idx + 1;
              const formattedRank = `• ${String(rankNum).padStart(2, "0")}`;
              const isLead = idx === 0;

              // Row background logic matching Design.html:
              // Odd row: #f8ead7, Even row: #f3e2ca, Row 2 (idx 1): #f8ead7
              let rowBg = idx % 2 === 0 ? "#f8ead7" : "#f3e2ca";
              if (idx === 1) rowBg = "#f8ead7";

              const teamName = row.team ? String(row.team).trim() : "";
              const initialLetter = teamName ? teamName.charAt(0).toUpperCase() : "";

              return (
                <div
                  key={idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "76px 1fr 85px 125px 155px 120px",
                    width: "100%",
                    height: "45.5px",
                    position: "relative",
                    borderTop: "1px solid rgba(140, 108, 81, 0.5)",
                  }}
                >
                  {/* Lead Row Left Accent Bar */}
                  {isLead && (
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: "4px",
                        backgroundColor: "#c24b21",
                        zIndex: 5,
                      }}
                    />
                  )}

                  {/* Rank Cell */}
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      background: rowBg,
                      color: isLead ? "#c24b21" : "#1a1614",
                      paddingLeft: "19px",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: "15.5px",
                      fontWeight: 800,
                      letterSpacing: "0.5px",
                    }}
                  >
                    {formattedRank}
                  </div>

                  {/* Team Cell */}
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      background: rowBg,
                      paddingLeft: anyTeamHasLogo ? "12px" : "18px",
                      gap: anyTeamHasLogo ? "13px" : "0",
                      overflow: "hidden",
                    }}
                  >
                    {anyTeamHasLogo && (
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
                            alt=""
                            style={{
                              width: "28px",
                              height: "28px",
                              objectFit: "contain",
                              borderRadius: "4px",
                            }}
                          />
                        ) : initialLetter ? (
                          <div
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "5px",
                              background: "#16120e",
                              color: "#f4ebd9",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontFamily: "'Plus Jakarta Sans', sans-serif",
                              fontWeight: 800,
                              fontSize: "13.5px",
                              lineHeight: 1,
                              border: "1px solid rgba(244, 235, 217, 0.25)",
                            }}
                          >
                            {initialLetter}
                          </div>
                        ) : null}
                      </div>
                    )}
                    <span
                      style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontWeight: 800,
                        fontSize: "15px",
                        letterSpacing: "0.6px",
                        color: "#171310",
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {teamName || "-"}
                    </span>
                  </div>

                  {/* Wins Cell */}
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: rowBg,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 700,
                      fontSize: "16.5px",
                      color: "#1a1512",
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
                      background: rowBg,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 700,
                      fontSize: "16.5px",
                      color: "#1a1512",
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
                      background: rowBg,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 700,
                      fontSize: "16.5px",
                      color: "#1a1512",
                    }}
                  >
                    {row.placementPoints !== "" && row.placementPoints !== undefined
                      ? row.placementPoints
                      : "-"}
                  </div>

                  {/* Total Points Cell */}
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: "25px",
                      fontWeight: 800,
                      color: "#c0471f",
                      lineHeight: 1,
                      background: "#f5e5ce",
                      borderLeft: "1px solid rgba(180, 148, 118, 0.35)",
                    }}
                  >
                    {row.totalPoints !== "" && row.totalPoints !== undefined ? row.totalPoints : "-"}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Made With Section */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              marginTop: "24px",
              gap: "8px",
            }}
          >
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.5px",
                color: "#3b2e24",
                textTransform: "none",
              }}
            >
              Made with
            </span>
            <img
              src={AUTUMN_TEMPLATE_BRAND_LOGO_SRC}
              alt="Esportific Logo"
              style={{
                height: "30px",
                maxHeight: "30px",
                width: "auto",
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>
        </div>
      </div>
    );
  },
);

/**
 * AutumnStandingsViewport:
/**
 * Responsive auto-scaling container that fits the 1080x1350 template into any container.
 */
export function AutumnStandingsViewport({
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
        const scaleX = availableW / AUTUMN_TEMPLATE_WIDTH;
        const scaleY = availableH / AUTUMN_TEMPLATE_HEIGHT;
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
          width: `${AUTUMN_TEMPLATE_WIDTH * scale}px`,
          height: `${AUTUMN_TEMPLATE_HEIGHT * scale}px`,
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: `${AUTUMN_TEMPLATE_WIDTH}px`,
            height: `${AUTUMN_TEMPLATE_HEIGHT}px`,
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

