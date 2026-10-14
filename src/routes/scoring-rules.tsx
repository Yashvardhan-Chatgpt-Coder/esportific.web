import { pageMeta } from "@/lib/route-meta";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { OrganizerLayout } from "@/components/dashboard/OrganizerLayout";
import { SoftwareHeader } from "@/components/dashboard/SoftwareHeader";
import { ScoringRuleTemplateModal } from "@/components/dashboard/ScoringRuleTemplateModal";
import { ScoringRuleViewModal } from "@/components/dashboard/ScoringRuleViewModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  ThemedConfirmDialog,
} from "@/components/ui/dialog";
import { queue } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { apiGamesToCodeCatalogGames, type CatalogGame } from "@/lib/games-catalog";
import {
  cloneAsCustomDraft,
  formatLabel,
  getTemplateSummary,
  type ScoringRuleDraft,
  type ScoringRuleTemplate,
} from "@/lib/scoring-rule-templates";
import { catalogApi, scoringRulesApi } from "@/lib/api";
import { apiScoringRuleToTemplate, draftToApiPayload, isMongoId } from "@/lib/mappers";
import { Calculator, Copy, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { ScoringRulesSkeleton } from "@/components/dashboard/PageSkeletons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/scoring-rules")({
  head: () => pageMeta('Scoring rules', 'Create and manage scoring rules for esports tournaments.'),
  validateSearch: (search: Record<string, unknown>) => ({
    ruleId: typeof search.ruleId === "string" ? search.ruleId : undefined,
  }),
  component: ScoringRulesPage,
});

type TabFilter = "all" | "platform" | "custom";
const SCORING_RULE_PAGE_SIZE = 24;

type PendingTemplateUpdate = {
  draft: ScoringRuleDraft;
  existingId: string;
  eventCount: number;
};

function ScoringRulesPage() {
  const navigate = useNavigate();
  const { ruleId } = Route.useSearch();
  const [cachedInitialPage] = useState(() =>
    scoringRulesApi.getCachedPage({ page: 1, limit: SCORING_RULE_PAGE_SIZE, type: "all" }),
  );
  const [customTemplates, setCustomTemplates] = useState<ScoringRuleTemplate[]>(() =>
    cachedInitialPage?.items.map(apiScoringRuleToTemplate) ?? [],
  );
  const [appliedSearch, setAppliedSearch] = useState("");
  const [counts, setCounts] = useState(cachedInitialPage?.counts ?? { all: 0, platform: 0, custom: 0 });
  const [loadingMore, setLoadingMore] = useState(false);
  const [games, setGames] = useState<CatalogGame[]>([]);
  const [loading, setLoading] = useState(!cachedInitialPage);
  const [tab, setTab] = useState<TabFilter>("all");
  const [search, setSearch] = useState("");
  const [viewTemplate, setViewTemplate] = useState<ScoringRuleTemplate | null>(null);
  const [editorTemplate, setEditorTemplate] = useState<ScoringRuleTemplate | null>(null);
  const [prefillDraft, setPrefillDraft] = useState<ScoringRuleDraft | null>(null);
  const [lockEditorIdentityFields, setLockEditorIdentityFields] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ScoringRuleTemplate | null>(null);
  const [pendingTemplateUpdate, setPendingTemplateUpdate] = useState<PendingTemplateUpdate | null>(
    null,
  );
  const [savingTemplate, setSavingTemplate] = useState(false);
  const ruleRequestId = useRef(0);
  const rulePageRef = useRef(cachedInitialPage?.page ?? 0);
  const loadedRuleCountRef = useRef(cachedInitialPage?.items.length ?? 0);
  const totalRuleCountRef = useRef(cachedInitialPage?.total ?? 0);
  const loadingMoreRef = useRef(false);
  const ruleListRef = useRef<HTMLElement>(null);
  const ruleSentinelRef = useRef<HTMLDivElement>(null);

  const loadRules = useCallback(async (reset = true) => {
    if (!reset && (loadingMoreRef.current || loadedRuleCountRef.current >= totalRuleCountRef.current)) return;
    const requestId = reset ? ++ruleRequestId.current : ruleRequestId.current;
    const nextPage = reset ? 1 : rulePageRef.current + 1;
    const options = {
      page: nextPage,
      limit: SCORING_RULE_PAGE_SIZE,
      search: appliedSearch,
      type: tab,
    };
    const cached = reset ? scoringRulesApi.getCachedPage(options) : undefined;
    if (reset) {
      setLoading(!cached);
      if (!cached) setCustomTemplates([]);
      rulePageRef.current = 0;
      loadedRuleCountRef.current = 0;
      totalRuleCountRef.current = 0;
      loadingMoreRef.current = false;
      setLoadingMore(false);
    } else {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    }
    try {
      const result = await scoringRulesApi.getPage(options);
      if (requestId !== ruleRequestId.current) return;
      const rows = result.items.map(apiScoringRuleToTemplate);
      setCustomTemplates((current) => reset ? rows : [...current, ...rows]);
      setCounts(result.counts);
      rulePageRef.current = result.page;
      loadedRuleCountRef.current = reset ? rows.length : loadedRuleCountRef.current + rows.length;
      totalRuleCountRef.current = result.total;
    } catch (err) {
      if (requestId !== ruleRequestId.current) return;
      queue.add(
        {
          title: "Could not load scoring rules",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "error",
        },
        { timeout: 5000 },
      );
    } finally {
      if (reset && requestId === ruleRequestId.current) setLoading(false);
      if (!reset) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [appliedSearch, tab]);

  useEffect(() => {
    catalogApi.getGames()
      .then((rows) => setGames(apiGamesToCodeCatalogGames(rows)))
      .catch(() => setGames([]));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setAppliedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    void loadRules(true);
  }, [loadRules]);

  useEffect(() => {
    const sentinel = ruleSentinelRef.current;
    const root = ruleListRef.current;
    if (!sentinel || !root || loading || loadingMore || customTemplates.length >= totalRuleCountRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadRules(false);
    }, { root, rootMargin: "320px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [customTemplates.length, loading, loadingMore, loadRules]);

  useEffect(() => {
    if (loading || !ruleId) return;
    const template = customTemplates.find((item) => item.id === ruleId);
    if (template) {
      setViewTemplate(template);
      return;
    }
    let active = true;
    scoringRulesApi.getById(ruleId).then((row) => {
      if (!active) return;
      const loaded = apiScoringRuleToTemplate(row);
      setCustomTemplates((current) => current.some((item) => item.id === loaded.id) ? current : [...current, loaded]);
      setViewTemplate(loaded);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [customTemplates, loading, ruleId]);

  const clearRuleSearchParam = () => {
    if (!ruleId) return;
    navigate({ to: "/scoring-rules", search: { ruleId: undefined }, replace: true });
  };

  const filteredTemplates = useMemo(() => {
    return customTemplates;
  }, [customTemplates]);

  const openCreate = () => {
    setEditorTemplate(null);
    setPrefillDraft(null);
    setLockEditorIdentityFields(false);
    setShowEditor(true);
  };

  const openEdit = (template: ScoringRuleTemplate) => {
    setEditorTemplate(template);
    setPrefillDraft(null);
    setLockEditorIdentityFields(true);
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setEditorTemplate(null);
    setPrefillDraft(null);
    setLockEditorIdentityFields(false);
  };

  const persistExistingTemplate = async (
    draft: ScoringRuleDraft,
    existingId: string,
    applyToEvents: boolean,
    eventCount = 0,
  ) => {
    const updated = await scoringRulesApi.update(existingId, draftToApiPayload(draft), {
      applyToEvents,
    });
    const template = apiScoringRuleToTemplate(updated);
    setCustomTemplates((current) => current.map((t) => (t.id === existingId ? template : t)));
    queue.add(
      {
        title: "Template updated",
        description:
          eventCount > 0
            ? applyToEvents
              ? `${template.name} has been saved and applied to ${eventCount} existing ${eventCount === 1 ? "event" : "events"}.`
              : `${template.name} has been saved for future events. Existing events were not changed.`
            : `${template.name} has been saved.`,
        variant: "success",
      },
      { timeout: 5000 },
    );
    setViewTemplate(template);
  };

  const handleSaveDraft = async (draft: ScoringRuleDraft, existingId?: string) => {
    const normalizedName = draft.name.trim().toLowerCase();
    const nameTaken = customTemplates.some(
      (template) =>
        template.name.trim().toLowerCase() === normalizedName && template.id !== existingId,
    );

    if (nameTaken) {
      queue.add(
        {
          title: "Name already in use",
          description: "Choose a different template name.",
          variant: "error",
        },
        { timeout: 5000 },
      );
      return;
    }

    try {
      if (existingId && isMongoId(existingId)) {
        const usage = await scoringRulesApi.getUsage(existingId);
        if (usage.eventCount > 0) {
          setPendingTemplateUpdate({ draft, existingId, eventCount: usage.eventCount });
          return;
        }

        await persistExistingTemplate(draft, existingId, true);
      } else {
        const created = await scoringRulesApi.create(draftToApiPayload(draft));
        const template = apiScoringRuleToTemplate(created);
        setCustomTemplates((current) => [...current, template]);
        setCounts((current) => ({ ...current, all: current.all + 1, custom: current.custom + 1 }));
        queue.add(
          {
            title: "Template created",
            description: `${template.name} is ready to use when creating events.`,
            variant: "success",
          },
          { timeout: 5000 },
        );
        setTab("custom");
      }
      closeEditor();
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

  const confirmTemplateUpdate = async (applyToEvents: boolean) => {
    if (!pendingTemplateUpdate) return;
    setSavingTemplate(true);
    try {
      await persistExistingTemplate(
        pendingTemplateUpdate.draft,
        pendingTemplateUpdate.existingId,
        applyToEvents,
        pendingTemplateUpdate.eventCount,
      );
      setPendingTemplateUpdate(null);
      closeEditor();
    } catch (err) {
      queue.add(
        {
          title: "Save failed",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "error",
        },
        { timeout: 5000 },
      );
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDuplicate = (source: ScoringRuleTemplate) => {
    setViewTemplate(null);
    setEditorTemplate(null);
    setPrefillDraft(cloneAsCustomDraft(source));
    setLockEditorIdentityFields(false);
    setShowEditor(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (!isMongoId(deleteTarget.id)) {
      setDeleteTarget(null);
      return;
    }
    try {
      await scoringRulesApi.delete(deleteTarget.id);
      setCustomTemplates((current) => current.filter((t) => t.id !== deleteTarget.id));
      setCounts((current) => ({ ...current, all: Math.max(0, current.all - 1), custom: Math.max(0, current.custom - 1) }));
      if (viewTemplate?.id === deleteTarget.id) setViewTemplate(null);
      queue.add(
        {
          title: "Template deleted",
          description: `${deleteTarget.name} has been removed.`,
          variant: "success",
        },
        { timeout: 5000 },
      );
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
    setDeleteTarget(null);
  };

  const tabs: { id: TabFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.all },
    {
      id: "platform",
      label: "Platform",
      count: counts.platform,
    },
    {
      id: "custom",
      label: "My templates",
      count: counts.custom,
    },
  ];

  return (
    <OrganizerLayout header={<SoftwareHeader title="Scoring rules" />}>
      <main ref={ruleListRef} className="min-h-0 flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <h1 className="text-[28px] font-semibold tracking-tight text-[#000000]">
                Scoring rules
              </h1>
              <p className="mt-1 max-w-[520px] text-[14px] text-[#666666]">
                Manage scoring templates saved in the database, including platform templates
                published by admins and your own custom rules.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="flex h-[38px] shrink-0 cursor-pointer items-center gap-2 rounded-[8px] bg-[#000000] px-5 text-[14px] font-medium text-white transition-colors hover:bg-[#333]"
            >
              <Plus className="h-4 w-4" />
              Create template
            </button>
          </div>

          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex w-fit items-center rounded-[8px] bg-[#eef0f4] p-1">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "cursor-pointer rounded-[6px] px-4 py-1.5 text-[13px] font-medium transition-colors",
                    tab === item.id
                      ? "bg-white text-[#000000] shadow-sm"
                      : "text-[#666666] hover:text-[#000000]",
                  )}
                >
                  {item.label}
                  <span className="ml-1.5 text-[#9aa1b0]">({item.count})</span>
                </button>
              ))}
            </div>

            <div className="relative w-full max-w-[320px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1b0]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates..."
                className="h-[40px] w-full rounded-[8px] border-2 border-[#eef0f4] bg-white pl-9 pr-3 text-[14px] outline-none placeholder:text-[#9aa1b0] focus:border-[#000000]"
              />
            </div>
          </div>

          {loading ? (
            <ScoringRulesSkeleton />
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[#d1d5db] bg-white py-20 text-center">
              <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-[#f0f1f3]">
                <Calculator className="h-6 w-6 text-[#9aa1b0]" />
              </div>
              <h3 className="text-[17px] font-semibold text-[#000000]">No templates found</h3>
              <p className="mt-2 max-w-[360px] text-[14px] text-[#666666]">
                {tab === "custom" && counts.custom === 0
                  ? "Create a custom template to save your placement and kill point rules."
                  : "Try a different search or tab."}
              </p>
              {tab === "custom" && counts.custom === 0 && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="mt-6 flex cursor-pointer items-center gap-2 rounded-[8px] bg-[#000000] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#333]"
                >
                  <Plus className="h-4 w-4" />
                  Create template
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredTemplates.map((template) => (
                <ScoringRuleCard
                  key={template.id}
                  template={template}
                  onView={() => setViewTemplate(template)}
                  onEdit={() => openEdit(template)}
                  onDuplicate={() => handleDuplicate(template)}
                  onDelete={() => setDeleteTarget(template)}
                />
              ))}
            </div>
          )}
          {!loading && customTemplates.length < totalRuleCountRef.current && (
            <div ref={ruleSentinelRef} className="py-6 text-center text-[12px] text-[#8a93a3]">
              {loadingMore ? "Loading more scoring rules…" : "Scroll to load more scoring rules"}
            </div>
          )}
        </div>
      </main>

      <ScoringRuleViewModal
        open={viewTemplate !== null}
        template={viewTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setViewTemplate(null);
            clearRuleSearchParam();
          }
        }}
        onEdit={(t) => {
          setViewTemplate(null);
          clearRuleSearchParam();
          openEdit(t);
        }}
        onDuplicate={(t) => {
          clearRuleSearchParam();
          handleDuplicate(t);
        }}
        onDelete={(t) => setDeleteTarget(t)}
      />

      <ScoringRuleTemplateModal
        open={showEditor}
        initial={editorTemplate}
        prefillDraft={prefillDraft}
        onOpenChange={(open) => {
          if (!open) closeEditor();
          else setShowEditor(true);
        }}
        onSave={handleSaveDraft}
        games={games}
        lockIdentityFields={lockEditorIdentityFields}
      />

      <ThemedConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete custom template?"
        description={
          deleteTarget
            ? `${deleteTarget.name} will be permanently removed from your saved templates.`
            : ""
        }
        confirmLabel="Delete template"
        cancelLabel="Cancel"
        onConfirm={handleDelete}
      />

      <Dialog
        open={pendingTemplateUpdate !== null}
        onOpenChange={(open) => {
          if (!open && !savingTemplate) setPendingTemplateUpdate(null);
        }}
      >
        <DialogContent
          overlayClassName="z-[100]"
          className="z-[110] flex w-full max-w-[480px] flex-col gap-0 overflow-hidden rounded-[16px] border border-[#e2e5ec] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.12)]"
        >
          <DialogTitle className="sr-only">Apply scoring template changes?</DialogTitle>

          <div className="border-b border-[#f0f1f3] px-6 py-4">
            <h2 className="text-[18px] font-semibold text-[#000000]">Apply scoring changes?</h2>
          </div>

          <div className="px-6 py-5">
            <DialogDescription className="text-[13px] leading-5 text-[#666666]">
              This scoring template is being used in{" "}
              <span className="font-semibold text-[#000000]">
                {pendingTemplateUpdate?.eventCount ?? 0}{" "}
                {(pendingTemplateUpdate?.eventCount ?? 0) === 1 ? "event" : "events"}
              </span>
              . Do you want these edits to apply there too, or only to the template used for future
              events?
            </DialogDescription>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#f0f1f3] px-6 py-4">
            <button
              type="button"
              disabled={savingTemplate}
              onClick={() => confirmTemplateUpdate(false)}
              className="h-[36px] cursor-pointer rounded-[8px] border border-[#e2e5ec] bg-white px-4 text-[13px] font-medium text-[#000000] hover:bg-[#f7f8fb] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Future events only
            </button>
            <button
              type="button"
              disabled={savingTemplate}
              onClick={() => confirmTemplateUpdate(true)}
              className="h-[36px] cursor-pointer rounded-[8px] bg-[#000000] px-5 text-[13px] font-medium text-white hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Apply to existing events
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </OrganizerLayout>
  );
}

function ScoringRuleCard({
  template,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  template: ScoringRuleTemplate;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="flex flex-col rounded-[10px] border border-[#e2e5ec] bg-white p-5 transition-colors hover:border-[#d1d5db]">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#eef0f4] px-2.5 py-0.5 text-[11px] font-semibold text-[#4b5563]">
          {formatLabel(template.format)}
        </span>
        <span className="rounded-full bg-[#f0f1f3] px-2.5 py-0.5 text-[11px] font-semibold text-[#4b5563]">
          {template.gameName || "Generic"}
        </span>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
            template.isPlatform ? "bg-[#ede9fe] text-[#6d28d9]" : "bg-[#f0f1f3] text-[#4b5563]",
          )}
        >
          {template.isPlatform ? "Platform" : "Custom"}
        </span>
      </div>

      <h3 className="text-[17px] font-semibold text-[#000000]">{template.name}</h3>
      <p className="mt-1.5 line-clamp-2 flex-1 text-[13px] leading-relaxed text-[#666666]">
        {template.description || "No description."}
      </p>
      <p className="mt-3 text-[12px] font-medium text-[#9aa1b0]">{getTemplateSummary(template)}</p>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-[#f0f1f3] pt-4">
        <button
          type="button"
          onClick={onView}
          className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[6px] border border-[#e2e5ec] bg-[#f9fbfc] py-2 text-[13px] font-medium text-[#000000] hover:bg-[#f0f1f3]"
        >
          <Eye className="h-3.5 w-3.5" />
          View
        </button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onDuplicate}
                className="grid h-[34px] w-[34px] cursor-pointer place-items-center rounded-[6px] border border-[#e2e5ec] text-[#4b5563] hover:bg-[#f7f8fb]"
                aria-label={`Duplicate ${template.name}`}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Duplicate as custom</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {!template.isPlatform && (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onEdit}
                    className="grid h-[34px] w-[34px] cursor-pointer place-items-center rounded-[6px] border border-[#e2e5ec] text-[#4b5563] hover:bg-[#f7f8fb]"
                    aria-label={`Edit ${template.name}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Edit template</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onDelete}
                    className="grid h-[34px] w-[34px] cursor-pointer place-items-center rounded-[6px] border border-[#fecaca] text-[#ef4444] hover:bg-[#fff5f5]"
                    aria-label={`Delete ${template.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Delete template</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}
      </div>
    </article>
  );
}
