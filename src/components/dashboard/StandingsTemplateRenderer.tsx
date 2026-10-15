import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  DEFAULT_VISIBLE_SOCIALS,
  STANDINGS_TEMPLATE_HEIGHT,
  STANDINGS_TEMPLATE_ROOT,
  STANDINGS_TEMPLATE_WIDTH,
  getStandingsTemplateGameKind,
  getStandingsTemplateMapOptions,
  type CssTemplateDocument,
  type StandingsExportView,
  type StandingsTemplateRow,
  type StandingsTemplateSocialPlatform,
  type StandingsTemplateVisibleSocials,
} from "@/lib/css-standings-template-engine";
import {
  PREMIUM_2_CSS_TEMPLATE,
  PREMIUM_1_CSS_TEMPLATE,
  LEGACY_ROYALE_CSS_TEMPLATE,
} from "@/lib/css-standings-template-engine";

export {
  STANDINGS_TEMPLATE_HEIGHT,
  STANDINGS_TEMPLATE_ROOT,
  STANDINGS_TEMPLATE_WIDTH,
  getStandingsTemplateGameKind,
  getStandingsTemplateMapOptions,
  type StandingsExportView,
  type StandingsTemplateRow,
  type StandingsTemplateVisibleSocials,
};

export const DEFAULT_ORGANIZER_LOGO = "";
export const TEMPLATE_STORAGE_KEY = "esportific:css-templates:v2";

const TABLE_CONTENT_FONT = "Plus Jakarta Sans";
const DISPLAY_FONT = "Bebas Neue";
const DEFAULT_ACCENT = "#ff6a00";

const FREE_FIRE_LOGO_SRC = `${STANDINGS_TEMPLATE_ROOT}/free-fire-logo.png`;
const BGMI_LOGO_SRC = `${STANDINGS_TEMPLATE_ROOT}/bgmi-logo.png`;
const BOOYAH_LOGO_SRC = `${STANDINGS_TEMPLATE_ROOT}/booyah.png`;
const CHICKEN_DINNER_LOGO_SRC = `${STANDINGS_TEMPLATE_ROOT}/chicken-dinner.png`;
const TEAM_HEADER_ICON_SRC = `${STANDINGS_TEMPLATE_ROOT}/teams-white.png`;
const KILLS_HEADER_ICON_SRC = `${STANDINGS_TEMPLATE_ROOT}/kills-white.png`;
const PLACEMENT_HEADER_ICON_SRC = `${STANDINGS_TEMPLATE_ROOT}/placement-white.png`;
const ESPORTIFIC_LOGO_SRC = `${STANDINGS_TEMPLATE_ROOT}/esportific-logo.png`;

const SOCIAL_ICON_SRC: Record<StandingsTemplateSocialPlatform, string> = {
  instagram: `${STANDINGS_TEMPLATE_ROOT}/socials/instagram.svg`,
  facebook: `${STANDINGS_TEMPLATE_ROOT}/socials/facebook.svg`,
  discord: `${STANDINGS_TEMPLATE_ROOT}/socials/discord.svg`,
  youtube: `${STANDINGS_TEMPLATE_ROOT}/socials/youtube.svg`,
};

const MAP_IMAGE_SRC: Record<string, string> = {
  bermuda: `${STANDINGS_TEMPLATE_ROOT}/maps/bermuda.jpg`,
  purgatory: `${STANDINGS_TEMPLATE_ROOT}/maps/purgatory.jpg`,
  kalahari: `${STANDINGS_TEMPLATE_ROOT}/maps/kalahari.jpg`,
  nexterra: `${STANDINGS_TEMPLATE_ROOT}/maps/nexterra.jpg`,
  alpine: `${STANDINGS_TEMPLATE_ROOT}/maps/alpine.jpg`,
  erangel: `${STANDINGS_TEMPLATE_ROOT}/maps/erangel.jpg`,
  miramar: `${STANDINGS_TEMPLATE_ROOT}/maps/miramar.jpg`,
  sanhok: `${STANDINGS_TEMPLATE_ROOT}/maps/sanhok.jpg`,
  vikendi: `${STANDINGS_TEMPLATE_ROOT}/maps/vikendi.jpg`,
  karakin: `${STANDINGS_TEMPLATE_ROOT}/maps/karakin.jpg`,
  taego: `${STANDINGS_TEMPLATE_ROOT}/maps/taego.jpg`,
  deston: `${STANDINGS_TEMPLATE_ROOT}/maps/deston.jpg`,
  rondo: `${STANDINGS_TEMPLATE_ROOT}/maps/rondo.jpg`,
};

const EMPTY_ROW: StandingsTemplateRow = {
  slot: "",
  team: "",
  wins: "",
  killPoints: "",
  placementPoints: "",
  totalPoints: "",
};

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = /^[0-9a-fA-F]{6}$/.test(normalized) ? normalized : "ff6a00";
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function isDarkHexColor(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance < 0.45;
}

function normalizeMapName(value?: string | null) {
  return (value || "").trim();
}

function mapKey(value?: string | null) {
  return normalizeMapName(value).toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function padMatchNumber(value?: number | string | null) {
  const parsed = Number(value || 1);
  const safe = Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 1;
  return String(safe).padStart(2, "0");
}

function splitOrganizerName(value?: string | null) {
  const cleaned = (value || "").trim().replace(/\s+/g, " ");
  if (!cleaned) return { first: "YOUR", last: "NAME" };
  const parts = cleaned.split(" ");
  if (parts.length === 1) return { first: parts[0], last: "NAME" };
  const last = parts.pop() || "NAME";
  return {
    first: parts.join(" ") || "YOUR",
    last,
  };
}

function useTemplateFonts() {
  useEffect(() => {
    if (typeof document === "undefined" || !("fonts" in document)) return;
    void document.fonts.load(`400 32px "${DISPLAY_FONT}"`);
    ["400", "500", "600", "700", "800"].forEach((weight) => {
      void document.fonts.load(`${weight} 28px "${TABLE_CONTENT_FONT}"`);
    });
    void document.fonts.load(`200 28px "Nexa"`);
    void document.fonts.load(`800 28px "Nexa"`);
  }, []);
}

function rowsForTable(rows: StandingsTemplateRow[], rowCount: number) {
  return Array.from({ length: rowCount }, (_, index) => {
    const row = rows[index] ?? EMPTY_ROW;
    const numericSlot = Number(row.slot);
    const shouldUseDefaultSlot =
      row.slot === "" ||
      row.slot === null ||
      row.slot === undefined ||
      (Number.isFinite(numericSlot) && numericSlot <= 0);
    return {
      ...EMPTY_ROW,
      ...row,
      slot: shouldUseDefaultSlot ? index + 1 : row.slot,
    };
  });
}

export type StandingsTemplateRendererProps = {
  document?: CssTemplateDocument | any;
  accent?: string;
  hue?: number;
  hueEnabled?: boolean;
  rows?: StandingsTemplateRow[];
  eventName?: string;
  gameName?: string;
  mapName?: string;
  organizerName?: string;
  organizerFirstName?: string;
  organizerLastName?: string;
  organizerLogoSrc?: string | null;
  matchNumber?: number | string;
  currentMatchNumber?: number | string;
  finalMatchNumber?: number | string;
  totalMatchCount?: number;
  view?: StandingsExportView;
  visibleSocials?: StandingsTemplateVisibleSocials;
  socialHandle?: string;
  instagramHandle?: string;
  facebookHandle?: string;
  discordHandle?: string;
  youtubeHandle?: string;
  scale?: number;
  width?: number;
  height?: number;
  className?: string;
  style?: CSSProperties;
  rowCount?: number;
};

export const StandingsTemplateRenderer = forwardRef<HTMLDivElement, StandingsTemplateRendererProps>(
  function StandingsTemplateRenderer(
    {
      document: docProp,
      accent,
      hue = 211,
      hueEnabled = true,
      rows = [],
      eventName = "BATTLE ROYALE CHAMPIONSHIP",
      gameName = "Free Fire",
      mapName = "Bermuda",
      organizerName,
      organizerFirstName: orgFirstProp,
      organizerLastName: orgLastProp,
      organizerLogoSrc,
      matchNumber = 1,
      currentMatchNumber = 1,
      finalMatchNumber = 1,
      totalMatchCount,
      view = "overall",
      visibleSocials = DEFAULT_VISIBLE_SOCIALS,
      socialHandle,
      instagramHandle: igProp,
      facebookHandle: fbProp,
      discordHandle: dcProp,
      youtubeHandle: ytProp,
      scale = 1,
      className = "",
      style,
      rowCount = 12,
    },
    ref
  ) {
    useTemplateFonts();

    // Resolve template document
    const template: CssTemplateDocument = useMemo(() => {
      if (docProp && typeof docProp.customCss === "string") {
        return docProp;
      }
      if (docProp?.id?.includes("premium-2") || docProp?.name?.toLowerCase().includes("premium 2")) {
        return PREMIUM_2_CSS_TEMPLATE;
      }
      if (docProp?.id?.includes("battle-royale-points") || docProp?.name?.toLowerCase().includes("legacy")) {
        return LEGACY_ROYALE_CSS_TEMPLATE;
      }
      return PREMIUM_1_CSS_TEMPLATE;
    }, [docProp]);

    const activeAccent = accent || template.defaultAccent || DEFAULT_ACCENT;
    const accentReadable = isDarkHexColor(activeAccent) ? "#ffffff" : "#000000";
    const gameKind = getStandingsTemplateGameKind(gameName);
    const isFreeFire = gameKind === "free-fire";

    const gameLogoSrc = isFreeFire ? FREE_FIRE_LOGO_SRC : BGMI_LOGO_SRC;
    const winLogoSrc = isFreeFire ? BOOYAH_LOGO_SRC : CHICKEN_DINNER_LOGO_SRC;
    const winLabel = isFreeFire ? "BOOYAH" : "WWCD";

    const activeMapKey = mapKey(mapName);
    const mapImageSrc = MAP_IMAGE_SRC[activeMapKey] || (isFreeFire ? MAP_IMAGE_SRC.bermuda : MAP_IMAGE_SRC.erangel);

    const defaultNames = splitOrganizerName(
      organizerName ||
      (orgFirstProp && orgLastProp ? `${orgFirstProp} ${orgLastProp}` : orgFirstProp || "ESPORTIFIC PRO")
    );
    const firstName = orgFirstProp || defaultNames.first;
    const lastName = orgLastProp || defaultNames.last;

    const instagramHandle = igProp || socialHandle || "@esportific";
    const facebookHandle = fbProp || socialHandle || "/esportific";
    const discordHandle = dcProp || socialHandle || "discord.gg/esportific";
    const youtubeHandle = ytProp || socialHandle || "@esportific";

    const effectiveMatchNum = totalMatchCount ?? finalMatchNumber;
    const matchLabelText =
      view === "single-match"
        ? "FOR MATCH"
        : view === "till-match"
        ? "TILL MATCH"
        : "FINAL MATCH";

    const matchValueText =
      view === "single-match"
        ? `#${padMatchNumber(matchNumber)}`
        : view === "till-match"
        ? `#${padMatchNumber(currentMatchNumber)}`
        : `#${padMatchNumber(effectiveMatchNum)}`;

    const displayRows = useMemo(() => rowsForTable(rows, rowCount), [rows, rowCount]);

    // Base Dimensions
    const baseWidth = template.width || STANDINGS_TEMPLATE_WIDTH;
    const baseHeight = template.height || STANDINGS_TEMPLATE_HEIGHT;

    // Scoped CSS generator
    const scopedCss = useMemo(() => {
      const templateId = template.id || "custom-template";
      const userCss = template.customCss || "";
      
      const socialMaskCss = `
        .es-social-icon {
          display: inline-block;
          mask-size: contain;
          mask-repeat: no-repeat;
          mask-position: center;
          -webkit-mask-size: contain;
          -webkit-mask-repeat: no-repeat;
          -webkit-mask-position: center;
        }
        .es-social-instagram {
          mask-image: url('${SOCIAL_ICON_SRC.instagram}');
          -webkit-mask-image: url('${SOCIAL_ICON_SRC.instagram}');
        }
        .es-social-facebook {
          mask-image: url('${SOCIAL_ICON_SRC.facebook}');
          -webkit-mask-image: url('${SOCIAL_ICON_SRC.facebook}');
        }
        .es-social-discord {
          mask-image: url('${SOCIAL_ICON_SRC.discord}');
          -webkit-mask-image: url('${SOCIAL_ICON_SRC.discord}');
        }
        .es-social-youtube {
          mask-image: url('${SOCIAL_ICON_SRC.youtube}');
          -webkit-mask-image: url('${SOCIAL_ICON_SRC.youtube}');
        }
      `;

      return `
        [data-template-scope="${templateId}"] {
          --es-accent: ${activeAccent};
          --es-accent-readable: ${accentReadable};
          --es-hue: ${hueEnabled ? hue : 0}deg;
          --es-bg: ${template.background || "#0a0f1d"};
          --es-width: ${baseWidth}px;
          --es-height: ${baseHeight}px;
        }
        ${socialMaskCss}
        ${userCss}
      `;
    }, [template, activeAccent, accentReadable, hue, hueEnabled, baseWidth, baseHeight]);

    const containerStyle: CSSProperties = {
      width: `${baseWidth}px`,
      height: `${baseHeight}px`,
      transform: scale !== 1 ? `scale(${scale})` : undefined,
      transformOrigin: "top left",
      position: "relative",
      boxSizing: "border-box",
      overflow: "hidden",
      ...style,
    };

    return (
      <div
        ref={ref}
        data-template-scope={template.id || "custom-template"}
        className={`es-template ${className}`}
        style={containerStyle}
      >
        <style dangerouslySetInnerHTML={{ __html: scopedCss }} />

        {/* --- Header --- */}
        <header className="es-header">
          <div className="es-game-logo">
            <img src={gameLogoSrc} alt={gameName} />
          </div>

          <div className="es-event-meta">
            <div className="es-event-title">{eventName}</div>
            <div className="es-badges-row">
              <div className="es-badge-item es-badge-match">
                <span className="es-badge-label">{matchLabelText}:</span>
                <span className="es-badge-value">{matchValueText}</span>
              </div>
              {mapName && (
                <div className="es-badge-item es-badge-map">
                  <span className="es-badge-label">MAP:</span>
                  <span className="es-badge-value">{mapName}</span>
                </div>
              )}
            </div>
          </div>

          <div className="es-organizer-brand">
            <div className="es-organizer-logo">
              {organizerLogoSrc ? (
                <img src={organizerLogoSrc} alt="Organizer" />
              ) : (
                <span style={{ fontSize: "22px", fontWeight: 900, color: "#ffffff" }}>
                  {firstName[0] || "E"}
                </span>
              )}
            </div>
            <div className="es-organizer-name">
              <span className="es-organizer-first">{firstName}</span>
              <span className="es-organizer-last">{lastName}</span>
            </div>
          </div>
        </header>

        {/* --- Feature Map Banner --- */}
        {mapImageSrc && (
          <div className="es-feature-banner">
            <img src={mapImageSrc} alt={mapName} />
          </div>
        )}

        {/* --- Standings Table --- */}
        <main className="es-table-container">
          <div className="es-table-header">
            <div className="es-th es-th-slot">#</div>
            <div className="es-th es-th-team">
              <img src={TEAM_HEADER_ICON_SRC} alt="" style={{ height: "16px", objectFit: "contain" }} />
              <span>TEAM</span>
            </div>
            <div className="es-th es-th-wins">
              <img src={winLogoSrc} alt="" style={{ height: "18px", objectFit: "contain" }} />
              <span>{winLabel}</span>
            </div>
            <div className="es-th es-th-kills">
              <img src={KILLS_HEADER_ICON_SRC} alt="" style={{ height: "16px", objectFit: "contain" }} />
              <span>KILLS</span>
            </div>
            <div className="es-th es-th-placement">
              <img src={PLACEMENT_HEADER_ICON_SRC} alt="" style={{ height: "16px", objectFit: "contain" }} />
              <span>PLACE PTS</span>
            </div>
            <div className="es-th es-th-total">
              <span>TOTAL PTS</span>
            </div>
          </div>

          <div className="es-table-body">
            {displayRows.map((row, idx) => (
              <div
                key={idx}
                className={`es-table-row es-row-rank-${row.slot} ${idx % 2 === 0 ? "es-row-even" : "es-row-odd"}`}
              >
                <div className="es-td es-td-slot">{row.slot}</div>
                <div className="es-td es-td-team">
                  {row.teamLogoSrc && (
                    <img src={row.teamLogoSrc} alt="" className="es-team-logo" />
                  )}
                  <span className="es-team-name">{row.team || "-"}</span>
                </div>
                <div className="es-td es-td-wins">{row.wins !== "" ? row.wins : "0"}</div>
                <div className="es-td es-td-kills">{row.killPoints !== "" ? row.killPoints : "0"}</div>
                <div className="es-td es-td-placement">{row.placementPoints !== "" ? row.placementPoints : "0"}</div>
                <div className="es-td es-td-total">{row.totalPoints !== "" ? row.totalPoints : "0"}</div>
              </div>
            ))}
          </div>
        </main>

        {/* --- Footer --- */}
        <footer className="es-footer">
          <div className="es-socials-bar">
            {visibleSocials?.instagram && (
              <div className="es-social-item">
                <span className="es-social-icon es-social-instagram" />
                <span className="es-social-handle">{instagramHandle}</span>
              </div>
            )}
            {visibleSocials?.discord && (
              <div className="es-social-item">
                <span className="es-social-icon es-social-discord" />
                <span className="es-social-handle">{discordHandle}</span>
              </div>
            )}
            {visibleSocials?.facebook && (
              <div className="es-social-item">
                <span className="es-social-icon es-social-facebook" />
                <span className="es-social-handle">{facebookHandle}</span>
              </div>
            )}
            {visibleSocials?.youtube && (
              <div className="es-social-item">
                <span className="es-social-icon es-social-youtube" />
                <span className="es-social-handle">{youtubeHandle}</span>
              </div>
            )}
          </div>

          <div className="es-powered-by">
            <span className="es-powered-text">POWERED BY</span>
            <img src={ESPORTIFIC_LOGO_SRC} className="es-powered-logo" alt="Esportific" />
          </div>
        </footer>
      </div>
    );
  }
);

/**
 * StandingsTemplateViewport:
 * Responsive auto-scaling container that fits the 1122x1402 template into any bounding box.
 */
export function StandingsTemplateViewport({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(0.25);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateScale = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const scaleX = rect.width / STANDINGS_TEMPLATE_WIDTH;
        const scaleY = rect.height / STANDINGS_TEMPLATE_HEIGHT;
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
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex items-center justify-center overflow-hidden relative ${className}`}
      style={style}
    >
      <div
        style={{
          width: `${STANDINGS_TEMPLATE_WIDTH * scale}px`,
          height: `${STANDINGS_TEMPLATE_HEIGHT * scale}px`,
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: `${STANDINGS_TEMPLATE_WIDTH}px`,
            height: `${STANDINGS_TEMPLATE_HEIGHT}px`,
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
