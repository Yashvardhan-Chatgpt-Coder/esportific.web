export const STANDINGS_TEMPLATE_WIDTH = 1122;
export const STANDINGS_TEMPLATE_HEIGHT = 1402;
export const STANDINGS_TEMPLATE_ROOT = "/Templates/Finalized/premium-battle-royale-standings-template";
export const LEGACY_STANDINGS_TEMPLATE_ROOT = "/Templates/Finalized/battle-royale-points-template";
export const PREMIUM_2_STANDINGS_TEMPLATE_ROOT = "/Templates/Finalized/premium-2-battle-royale-standings-template";

export const CSS_TEMPLATE_STORAGE_KEY = "esportific:css-templates:v2";
export const LEGACY_HTML_TEMPLATE_STORAGE_KEY = "template-studio:html-documents:v1";

export type StandingsExportView = "overall" | "single-match" | "till-match";
export type StandingsTemplateSocialPlatform = "instagram" | "facebook" | "discord" | "youtube";
export type StandingsTemplateVisibleSocials = Record<StandingsTemplateSocialPlatform, boolean>;

export type StandingsTemplateRow = {
  slot: number | string;
  team: string;
  teamLogoSrc?: string | null;
  wins: number | string;
  killPoints: number | string;
  placementPoints: number | string;
  totalPoints: number | string;
};

export type CssTemplateVisibleSections = {
  header?: boolean;
  gameLogo?: boolean;
  eventName?: boolean;
  matchInfo?: boolean;
  mapInfo?: boolean;
  organizerBrand?: boolean;
  featureBanner?: boolean;
  standingsTable?: boolean;
  socialsBar?: boolean;
  poweredBy?: boolean;
};

export type CssTemplateDocument = {
  id: string;
  name: string;
  version: number;
  width: number;
  height: number;
  ratioLabel: string;
  category: string;
  format: string;
  background: string;
  defaultAccent: string;
  description?: string;
  customCss: string;
  visibleSections?: CssTemplateVisibleSections;
};

export const DEFAULT_VISIBLE_SOCIALS: StandingsTemplateVisibleSocials = {
  instagram: true,
  facebook: true,
  discord: true,
  youtube: true,
};

export const FREE_FIRE_MAPS = ["Bermuda", "Purgatory", "Kalahari", "Nexterra", "Alpine"] as const;
export const BGMI_MAPS = ["Erangel", "Miramar", "Sanhok", "Vikendi", "Karakin", "Taego", "Deston", "Rondo"] as const;

export function getStandingsTemplateGameKind(gameName?: string | null): "free-fire" | "bgmi" {
  const normalized = (gameName || "").toLowerCase();
  if (normalized.includes("bgmi") || normalized.includes("pubg") || normalized.includes("battlegrounds")) return "bgmi";
  return "free-fire";
}

export function getStandingsTemplateMapOptions(gameName?: string | null) {
  const maps = getStandingsTemplateGameKind(gameName) === "bgmi" ? BGMI_MAPS : FREE_FIRE_MAPS;
  return maps.map((map) => ({ label: map, value: map }));
}

/* =========================================================================
   BUILT-IN TEMPLATES DEFINED VIA FULL CUSTOM CSS
   ========================================================================= */

export const PREMIUM_2_CSS_TEMPLATE: CssTemplateDocument = {
  id: "premium-2-battle-royale-standings-template",
  name: "Premium 2 - Cyber Leaderboard",
  version: 3,
  width: STANDINGS_TEMPLATE_WIDTH,
  height: STANDINGS_TEMPLATE_HEIGHT,
  ratioLabel: "4:5",
  category: "Leaderboard",
  format: "Battle Royale",
  background: "#0a0f1d",
  defaultAccent: "#3b82f6",
  description: "Modern cyber tournament leaderboard with card panels, contrast columns, and dynamic map banner.",
  customCss: `/* ============================================================
   PREMIUM 2 CYBER LEADERBOARD TEMPLATE STYLES
   ============================================================ */

.es-template {
  background: var(--es-bg, #0a0f1d);
  color: #ffffff;
  font-family: var(--es-font-main, 'Plus Jakarta Sans', sans-serif);
  padding: 44px 52px 38px 52px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

/* --- Top Header Grid --- */
.es-header {
  display: grid;
  grid-template-columns: 240px 1fr auto;
  align-items: center;
  gap: 28px;
  position: relative;
  z-index: 10;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.es-game-logo img {
  height: 48px;
  max-width: 220px;
  object-fit: contain;
}

.es-event-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.es-event-title {
  font-family: var(--es-font-main, 'Plus Jakarta Sans', sans-serif);
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #ffffff;
  line-height: 1.1;
}

.es-badges-row {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.es-badge-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.08);
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.14);
}

.es-badge-label {
  color: var(--es-accent, #3b82f6);
}

.es-badge-value {
  color: #ffffff;
}

.es-organizer-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(255, 255, 255, 0.05);
  padding: 8px 16px 8px 10px;
  border-radius: 40px;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.es-organizer-logo {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #000000;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 2px solid var(--es-accent, #3b82f6);
}

.es-organizer-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.es-organizer-name {
  display: flex;
  flex-direction: column;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.15;
  text-transform: uppercase;
}

.es-organizer-first {
  color: #ffffff;
}

.es-organizer-last {
  color: var(--es-accent, #3b82f6);
}

/* --- Feature Map Banner --- */
.es-feature-banner {
  position: absolute;
  top: 140px;
  right: 52px;
  width: 360px;
  height: 150px;
  border-radius: 12px;
  overflow: hidden;
  opacity: 0.85;
  border: 1px solid rgba(255, 255, 255, 0.12);
  pointer-events: none;
  z-index: 1;
}

.es-feature-banner img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: contrast(1.1) brightness(0.9);
}

.es-feature-banner::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(10, 15, 29, 0.95) 0%, rgba(10, 15, 29, 0.2) 60%, rgba(10, 15, 29, 0.9) 100%);
}

/* --- Standings Leaderboard Table --- */
.es-table-container {
  flex: 1;
  margin-top: 16px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(18, 26, 47, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  position: relative;
  z-index: 5;
}

.es-table-header {
  display: grid;
  grid-template-columns: 80px 1fr 100px 130px 160px 140px;
  background: #0f172a;
  border-bottom: 2px solid var(--es-accent, #3b82f6);
  font-size: 14px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #94a3b8;
  height: 52px;
  align-items: center;
}

.es-th {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 10px;
}

.es-th-team {
  justify-content: flex-start;
  padding-left: 20px;
}

.es-th-total {
  background: rgba(59, 130, 246, 0.15);
  color: var(--es-accent, #3b82f6);
  height: 100%;
}

.es-table-body {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.es-table-row {
  display: grid;
  grid-template-columns: 80px 1fr 100px 130px 160px 140px;
  align-items: center;
  flex: 1;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 15px;
  font-weight: 700;
  color: #e2e8f0;
  transition: background 0.15s ease;
}

.es-table-row:nth-child(even) {
  background: rgba(255, 255, 255, 0.02);
}

/* Rank Highlights */
.es-row-rank-1 {
  background: linear-gradient(90deg, rgba(234, 179, 8, 0.12) 0%, rgba(234, 179, 8, 0.02) 100%);
}

.es-row-rank-1 .es-td-slot {
  color: #eab308;
  font-weight: 900;
}

.es-row-rank-2 {
  background: linear-gradient(90deg, rgba(148, 163, 184, 0.12) 0%, rgba(148, 163, 184, 0.02) 100%);
}

.es-row-rank-2 .es-td-slot {
  color: #cbd5e1;
  font-weight: 900;
}

.es-row-rank-3 {
  background: linear-gradient(90deg, rgba(217, 119, 6, 0.12) 0%, rgba(217, 119, 6, 0.02) 100%);
}

.es-row-rank-3 .es-td-slot {
  color: #f59e0b;
  font-weight: 900;
}

.es-td {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  height: 100%;
}

.es-td-slot {
  font-family: var(--es-font-main, 'Plus Jakarta Sans', sans-serif);
  font-weight: 800;
  font-size: 16px;
  color: #94a3b8;
}

.es-td-team {
  justify-content: flex-start;
  padding-left: 20px;
  gap: 12px;
}

.es-team-logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
  flex-shrink: 0;
}

.es-team-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 700;
  color: #ffffff;
}

.es-td-total {
  font-weight: 800;
  font-size: 17px;
  color: #ffffff;
  background: rgba(59, 130, 246, 0.12);
  border-left: 1px solid rgba(59, 130, 246, 0.2);
}

/* --- Footer Area --- */
.es-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  position: relative;
  z-index: 10;
}

.es-socials-bar {
  display: flex;
  align-items: center;
  gap: 22px;
  font-size: 13px;
  font-weight: 600;
  color: #cbd5e1;
}

.es-social-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.es-social-icon {
  width: 18px;
  height: 18px;
  background: var(--es-accent, #3b82f6);
}

.es-powered-by {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #94a3b8;
  text-transform: uppercase;
}

.es-powered-logo {
  height: 22px;
  object-fit: contain;
}
`
};

export const PREMIUM_1_CSS_TEMPLATE: CssTemplateDocument = {
  id: "premium-battle-royale-standings-template",
  name: "Premium 1 - Gold Royale Standings",
  version: 3,
  width: STANDINGS_TEMPLATE_WIDTH,
  height: STANDINGS_TEMPLATE_HEIGHT,
  ratioLabel: "4:5",
  category: "Leaderboard",
  format: "Battle Royale",
  background: "#080808",
  defaultAccent: "#ff6a00",
  description: "Bold angled orange and black theme with high contrast rankings, Booyah badges, and custom header cards.",
  customCss: `/* ============================================================
   PREMIUM 1 GOLD ROYALE TEMPLATE STYLES
   ============================================================ */

.es-template {
  background: var(--es-bg, #080808);
  color: #ffffff;
  font-family: var(--es-font-main, 'Plus Jakarta Sans', sans-serif);
  padding: 40px 48px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

/* Header */
.es-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 10;
  margin-bottom: 24px;
}

.es-game-logo img {
  height: 54px;
  max-width: 220px;
  object-fit: contain;
}

.es-event-meta {
  text-align: center;
}

.es-event-title {
  font-family: var(--es-font-display, 'Bebas Neue', sans-serif);
  font-size: 42px;
  letter-spacing: 2px;
  color: #ffffff;
  text-transform: uppercase;
  line-height: 1;
}

.es-badges-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-top: 6px;
  font-size: 14px;
  font-weight: 800;
  text-transform: uppercase;
}

.es-badge-item {
  background: var(--es-accent, #ff6a00);
  color: #000000;
  padding: 4px 12px;
  border-radius: 4px;
  letter-spacing: 0.5px;
}

.es-badge-label {
  font-weight: 900;
}

.es-badge-value {
  font-weight: 800;
}

.es-organizer-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.es-organizer-logo {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: #171717;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 2px solid var(--es-accent, #ff6a00);
}

.es-organizer-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.es-organizer-name {
  font-family: var(--es-font-display, 'Bebas Neue', sans-serif);
  font-size: 26px;
  line-height: 1;
  letter-spacing: 1px;
}

.es-organizer-first {
  color: #ffffff;
}

.es-organizer-last {
  color: var(--es-accent, #ff6a00);
  margin-left: 4px;
}

/* Leaderboard Table */
.es-table-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.94);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
  margin-bottom: 24px;
}

.es-table-header {
  display: grid;
  grid-template-columns: 80px 1fr 90px 130px 160px 140px;
  background: var(--es-accent, #ff6a00);
  color: #ffffff;
  height: 50px;
  font-family: var(--es-font-display, 'Bebas Neue', sans-serif);
  font-size: 24px;
  letter-spacing: 1px;
  text-transform: uppercase;
  align-items: center;
}

.es-th {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-left: 1px solid rgba(255, 255, 255, 0.3);
  height: 100%;
}

.es-th-slot {
  border-left: none;
}

.es-th-team {
  justify-content: flex-start;
  padding-left: 20px;
}

.es-th-total {
  background: #171717;
  color: #ffffff;
}

.es-table-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  color: #111111;
}

.es-table-row {
  display: grid;
  grid-template-columns: 80px 1fr 90px 130px 160px 140px;
  align-items: center;
  flex: 1;
  border-top: 1px solid #d9d9d9;
  font-size: 15px;
  font-weight: 700;
}

.es-table-row:nth-child(even) {
  background: rgba(240, 240, 240, 0.85);
}

.es-td {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  border-left: 1px solid #e8e8e8;
}

.es-td-slot {
  border-left: none;
  background: var(--es-accent, #ff6a00);
  color: #ffffff;
  font-family: var(--es-font-display, 'Bebas Neue', sans-serif);
  font-size: 28px;
}

.es-td-team {
  justify-content: flex-start;
  padding-left: 20px;
  gap: 12px;
}

.es-team-logo {
  width: 26px;
  height: 26px;
  object-fit: contain;
}

.es-team-name {
  font-weight: 800;
  text-transform: uppercase;
}

.es-td-total {
  background: #171717;
  color: #ffffff;
  font-family: var(--es-font-display, 'Bebas Neue', sans-serif);
  font-size: 32px;
  border-left: 1px solid #171717;
}

/* Footer */
.es-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.es-socials-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
  text-transform: uppercase;
}

.es-social-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.es-social-icon {
  width: 20px;
  height: 20px;
  background: var(--es-accent, #ff6a00);
}

.es-powered-by {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 1px;
  color: var(--es-accent, #ff6a00);
}

.es-powered-logo {
  height: 26px;
  object-fit: contain;
}
`
};

export const LEGACY_ROYALE_CSS_TEMPLATE: CssTemplateDocument = {
  id: "battle-royale-points-template",
  name: "Legacy - Dark Royale Points",
  version: 3,
  width: STANDINGS_TEMPLATE_WIDTH,
  height: STANDINGS_TEMPLATE_HEIGHT,
  ratioLabel: "4:5",
  category: "Leaderboard",
  format: "Battle Royale",
  background: "#000000",
  defaultAccent: "#ff6a00",
  description: "Classic translucent dark layout with sleek orange borders and minimal structure.",
  customCss: `/* ============================================================
   LEGACY DARK ROYALE TEMPLATE STYLES
   ============================================================ */

.es-template {
  background: var(--es-bg, #000000);
  color: #ffffff;
  font-family: var(--es-font-main, 'Plus Jakarta Sans', sans-serif);
  padding: 50px 60px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

/* Top Branding */
.es-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.es-organizer-logo {
  width: 90px;
  height: 90px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid var(--es-accent, #ff6a00);
  display: grid;
  place-items: center;
  overflow: hidden;
}

.es-organizer-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.es-event-title {
  font-size: 34px;
  font-weight: 800;
  text-transform: uppercase;
  color: #ffffff;
  letter-spacing: 1px;
}

/* Translucent Dark Table */
.es-table-container {
  flex: 1;
  margin: 30px 0;
  background: rgba(0, 0, 0, 0.7);
  border: 2px solid var(--es-accent, #ff6a00);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.es-table-header {
  display: grid;
  grid-template-columns: 90px 1fr 100px 140px 170px 150px;
  background: var(--es-accent, #ff6a00);
  color: #ffffff;
  height: 52px;
  font-size: 15px;
  font-weight: 800;
  text-transform: uppercase;
  align-items: center;
}

.es-th {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.es-th-team {
  justify-content: flex-start;
  padding-left: 20px;
}

.es-table-body {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.es-table-row {
  display: grid;
  grid-template-columns: 90px 1fr 100px 140px 170px 150px;
  align-items: center;
  flex: 1;
  border-top: 1px solid rgba(255, 106, 0, 0.3);
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
}

.es-table-row:nth-child(even) {
  background: rgba(255, 255, 255, 0.04);
}

.es-td {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  border-left: 1px solid rgba(255, 106, 0, 0.2);
}

.es-td-slot {
  border-left: none;
  font-weight: 800;
  color: var(--es-accent, #ff6a00);
}

.es-td-team {
  justify-content: flex-start;
  padding-left: 20px;
  gap: 12px;
}

.es-team-name {
  font-weight: 800;
}

.es-td-total {
  font-weight: 800;
  color: var(--es-accent, #ff6a00);
}

/* Footer */
.es-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.es-powered-by {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  font-weight: 800;
  color: var(--es-accent, #ff6a00);
  letter-spacing: 2px;
}

.es-powered-logo {
  height: 32px;
  object-fit: contain;
}
`
};

export const NEON_CYBER_CSS_TEMPLATE: CssTemplateDocument = {
  id: "neon-cyber-standings-template",
  name: "Neon Cyber - Glow Edition",
  version: 3,
  width: STANDINGS_TEMPLATE_WIDTH,
  height: STANDINGS_TEMPLATE_HEIGHT,
  ratioLabel: "4:5",
  category: "Leaderboard",
  format: "Battle Royale",
  background: "#050711",
  defaultAccent: "#06b6d4",
  description: "Futuristic neon tournament aesthetic with glowing cyan accents, gradient borders, and sleek badges.",
  customCss: `/* ============================================================
   NEON CYBER GLOW TEMPLATE STYLES
   ============================================================ */

.es-template {
  background: radial-gradient(circle at top right, rgba(6, 182, 212, 0.15), transparent 45%),
              radial-gradient(circle at bottom left, rgba(168, 85, 247, 0.15), transparent 45%),
              var(--es-bg, #050711);
  color: #ffffff;
  font-family: var(--es-font-main, 'Plus Jakarta Sans', sans-serif);
  padding: 44px 50px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.es-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(6, 182, 212, 0.3);
  padding-bottom: 22px;
}

.es-game-logo img {
  height: 48px;
  object-fit: contain;
}

.es-event-title {
  font-size: 32px;
  font-weight: 800;
  text-transform: uppercase;
  background: linear-gradient(90deg, #ffffff 0%, var(--es-accent, #06b6d4) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 1px;
}

.es-badges-row {
  display: flex;
  gap: 12px;
  margin-top: 6px;
  font-size: 13px;
  font-weight: 700;
}

.es-badge-item {
  background: rgba(6, 182, 212, 0.12);
  border: 1px solid var(--es-accent, #06b6d4);
  padding: 4px 12px;
  border-radius: 999px;
  color: #ffffff;
}

.es-organizer-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.es-organizer-logo {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 2px solid var(--es-accent, #06b6d4);
  box-shadow: 0 0 15px rgba(6, 182, 212, 0.5);
  display: grid;
  place-items: center;
  overflow: hidden;
}

.es-organizer-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.es-organizer-name {
  font-weight: 800;
  font-size: 16px;
}

.es-organizer-last {
  color: var(--es-accent, #06b6d4);
  margin-left: 4px;
}

/* Neon Table */
.es-table-container {
  flex: 1;
  margin: 20px 0;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(6, 182, 212, 0.4);
  background: rgba(10, 15, 30, 0.85);
  box-shadow: 0 0 30px rgba(6, 182, 212, 0.2);
  display: flex;
  flex-direction: column;
}

.es-table-header {
  display: grid;
  grid-template-columns: 80px 1fr 100px 130px 160px 140px;
  background: linear-gradient(90deg, rgba(6, 182, 212, 0.3) 0%, rgba(168, 85, 247, 0.3) 100%);
  border-bottom: 2px solid var(--es-accent, #06b6d4);
  height: 52px;
  font-size: 14px;
  font-weight: 800;
  text-transform: uppercase;
  color: #ffffff;
  align-items: center;
}

.es-th {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.es-th-team {
  justify-content: flex-start;
  padding-left: 20px;
}

.es-table-body {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.es-table-row {
  display: grid;
  grid-template-columns: 80px 1fr 100px 130px 160px 140px;
  align-items: center;
  flex: 1;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 15px;
  font-weight: 700;
}

.es-table-row:nth-child(even) {
  background: rgba(255, 255, 255, 0.02);
}

.es-row-rank-1 {
  background: rgba(6, 182, 212, 0.1);
}

.es-row-rank-1 .es-td-slot {
  color: #06b6d4;
  text-shadow: 0 0 10px rgba(6, 182, 212, 0.8);
}

.es-td {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.es-td-slot {
  font-weight: 900;
  color: #94a3b8;
}

.es-td-team {
  justify-content: flex-start;
  padding-left: 20px;
  gap: 12px;
}

.es-team-logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.es-team-name {
  color: #ffffff;
}

.es-td-total {
  font-weight: 800;
  color: var(--es-accent, #06b6d4);
  font-size: 17px;
}

/* Footer */
.es-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid rgba(6, 182, 212, 0.2);
  padding-top: 18px;
}

.es-socials-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
}

.es-social-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.es-social-icon {
  width: 18px;
  height: 18px;
  background: var(--es-accent, #06b6d4);
}

.es-powered-by {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 1px;
  color: #94a3b8;
}

.es-powered-logo {
  height: 22px;
  object-fit: contain;
}
`
};

export const BLANK_CANVAS_CSS_TEMPLATE: CssTemplateDocument = {
  id: "blank-canvas-template",
  name: "Blank Canvas Boilerplate",
  version: 3,
  width: STANDINGS_TEMPLATE_WIDTH,
  height: STANDINGS_TEMPLATE_HEIGHT,
  ratioLabel: "4:5",
  category: "Leaderboard",
  format: "Battle Royale",
  background: "#111827",
  defaultAccent: "#6366f1",
  description: "Minimal boilerplate with clean class hierarchy and helpful comments to build your own custom CSS template.",
  customCss: `/* ============================================================
   BLANK CANVAS BOILERPLATE TEMPLATE
   Customize this CSS to design your own tournament leaderboard!
   ============================================================ */

.es-template {
  background: var(--es-bg, #111827);
  color: #ffffff;
  font-family: var(--es-font-main, 'Plus Jakarta Sans', sans-serif);
  padding: 40px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

/* --- Header --- */
.es-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.es-event-title {
  font-size: 28px;
  font-weight: 800;
}

/* --- Standings Table --- */
.es-table-container {
  flex: 1;
  margin: 20px 0;
  display: flex;
  flex-direction: column;
  background: #1f2937;
  border-radius: 8px;
  overflow: hidden;
}

.es-table-header {
  display: grid;
  grid-template-columns: 80px 1fr 100px 130px 160px 140px;
  background: var(--es-accent, #6366f1);
  color: #ffffff;
  height: 48px;
  font-size: 14px;
  font-weight: 800;
  align-items: center;
  text-align: center;
}

.es-table-body {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.es-table-row {
  display: grid;
  grid-template-columns: 80px 1fr 100px 130px 160px 140px;
  align-items: center;
  flex: 1;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  text-align: center;
}

.es-td-team {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 20px;
  text-align: left;
}

/* --- Footer --- */
.es-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}
`
};

export const BUILT_IN_CSS_TEMPLATES: CssTemplateDocument[] = [
  PREMIUM_2_CSS_TEMPLATE,
  PREMIUM_1_CSS_TEMPLATE,
  LEGACY_ROYALE_CSS_TEMPLATE,
  NEON_CYBER_CSS_TEMPLATE,
  BLANK_CANVAS_CSS_TEMPLATE,
];

/* =========================================================================
   STORAGE & HELPERS
   ========================================================================= */

function isCssTemplateDocument(value: unknown): value is CssTemplateDocument {
  return Boolean(
    value &&
      typeof value === "object" &&
      "id" in value &&
      "name" in value &&
      "customCss" in value &&
      typeof (value as CssTemplateDocument).customCss === "string"
  );
}

export function getStoredCssTemplates(): CssTemplateDocument[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CSS_TEMPLATE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(isCssTemplateDocument);
    }
    return [];
  } catch {
    return [];
  }
}

export function saveStoredCssTemplates(templates: CssTemplateDocument[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CSS_TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
  window.dispatchEvent(new CustomEvent("esportific:css-templates-updated"));
  // Also dispatch legacy event for backward compatibility
  window.dispatchEvent(new CustomEvent("esportific:html-templates-updated"));
}

export function saveStoredCssTemplate(template: CssTemplateDocument) {
  const stored = getStoredCssTemplates();
  const exists = stored.some((item) => item.id === template.id);
  const next = exists
    ? stored.map((item) => (item.id === template.id ? template : item))
    : [...stored, template];
  saveStoredCssTemplates(next);
}

export function deleteStoredCssTemplate(id: string) {
  const stored = getStoredCssTemplates();
  const next = stored.filter((item) => item.id !== id);
  saveStoredCssTemplates(next);
}

export function getAvailableCssTemplates(): CssTemplateDocument[] {
  const stored = getStoredCssTemplates();
  const storedIds = new Set(stored.map((template) => template.id));
  return [
    ...BUILT_IN_CSS_TEMPLATES.filter((template) => !storedIds.has(template.id)),
    ...stored,
  ];
}

export function cloneCssTemplate(template: CssTemplateDocument, nextId = `template-css-${Date.now()}`): CssTemplateDocument {
  return {
    ...JSON.parse(JSON.stringify(template)),
    id: nextId,
    name: `${template.name} (Copy)`,
    version: (template.version || 1) + 1,
  };
}
