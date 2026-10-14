import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import {
  Code,
  Copy,
  Download,
  Eye,
  FileCode,
  Flame,
  Layout,
  Maximize2,
  Minimize2,
  Palette,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  BUILT_IN_CSS_TEMPLATES,
  STANDINGS_TEMPLATE_HEIGHT,
  STANDINGS_TEMPLATE_WIDTH,
  cloneCssTemplate,
  deleteStoredCssTemplate,
  getAvailableCssTemplates,
  getStandingsTemplateMapOptions,
  saveStoredCssTemplate,
  type CssTemplateDocument,
  type StandingsExportView,
  type StandingsTemplateRow,
  type StandingsTemplateVisibleSocials,
} from "@/lib/css-standings-template-engine";
import { beginExportProgress } from "@/lib/export-progress";
import {
  StandingsTemplateRenderer,
} from "@/components/dashboard/StandingsTemplateRenderer";
import { queue } from "@/components/ui/Toast";
import { ThemedConfirmDialog } from "@/components/ui/dialog";

const MOCK_ROWS: StandingsTemplateRow[] = [
  { slot: 1, team: "Falcon Reapers", wins: 1, killPoints: 35, placementPoints: 36, totalPoints: 71 },
  { slot: 2, team: "Rogue Reapers", wins: 0, killPoints: 46, placementPoints: 18, totalPoints: 64 },
  { slot: 3, team: "Shadow Crew", wins: 1, killPoints: 45, placementPoints: 15, totalPoints: 60 },
  { slot: 4, team: "Atomic Reapers", wins: 0, killPoints: 31, placementPoints: 19, totalPoints: 50 },
  { slot: 5, team: "Nexus Force", wins: 1, killPoints: 29, placementPoints: 21, totalPoints: 50 },
  { slot: 6, team: "Galaxy Esports", wins: 1, killPoints: 29, placementPoints: 21, totalPoints: 50 },
  { slot: 7, team: "Titan Force", wins: 1, killPoints: 32, placementPoints: 15, totalPoints: 47 },
  { slot: 8, team: "Blaze Wolves", wins: 0, killPoints: 16, placementPoints: 26, totalPoints: 42 },
  { slot: 9, team: "Vortex Gaming", wins: 0, killPoints: 18, placementPoints: 22, totalPoints: 40 },
  { slot: 10, team: "Cyber Knights", wins: 0, killPoints: 12, placementPoints: 20, totalPoints: 32 },
  { slot: 11, team: "Apex Strikers", wins: 0, killPoints: 14, placementPoints: 16, totalPoints: 30 },
  { slot: 12, team: "Ghost Legion", wins: 0, killPoints: 10, placementPoints: 14, totalPoints: 24 },
];

const DEFAULT_VISIBLE_SOCIALS: StandingsTemplateVisibleSocials = {
  instagram: true,
  facebook: true,
  discord: true,
  youtube: true,
};

const COLOR_SWATCHES = [
  "#3b82f6", // Cyber Blue
  "#ff6a00", // Blaze Orange
  "#06b6d4", // Neon Cyan
  "#10b981", // Emerald Green
  "#a855f7", // Vivid Purple
  "#eab308", // Championship Gold
  "#ef4444", // Crimson Red
  "#ec4899", // Neon Pink
  "#ffffff", // White
];

const CSS_SNIPPETS = [
  {
    title: "Glassmorphism Card Effect",
    description: "Frosted translucent glass effect with backdrop blur",
    css: `
/* --- Glassmorphism Effect --- */
.es-table-container {
  background: rgba(15, 23, 42, 0.75) !important;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.18) !important;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6) !important;
}
`,
  },
  {
    title: "Gold, Silver, Bronze Rank Badges",
    description: "Glowing podium colors for top 3 teams",
    css: `
/* --- Podium Rank Badges --- */
.es-row-rank-1 .es-td-slot {
  color: #eab308 !important;
  font-weight: 900 !important;
  text-shadow: 0 0 12px rgba(234, 179, 8, 0.6);
}
.es-row-rank-2 .es-td-slot {
  color: #cbd5e1 !important;
  font-weight: 900 !important;
  text-shadow: 0 0 10px rgba(203, 213, 225, 0.5);
}
.es-row-rank-3 .es-td-slot {
  color: #f97316 !important;
  font-weight: 900 !important;
  text-shadow: 0 0 10px rgba(249, 115, 22, 0.5);
}
`,
  },
  {
    title: "Cyber Neon Glow Borders",
    description: "Vibrant glowing border around the table & badges",
    css: `
/* --- Neon Glow Borders --- */
.es-table-container {
  border: 2px solid var(--es-accent, #3b82f6) !important;
  box-shadow: 0 0 25px var(--es-accent, #3b82f6), inset 0 0 15px rgba(59, 130, 246, 0.2) !important;
}
.es-organizer-logo {
  box-shadow: 0 0 18px var(--es-accent, #3b82f6) !important;
}
`,
  },
  {
    title: "Gradient Typography Title",
    description: "Multi-color gradient text fill for event title",
    css: `
/* --- Gradient Event Title --- */
.es-event-title {
  background: linear-gradient(135deg, #ffffff 20%, var(--es-accent, #3b82f6) 100%) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  letter-spacing: 1px !important;
}
`,
  },
  {
    title: "Zebra Striped Rows",
    description: "Alternating row backgrounds for enhanced readability",
    css: `
/* --- Zebra Striped Rows --- */
.es-table-row:nth-child(even) {
  background: rgba(255, 255, 255, 0.04) !important;
}
.es-table-row:nth-child(odd) {
  background: rgba(0, 0, 0, 0.15) !important;
}
`,
  },
];

export function CssTemplateStudioContent() {
  const [templates, setTemplates] = useState<CssTemplateDocument[]>(() => getAvailableCssTemplates());
  const [selectedId, setSelectedId] = useState<string>(() => templates[0]?.id ?? BUILT_IN_CSS_TEMPLATES[0].id);

  // Find active template
  const activeTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedId) ?? templates[0] ?? BUILT_IN_CSS_TEMPLATES[0];
  }, [templates, selectedId]);

  // Working copy in editor
  const [currentTemplate, setCurrentTemplate] = useState<CssTemplateDocument>(activeTemplate);
  const [activeTab, setActiveTab] = useState<"css" | "palette" | "snippets">("css");

  // Sync working copy when active template selection changes
  useEffect(() => {
    setCurrentTemplate(activeTemplate);
  }, [activeTemplate.id]);

  // Simulation controls
  const [previewGame, setPreviewGame] = useState<"Free Fire" | "BGMI">("Free Fire");
  const [previewMap, setPreviewMap] = useState<string>("Bermuda");
  const [previewView, setPreviewView] = useState<StandingsExportView>("overall");
  const [previewMatchNumber, setPreviewMatchNumber] = useState<number>(1);
  const [previewEventName, setPreviewEventName] = useState<string>("BATTLE ROYALE CHAMPIONSHIP");
  const [previewOrgFirst, setPreviewOrgFirst] = useState<string>("ESPORTIFIC");
  const [previewOrgLast, setPreviewOrgLast] = useState<string>("PRO");
  const [previewAccent, setPreviewAccent] = useState<string>(activeTemplate.defaultAccent || "#3b82f6");
  const [previewHue, setPreviewHue] = useState<number>(211);

  // Sync accent when current template defaultAccent changes
  useEffect(() => {
    if (currentTemplate.defaultAccent) {
      setPreviewAccent(currentTemplate.defaultAccent);
    }
  }, [currentTemplate.defaultAccent]);

  // Viewport Zoom
  const [scale, setScale] = useState<number>(0.55);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Delete & Reset Confirm Dialogs
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Code editor ref
  const codeEditorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Map options based on selected game
  const mapOptions = useMemo(() => {
    return getStandingsTemplateMapOptions(previewGame);
  }, [previewGame]);

  // Handle CSS Text change
  const handleCssChange = (newCss: string) => {
    setCurrentTemplate((prev) => ({
      ...prev,
      customCss: newCss,
    }));
    setHasUnsavedChanges(true);
  };

  // Handle Tab key in CSS Editor
  const handleEditorKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const newValue = value.substring(0, start) + "  " + value.substring(end);
      handleCssChange(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Insert Snippet into CSS
  const handleInsertSnippet = (snippetCss: string) => {
    const updatedCss = currentTemplate.customCss.trim() + "\n" + snippetCss;
    handleCssChange(updatedCss);
    queue.add({
      title: "CSS Snippet Inserted",
      description: "Added snippet to your stylesheet.",
    });
    setActiveTab("css");
  };

  // Save Template
  const handleSaveTemplate = () => {
    saveStoredCssTemplate(currentTemplate);
    setTemplates(getAvailableCssTemplates());
    setHasUnsavedChanges(false);
    queue.add({
      title: "Template Saved",
      description: `"${currentTemplate.name}" has been saved successfully.`,
    });
  };

  // Clone Template
  const handleCloneTemplate = () => {
    const cloned = cloneCssTemplate(currentTemplate);
    saveStoredCssTemplate(cloned);
    const updated = getAvailableCssTemplates();
    setTemplates(updated);
    setSelectedId(cloned.id);
    setCurrentTemplate(cloned);
    setHasUnsavedChanges(false);
    queue.add({
      title: "Template Cloned",
      description: `Created copy "${cloned.name}".`,
    });
  };

  // Create Blank Template
  const handleCreateNewTemplate = () => {
    const newDoc: CssTemplateDocument = {
      id: `custom-template-${Date.now()}`,
      name: "My Custom CSS Template",
      version: 1,
      width: STANDINGS_TEMPLATE_WIDTH,
      height: STANDINGS_TEMPLATE_HEIGHT,
      ratioLabel: "4:5",
      category: "Leaderboard",
      format: "Battle Royale",
      background: "#0a0f1d",
      defaultAccent: "#3b82f6",
      description: "Custom CSS template created in Template Studio.",
      customCss: BUILT_IN_CSS_TEMPLATES[4].customCss, // Boilerplate
    };
    saveStoredCssTemplate(newDoc);
    setTemplates(getAvailableCssTemplates());
    setSelectedId(newDoc.id);
    setCurrentTemplate(newDoc);
    setHasUnsavedChanges(false);
    queue.add({
      title: "New Template Created",
      description: "Start designing with custom CSS!",
    });
  };

  // Delete Template
  const handleDeleteTemplate = () => {
    deleteStoredCssTemplate(currentTemplate.id);
    const remaining = getAvailableCssTemplates();
    setTemplates(remaining);
    const nextId = remaining[0]?.id ?? BUILT_IN_CSS_TEMPLATES[0].id;
    setSelectedId(nextId);
    setHasUnsavedChanges(false);
    setDeleteConfirmOpen(false);
    queue.add({
      title: "Template Deleted",
      description: "Custom template removed.",
    });
  };

  // Reset to Built-in
  const handleResetToBuiltIn = () => {
    const builtIn = BUILT_IN_CSS_TEMPLATES.find((t) => t.id === currentTemplate.id);
    if (builtIn) {
      deleteStoredCssTemplate(builtIn.id);
      setTemplates(getAvailableCssTemplates());
      setCurrentTemplate(builtIn);
      setHasUnsavedChanges(false);
    }
    setResetConfirmOpen(false);
    queue.add({
      title: "Template Reset",
      description: "Restored template to default preset.",
    });
  };

  // Download CSS File
  const handleDownloadCss = async () => {
    const progress = await beginExportProgress();
    try {
      progress.update(40);
      const blob = new Blob([currentTemplate.customCss], { type: "text/css;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${currentTemplate.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.css`;
      a.click();
      URL.revokeObjectURL(url);
      progress.complete();
      queue.add({
        title: "CSS Downloaded",
        description: "Stylesheet saved to your downloads.",
      });
    } catch (error) {
      progress.dismiss();
      queue.add({ title: "CSS Download failed", description: "Could not download the stylesheet.", variant: "destructive" as any });
    }
  };

  // Export PNG via html-to-image
  const handleExportPng = async () => {
    if (!previewRef.current) return;
    const progress = await beginExportProgress();
    try {
      setIsExporting(true);
      progress.update(10);
      const { toPng } = await import("html-to-image");
      progress.update(25);
      const dataUrl = await toPng(previewRef.current, {
        pixelRatio: 2,
        cacheBust: true,
      });
      progress.update(90);
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${currentTemplate.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_preview.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      progress.complete();
      queue.add({
        title: "Image Exported",
        description: "High-resolution 2x PNG downloaded successfully.",
      });
    } catch (err) {
      progress.dismiss();
      console.error("Export error", err);
      queue.add({
        title: "Export Failed",
        description: "Could not rasterize template to PNG.",
        variant: "destructive" as any,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] bg-[#0b0f19] text-white overflow-hidden select-none">
      {/* =========================================================================
          TOP ACTION BAR
          ========================================================================= */}
      <div className="h-14 border-b border-white/10 bg-[#111827] px-4 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
            <Layout className="w-4 h-4 text-blue-400" />
            <select
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setHasUnsavedChanges(false);
              }}
              className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer pr-2"
            >
              <optgroup label="Custom & Built-in Templates">
                {templates.map((t) => (
                  <option key={t.id} value={t.id} className="bg-[#1f2937] text-white">
                    {t.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <button
            onClick={handleCreateNewTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition"
            title="Create a new template from boilerplate"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>

          <button
            onClick={handleCloneTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-semibold transition"
            title="Clone current template"
          >
            <Copy className="w-3.5 h-3.5" />
            Clone
          </button>

          {BUILT_IN_CSS_TEMPLATES.some((t) => t.id === currentTemplate.id) && (
            <button
              onClick={() => setResetConfirmOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-semibold transition"
              title="Reset template to default styles"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}

          {!BUILT_IN_CSS_TEMPLATES.some((t) => t.id === currentTemplate.id) && (
            <button
              onClick={() => setDeleteConfirmOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-semibold transition"
              title="Delete custom template"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
        </div>

        {/* Right action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCss}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-semibold transition"
            title="Download pure CSS stylesheet"
          >
            <FileCode className="w-3.5 h-3.5 text-blue-400" />
            Download CSS
          </button>

          <button
            onClick={handleExportPng}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-semibold transition"
            title="Export high-resolution PNG"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            {isExporting ? "Exporting..." : "Export PNG"}
          </button>

          <button
            onClick={handleSaveTemplate}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              hasUnsavedChanges
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40"
                : "bg-white/10 hover:bg-white/15 text-gray-300"
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            {hasUnsavedChanges ? "Save Changes *" : "Saved"}
          </button>
        </div>
      </div>

      {/* =========================================================================
          MAIN STUDIO SPLIT PANE
          ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: CSS Editor / Palette / Snippets */}
        <div className="w-[520px] flex flex-col border-r border-white/10 bg-[#0f172a] shrink-0">
          {/* Tabs */}
          <div className="h-11 border-b border-white/10 flex items-center px-2 bg-[#1e293b]/40">
            <button
              onClick={() => setActiveTab("css")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-md transition ${
                activeTab === "css"
                  ? "bg-blue-600 text-white shadow"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              Custom CSS
            </button>

            <button
              onClick={() => setActiveTab("palette")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-md transition ${
                activeTab === "palette"
                  ? "bg-blue-600 text-white shadow"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              Visual Palette
            </button>

            <button
              onClick={() => setActiveTab("snippets")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-md transition ${
                activeTab === "snippets"
                  ? "bg-blue-600 text-white shadow"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Snippets
            </button>
          </div>

          {/* TAB 1: CSS CODE EDITOR */}
          {activeTab === "css" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="bg-[#0b0f19] px-4 py-2 border-b border-white/5 flex items-center justify-between text-[11px] text-gray-400">
                <span>Styles are scoped to template container. Press Tab to indent.</span>
                <span className="font-mono text-blue-400">Live Previewing</span>
              </div>
              <div className="flex-1 relative overflow-hidden flex bg-[#0d1117]">
                <textarea
                  ref={codeEditorRef}
                  value={currentTemplate.customCss}
                  onChange={(e) => handleCssChange(e.target.value)}
                  onKeyDown={handleEditorKeyDown}
                  spellCheck={false}
                  className="w-full h-full p-4 bg-transparent text-gray-100 font-mono text-[13px] leading-relaxed resize-none focus:outline-none focus:ring-0 selection:bg-blue-600/30"
                  placeholder="/* Write custom CSS for your template here... */"
                />
              </div>

              {/* Quick Class Reference Footer */}
              <div className="p-3 bg-[#111827] border-t border-white/10 text-[11px] text-gray-400">
                <span className="font-semibold text-gray-300">Semantic Classes: </span>
                <code className="text-blue-400">.es-template</code>,{" "}
                <code className="text-blue-400">.es-header</code>,{" "}
                <code className="text-blue-400">.es-game-logo</code>,{" "}
                <code className="text-blue-400">.es-event-title</code>,{" "}
                <code className="text-blue-400">.es-table-container</code>,{" "}
                <code className="text-blue-400">.es-table-header</code>,{" "}
                <code className="text-blue-400">.es-table-row</code>,{" "}
                <code className="text-blue-400">.es-row-rank-1</code>,{" "}
                <code className="text-blue-400">.es-td-slot</code>,{" "}
                <code className="text-blue-400">.es-td-total</code>,{" "}
                <code className="text-blue-400">.es-footer</code>
              </div>
            </div>
          )}

          {/* TAB 2: VISUAL PALETTE & THEME SETTINGS */}
          {activeTab === "palette" && (
            <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-5">
              {/* Template Name */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Template Name
                </label>
                <input
                  type="text"
                  value={currentTemplate.name}
                  onChange={(e) => {
                    setCurrentTemplate((prev) => ({ ...prev, name: e.target.value }));
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Accent Color */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Accent Color (<code className="text-blue-400 lowercase">--es-accent</code>)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={previewAccent}
                    onChange={(e) => {
                      setPreviewAccent(e.target.value);
                      setCurrentTemplate((prev) => ({ ...prev, defaultAccent: e.target.value }));
                      setHasUnsavedChanges(true);
                    }}
                    className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={previewAccent}
                    onChange={(e) => {
                      setPreviewAccent(e.target.value);
                      setCurrentTemplate((prev) => ({ ...prev, defaultAccent: e.target.value }));
                      setHasUnsavedChanges(true);
                    }}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none"
                  />
                </div>
                {/* Color Swatches */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {COLOR_SWATCHES.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        setPreviewAccent(color);
                        setCurrentTemplate((prev) => ({ ...prev, defaultAccent: color }));
                        setHasUnsavedChanges(true);
                      }}
                      className="w-7 h-7 rounded-full border border-white/20 transition hover:scale-110"
                      style={{ background: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Background Color */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Base Background (<code className="text-blue-400 lowercase">--es-bg</code>)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={currentTemplate.background || "#0a0f1d"}
                    onChange={(e) => {
                      setCurrentTemplate((prev) => ({ ...prev, background: e.target.value }));
                      setHasUnsavedChanges(true);
                    }}
                    className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={currentTemplate.background || "#0a0f1d"}
                    onChange={(e) => {
                      setCurrentTemplate((prev) => ({ ...prev, background: e.target.value }));
                      setHasUnsavedChanges(true);
                    }}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Theme Hue Rotation */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Theme Hue (<code className="text-blue-400 lowercase">--es-hue</code>)
                  </label>
                  <span className="text-xs font-mono text-blue-400">{previewHue}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={previewHue}
                  onChange={(e) => setPreviewHue(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              {/* Canvas Specs */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg flex flex-col gap-2 text-xs text-gray-400">
                <span className="font-bold text-gray-200">Export Specifications:</span>
                <div>Dimensions: <strong className="text-white">1122 × 1402 px</strong></div>
                <div>Aspect Ratio: <strong className="text-white">4:5 Standard Portrait</strong></div>
                <div>Export Pixel Density: <strong className="text-white">2× Retina PNG</strong></div>
              </div>
            </div>
          )}

          {/* TAB 3: CSS SNIPPETS */}
          {activeTab === "snippets" && (
            <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4">
              <div className="text-xs text-gray-400">
                Click any snippet to instantly inject custom CSS rules into your stylesheet.
              </div>

              {CSS_SNIPPETS.map((snippet, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-white/5 border border-white/10 rounded-lg hover:border-blue-500/50 transition flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">{snippet.title}</span>
                    <button
                      onClick={() => handleInsertSnippet(snippet.css)}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add CSS
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">{snippet.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Live Interactive Preview Viewport */}
        <div className="flex-1 flex flex-col bg-[#07090e] overflow-hidden">
          {/* Viewport Simulation Controls Bar */}
          <div className="h-12 border-b border-white/10 bg-[#0d111a] px-4 flex items-center justify-between gap-3 text-xs shrink-0">
            {/* Simulation controls */}
            <div className="flex items-center gap-3">
              {/* Game switcher */}
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 font-medium">Game:</span>
                <select
                  value={previewGame}
                  onChange={(e) => setPreviewGame(e.target.value as any)}
                  className="bg-white/10 border border-white/10 rounded px-2 py-1 text-white font-semibold focus:outline-none"
                >
                  <option value="Free Fire" className="bg-[#1f2937]">Free Fire</option>
                  <option value="BGMI" className="bg-[#1f2937]">BGMI</option>
                </select>
              </div>

              {/* Map switcher */}
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 font-medium">Map:</span>
                <select
                  value={previewMap}
                  onChange={(e) => setPreviewMap(e.target.value)}
                  className="bg-white/10 border border-white/10 rounded px-2 py-1 text-white font-semibold focus:outline-none"
                >
                  {mapOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-[#1f2937]">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* View switcher */}
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 font-medium">View:</span>
                <select
                  value={previewView}
                  onChange={(e) => setPreviewView(e.target.value as any)}
                  className="bg-white/10 border border-white/10 rounded px-2 py-1 text-white font-semibold focus:outline-none"
                >
                  <option value="overall" className="bg-[#1f2937]">Overall Standings</option>
                  <option value="single-match" className="bg-[#1f2937]">Single Match</option>
                  <option value="till-match" className="bg-[#1f2937]">Till Match</option>
                </select>
              </div>
            </div>

            {/* Zoom controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setScale((s) => Math.max(0.2, s - 0.05))}
                className="p-1.5 bg-white/5 hover:bg-white/10 rounded text-gray-300 transition"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <span className="font-mono text-gray-300 w-12 text-center">
                {Math.round(scale * 100)}%
              </span>

              <button
                onClick={() => setScale((s) => Math.min(1.5, s + 0.05))}
                className="p-1.5 bg-white/5 hover:bg-white/10 rounded text-gray-300 transition"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <button
                onClick={() => setScale(0.55)}
                className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-gray-300 transition"
                title="Fit"
              >
                Fit
              </button>
            </div>
          </div>

          {/* Canvas Viewport Center */}
          <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
            <div
              style={{
                width: `${STANDINGS_TEMPLATE_WIDTH * scale}px`,
                height: `${STANDINGS_TEMPLATE_HEIGHT * scale}px`,
              }}
              className="relative shadow-2xl shadow-black/80 rounded transition-all duration-75 shrink-0"
            >
              <StandingsTemplateRenderer
                ref={previewRef}
                document={currentTemplate}
                accent={previewAccent}
                hue={previewHue}
                rows={MOCK_ROWS}
                eventName={previewEventName}
                gameName={previewGame}
                mapName={previewMap}
                organizerFirstName={previewOrgFirst}
                organizerLastName={previewOrgLast}
                matchNumber={previewMatchNumber}
                currentMatchNumber={previewMatchNumber}
                finalMatchNumber={previewMatchNumber}
                view={previewView}
                visibleSocials={DEFAULT_VISIBLE_SOCIALS}
                scale={scale}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <ThemedConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Template?"
        description="Are you sure you want to permanently delete this custom template?"
        confirmLabel="Delete"
        onConfirm={handleDeleteTemplate}
      />

      {/* Reset Dialog */}
      <ThemedConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title="Reset to Preset?"
        description="This will overwrite any local edits and restore the built-in preset CSS styles."
        confirmLabel="Reset"
        onConfirm={handleResetToBuiltIn}
      />
    </div>
  );
}
