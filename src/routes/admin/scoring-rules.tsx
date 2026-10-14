import { pageMeta } from "@/lib/route-meta";
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SoftwareHeader } from "@/components/dashboard/SoftwareHeader";
import { ScoringRuleTemplateModal } from "@/components/dashboard/ScoringRuleTemplateModal";
import { ScoringRuleViewModal } from "@/components/dashboard/ScoringRuleViewModal";
import { ThemedConfirmDialog } from "@/components/ui/dialog";
import { queue } from "@/components/ui/Toast";
import {
  apiGamesToCodeCatalogGames,
  type CatalogGame,
} from "@/lib/games-catalog";
import {
  formatLabel,
  getTemplateSummary,
  type ScoringRuleDraft,
  type ScoringRuleTemplate,
} from "@/lib/scoring-rule-templates";
import { adminApi } from "@/lib/api";
import { apiScoringRuleToTemplate, draftToApiPayload } from "@/lib/mappers";
import { Calculator, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { GlobalPageLoader } from "@/components/ui/GlobalPageLoader";

export const Route = createFileRoute("/admin/scoring-rules")({
  head: () => pageMeta('Manage scoring rules', 'Manage platform scoring rule templates.'),
  component: AdminScoringRulesPage,
});

function AdminScoringRulesPage() {
  const [templates, setTemplates] = useState<ScoringRuleTemplate[]>([]);
  const [games, setGames] = useState<CatalogGame[]>([]);
  const [search, setSearch] = useState("");
  const [viewTemplate, setViewTemplate] = useState<ScoringRuleTemplate | null>(null);
  const [editorTemplate, setEditorTemplate] = useState<ScoringRuleTemplate | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ScoringRuleTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminApi.getPlatformScoringRules(), adminApi.getGames()])
      .then(([rules, gameRows]) => {
        setTemplates(rules.map(apiScoringRuleToTemplate));
        setGames(apiGamesToCodeCatalogGames(gameRows));
      })
      .catch((err) => {
        queue.add(
          {
            title: "Could not load templates",
            description: err instanceof Error ? err.message : "Unknown error",
            variant: "error",
          },
          { timeout: 5000 },
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        formatLabel(t.format).toLowerCase().includes(q),
    );
  }, [templates, search]);

  const handleSave = async (draft: ScoringRuleDraft, existingId?: string) => {
    const normalized = draft.name.trim().toLowerCase();
    if (templates.some((t) => t.name.trim().toLowerCase() === normalized && t.id !== existingId)) {
      queue.add(
        { title: "Name already in use", description: "Choose a different template name.", variant: "error" },
        { timeout: 5000 },
      );
      return;
    }

    try {
      if (existingId) {
      const updated = apiScoringRuleToTemplate(
        await adminApi.updatePlatformScoringRule(existingId, draftToApiPayload(draft)),
      );
      setTemplates((current) => current.map((t) => (t.id === existingId ? updated : t)));
      queue.add(
        { title: "Template updated", description: `${updated.name} is live for organizers.`, variant: "success" },
        { timeout: 5000 },
      );
    } else {
      const created = apiScoringRuleToTemplate(
        await adminApi.createPlatformScoringRule(draftToApiPayload(draft)),
      );
      setTemplates((current) => [...current, created]);
      queue.add(
        { title: "Template published", description: `${created.name} is available to all organizers.`, variant: "success" },
        { timeout: 5000 },
      );
    }
    setShowEditor(false);
    setEditorTemplate(null);
    } catch (err) {
      queue.add(
        {
          title: "Save failed",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "error",
        },
        { timeout: 5000 },
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminApi.deletePlatformScoringRule(deleteTarget.id);
      setTemplates((current) => current.filter((t) => t.id !== deleteTarget.id));
      queue.add(
        { title: "Template removed", description: `${deleteTarget.name} was unpublished.`, variant: "success" },
        { timeout: 5000 },
      );
      setDeleteTarget(null);
    } catch (err) {
      queue.add(
        {
          title: "Delete failed",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "error",
        },
        { timeout: 5000 },
      );
    }
  };

  return (
    <>
      <SoftwareHeader title="Scoring rules" variant="admin" />
      <main className="min-h-0 flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <h1 className="text-[28px] font-semibold tracking-tight text-[#000000]">
                Platform scoring templates
              </h1>
              <p className="mt-1 max-w-[520px] text-[14px] text-[#666666]">
                Templates you publish here appear in every organizer&apos;s scoring rules list.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditorTemplate(null);
                setShowEditor(true);
              }}
              className="flex h-[38px] cursor-pointer items-center gap-2 rounded-[6px] bg-[#000000] px-5 text-[14px] font-medium text-white hover:bg-[#333]"
            >
              <Plus className="h-4 w-4" />
              Create template
            </button>
          </div>

          <div className="relative mb-6 max-w-[320px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1b0]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="h-[40px] w-full rounded-[8px] border-2 border-[#eef0f4] bg-white pl-9 pr-3 text-[14px] outline-none focus:border-[#000000]"
            />
          </div>

          {loading ? (
            <div className="flex flex-col items-center rounded-[12px] border border-dashed border-[#d1d5db] bg-white py-20">
              <GlobalPageLoader label="Loading templates" variant="section" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center rounded-[12px] border border-dashed border-[#d1d5db] bg-white py-20">
              <Calculator className="mb-4 h-6 w-6 text-[#9aa1b0]" />
              <p className="text-[17px] font-semibold">No platform templates yet</p>
              <p className="mt-2 text-[14px] text-[#666666]">Create one for organizers to use.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((template) => (
                <article
                  key={template.id}
                  className="flex flex-col rounded-[10px] border border-[#e2e5ec] bg-white p-5"
                >
                  <span className="mb-3 w-fit rounded-full bg-[#ede9fe] px-2.5 py-0.5 text-[11px] font-semibold text-[#6d28d9]">
                    Platform
                  </span>
                  <span className="mb-3 ml-2 w-fit rounded-full bg-[#eef0f4] px-2.5 py-0.5 text-[11px] font-semibold text-[#4b5563]">
                    {template.gameName || "Generic"} · {formatLabel(template.format)}
                  </span>
                  <h3 className="text-[17px] font-semibold">{template.name}</h3>
                  <p className="mt-1.5 flex-1 text-[13px] text-[#666666]">{template.description}</p>
                  <p className="mt-3 text-[12px] font-medium text-[#9aa1b0]">
                    {getTemplateSummary(template)}
                  </p>
                  <div className="mt-5 flex gap-2 border-t border-[#f0f1f3] pt-4">
                    <button
                      type="button"
                      onClick={() => setViewTemplate(template)}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[6px] border border-[#e2e5ec] py-2 text-[13px] font-medium hover:bg-[#f7f8fb]"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditorTemplate(template);
                        setShowEditor(true);
                      }}
                      className="grid h-[34px] w-[34px] cursor-pointer place-items-center rounded-[6px] border border-[#e2e5ec]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(template)}
                      className="grid h-[34px] w-[34px] cursor-pointer place-items-center rounded-[6px] border border-[#fecaca] text-[#ef4444]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      <ScoringRuleViewModal
        open={viewTemplate !== null}
        template={viewTemplate}
        onOpenChange={(open) => {
          if (!open) setViewTemplate(null);
        }}
        onEdit={(t) => {
          setViewTemplate(null);
          setEditorTemplate(t);
          setShowEditor(true);
        }}
        onDuplicate={() => {}}
        onDelete={(t) => setDeleteTarget(t)}
      />

      <ScoringRuleTemplateModal
        open={showEditor}
        initial={editorTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setShowEditor(false);
            setEditorTemplate(null);
          } else setShowEditor(true);
        }}
        onSave={handleSave}
        games={games}
      />

      <ThemedConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Unpublish template?"
        description={deleteTarget ? `${deleteTarget.name} will be removed for all organizers.` : ""}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDelete}
      />
    </>
  );
}
