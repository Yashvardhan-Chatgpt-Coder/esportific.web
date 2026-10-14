import { pageMeta } from "@/lib/route-meta";
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Image, Pencil, Plus, Search, Tag, Trash2, X } from "lucide-react";
import { AppPopupWindow } from "@/components/dashboard/AppPopupWindow";
import { SoftwareHeader } from "@/components/dashboard/SoftwareHeader";
import { ThemedConfirmDialog } from "@/components/ui/dialog";
import { queue } from "@/components/ui/Toast";
import { adminApi, type ApiPlatformTemplate } from "@/lib/api";

export const Route = createFileRoute("/admin/templates")({
  head: () => pageMeta('Manage templates', 'Manage leaderboard and event templates for organizers.'),
  component: AdminTemplatesPage,
});

function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<ApiPlatformTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [renameTarget, setRenameTarget] = useState<ApiPlatformTemplate | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ApiPlatformTemplate | null>(null);
  const [tagTarget, setTagTarget] = useState<ApiPlatformTemplate | null>(null);
  const [tagValue, setTagValue] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFormat, setNewFormat] = useState("Battle Royale");
  const [newCategory, setNewCategory] = useState("Leaderboard");

  useEffect(() => {
    let active = true;
    adminApi
      .getPlatformTemplates()
      .then((items) => active && setTemplates(items))
      .catch((error: Error) => {
        if (!active) return;
        queue.add({ title: "Could not load templates", description: error.message, variant: "error" }, { timeout: 5000 });
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const filteredTemplates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return templates;
    return templates.filter(
      (template) =>
        template.name.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query) ||
        template.format.toLowerCase().includes(query) ||
        template.tags.some((tag) => tag.toLowerCase().includes(query)),
    );
  }, [searchQuery, templates]);

  const openRename = (template: ApiPlatformTemplate) => {
    setRenameTarget(template);
    setRenameValue(template.name);
  };

  const saveRename = async () => {
    if (!renameTarget) return;
    const nextName = renameValue.trim();
    if (!nextName) {
      queue.add(
        { title: "Name required", description: "Template name cannot be empty.", variant: "error" },
        { timeout: 4000 },
      );
      return;
    }
    try {
      const updated = await adminApi.updatePlatformTemplate(renameTarget.id, { name: nextName });
      setTemplates((current) => current.map((template) => (template.id === updated.id ? updated : template)));
      setRenameTarget(null);
      queue.add({ title: "Template renamed", description: `Updated name to "${nextName}".`, variant: "success" }, { timeout: 4000 });
    } catch (error) {
      queue.add({ title: "Rename failed", description: error instanceof Error ? error.message : "Please try again.", variant: "error" }, { timeout: 5000 });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const name = deleteTarget.name;
    try {
      await adminApi.deletePlatformTemplate(deleteTarget.id);
      setTemplates((current) => current.filter((template) => template.id !== deleteTarget.id));
      setDeleteTarget(null);
      queue.add({ title: "Template deleted", description: `"${name}" was removed.`, variant: "success" }, { timeout: 4000 });
    } catch (error) {
      queue.add({ title: "Delete failed", description: error instanceof Error ? error.message : "Please try again.", variant: "error" }, { timeout: 5000 });
    }
  };

  const saveTags = async () => {
    if (!tagTarget) return;
    try {
      const updated = await adminApi.updatePlatformTemplate(tagTarget.id, { tags: tagTarget.tags });
      setTemplates((current) => current.map((template) => (template.id === updated.id ? updated : template)));
      setTagTarget(null);
      setTagValue("");
      queue.add({ title: "Tags updated", description: `Saved tags for "${updated.name}".`, variant: "success" }, { timeout: 4000 });
    } catch (error) {
      queue.add({ title: "Could not save tags", description: error instanceof Error ? error.message : "Please try again.", variant: "error" }, { timeout: 5000 });
    }
  };

  const addTag = () => {
    if (!tagTarget) return;
    const nextTag = tagValue.trim();
    if (!nextTag || tagTarget.tags.some((tag) => tag.toLowerCase() === nextTag.toLowerCase())) return;
    if (tagTarget.tags.length >= 12) {
      queue.add({ title: "Tag limit reached", description: "Each template can have up to 12 tags.", variant: "error" }, { timeout: 4000 });
      return;
    }
    setTagTarget({ ...tagTarget, tags: [...tagTarget.tags, nextTag] });
    setTagValue("");
  };

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      queue.add(
        { title: "Name required", description: "Please enter a name for the template.", variant: "error" },
        { timeout: 4000 },
      );
      return;
    }
    try {
      const created = await adminApi.createPlatformTemplate({
        name: trimmed,
        category: newCategory,
        format: newFormat,
        tags: [],
        previewUrl: "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/Autumn%20Season%20Template/Design.html",
      });
      setTemplates((current) => [created, ...current]);
      setCreateOpen(false);
      setNewName("");
      queue.add({ title: "Template added", description: `"${trimmed}" is now available.`, variant: "success" }, { timeout: 4000 });
    } catch (error) {
      queue.add({ title: "Could not create template", description: error instanceof Error ? error.message : "Please try again.", variant: "error" }, { timeout: 5000 });
    }
  };

  return (
    <>
      <SoftwareHeader title="Templates" variant="admin" />

      <main className="min-h-0 flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-[1200px]">
          {/* Header row */}
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <h1 className="text-[28px] font-semibold tracking-tight text-[#000000]">Templates</h1>
              <p className="mt-1 max-w-[520px] text-[14px] text-[#666666]">
                Manage leaderboard and standings templates used across tournaments.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex h-[38px] cursor-pointer items-center gap-2 rounded-[6px] bg-[#000000] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#1f1f1f]"
            >
              <Plus className="h-4 w-4" />
              New template
            </button>
          </div>

          {/* Simple Search Bar */}
          <div className="relative mb-6 max-w-[320px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1b0]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="h-[40px] w-full rounded-[8px] border-2 border-[#eef0f4] bg-white pl-9 pr-3 text-[14px] outline-none placeholder:text-[#9aa1b0] focus:border-[#000000]"
            />
          </div>

          {/* Templates list or empty state */}
          {loading ? (
            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="h-[370px] animate-pulse rounded-[10px] border border-[#e2e5ec] bg-white" />
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center rounded-[12px] border border-dashed border-[#d1d5db] bg-white py-20 text-center">
              <Image className="mb-3 h-8 w-8 text-[#9aa1b0]" />
              <p className="text-[15px] font-semibold text-[#000000]">No templates found</p>
              <p className="mt-1 text-[14px] text-[#666666]">Try a different search or add a new template.</p>
            </div>
          ) : (
            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredTemplates.map((template) => (
                <article
                  key={template.id}
                  className="group flex flex-col overflow-hidden rounded-[10px] border border-[#e2e5ec] bg-white transition hover:border-[#cfd4df] hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
                >
                  {/* Compact Preview Area */}
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#14100e]">
                    <iframe
                      src={template.previewUrl}
                      title={template.name}
                      className="pointer-events-none absolute inset-0 h-full w-full border-0 select-none"
                      tabIndex={-1}
                      loading="lazy"
                    />
                    <a
                      href={template.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open full preview in new tab"
                      className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-[6px] bg-black/60 text-white/80 opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/90 hover:text-white group-hover:opacity-100"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  {/* Card Info & Actions */}
                  <div className="flex flex-1 flex-col p-4">
                    <div className="min-w-0">
                      <h2 className="truncate text-[15px] font-semibold text-[#000000]" title={template.name}>
                        {template.name}
                      </h2>
                      <p className="mt-0.5 text-[12px] text-[#666666]">
                        {template.format} · {template.category}
                      </p>
                      {template.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {template.tags.map((tag) => (
                            <span key={tag} className="rounded-full bg-[#eef0f4] px-2 py-0.5 text-[10px] font-semibold text-[#4b5563]">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#f0f1f3] pt-3">
                      <button
                        type="button"
                        onClick={() => openRename(template)}
                        className="flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[6px] border border-[#e2e5ec] bg-white text-[12px] font-medium text-[#333333] transition-colors hover:bg-[#f7f8fb]"
                      >
                        <Pencil className="h-3.5 w-3.5 text-[#666666]" />
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTagTarget({ ...template, tags: [...template.tags] });
                          setTagValue("");
                        }}
                        className="flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[6px] border border-[#e2e5ec] bg-white text-[12px] font-medium text-[#333333] transition-colors hover:bg-[#f7f8fb]"
                      >
                        <Tag className="h-3.5 w-3.5 text-[#666666]" />
                        Tags
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(template)}
                        className="flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[6px] border border-[#fee2e2] bg-[#fff5f5] text-[12px] font-medium text-[#ef4444] transition-colors hover:bg-[#fee2e2]"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-[#ef4444]" />
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Rename Dialog */}
      <AppPopupWindow
        open={Boolean(renameTarget)}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        title="Rename Template"
        description="Update the template name displayed in the dashboard."
        className="max-w-[480px]"
        footer={
          <>
            <button
              type="button"
              onClick={() => setRenameTarget(null)}
              className="h-9 cursor-pointer rounded-[6px] border border-[#e2e5ec] bg-white px-4 text-[13px] font-medium text-[#666666] transition hover:bg-[#f7f8fb]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveRename}
              className="h-9 cursor-pointer rounded-[6px] bg-[#000000] px-4 text-[13px] font-medium text-white transition hover:bg-[#1f1f1f]"
            >
              Save changes
            </button>
          </>
        }
      >
        <div className="p-6">
          <label className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#666666]" htmlFor="rename-input">
            Template Name
          </label>
          <input
            id="rename-input"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveRename();
            }}
            className="mt-2 h-10 w-full rounded-[6px] border border-[#e2e5ec] bg-white px-3 text-[14px] text-[#000000] outline-none transition focus:border-[#000000]"
            autoFocus
          />
        </div>
      </AppPopupWindow>

      {/* Tags Dialog */}
      <AppPopupWindow
        open={Boolean(tagTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setTagTarget(null);
            setTagValue("");
          }
        }}
        title="Manage Template Tags"
        description={tagTarget ? `Add tags to help organize "${tagTarget.name}".` : ""}
        className="max-w-[480px]"
        footer={
          <>
            <button
              type="button"
              onClick={() => setTagTarget(null)}
              className="h-9 cursor-pointer rounded-[6px] border border-[#e2e5ec] bg-white px-4 text-[13px] font-medium text-[#666666] transition hover:bg-[#f7f8fb]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveTags}
              className="h-9 cursor-pointer rounded-[6px] bg-[#000000] px-4 text-[13px] font-medium text-white transition hover:bg-[#1f1f1f]"
            >
              Save tags
            </button>
          </>
        }
      >
        <div className="space-y-4 p-6">
          <div className="flex gap-2">
            <input
              value={tagValue}
              onChange={(event) => setTagValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addTag();
                }
              }}
              maxLength={40}
              placeholder="e.g. Premium, Free Fire"
              className="h-10 min-w-0 flex-1 rounded-[6px] border border-[#e2e5ec] bg-white px-3 text-[14px] text-[#000000] outline-none transition focus:border-[#000000]"
              autoFocus
            />
            <button
              type="button"
              onClick={addTag}
              className="h-10 shrink-0 cursor-pointer rounded-[6px] border border-[#e2e5ec] bg-white px-3 text-[13px] font-medium text-[#333333] transition hover:bg-[#f7f8fb]"
            >
              Add tag
            </button>
          </div>

          {tagTarget?.tags.length ? (
            <div className="flex flex-wrap gap-2">
              {tagTarget.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-[#eef0f4] py-1 pl-2.5 pr-1 text-[12px] font-medium text-[#4b5563]">
                  {tag}
                  <button
                    type="button"
                    onClick={() => setTagTarget({ ...tagTarget, tags: tagTarget.tags.filter((item) => item !== tag) })}
                    className="grid h-5 w-5 cursor-pointer place-items-center rounded-full text-[#666666] transition hover:bg-[#dfe3eb] hover:text-[#000000]"
                    aria-label={`Remove ${tag} tag`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-[#777777]">No tags yet. Add one or more labels to organize this template.</p>
          )}
        </div>
      </AppPopupWindow>

      {/* Delete Confirm Dialog */}
      <ThemedConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete template?"
        description={deleteTarget ? `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.` : ""}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
      />

      {/* New Template Dialog */}
      <AppPopupWindow
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) setCreateOpen(false);
        }}
        title="New Template"
        description="Add a new standings or leaderboard template card."
        className="max-w-[480px]"
        footer={
          <>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="h-9 cursor-pointer rounded-[6px] border border-[#e2e5ec] bg-white px-4 text-[13px] font-medium text-[#666666] transition hover:bg-[#f7f8fb]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              className="h-9 cursor-pointer rounded-[6px] bg-[#000000] px-4 text-[13px] font-medium text-white transition hover:bg-[#1f1f1f]"
            >
              Create template
            </button>
          </>
        }
      >
        <div className="space-y-4 p-6">
          <div>
            <label className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#666666]" htmlFor="create-name">
              Template Name
            </label>
            <input
              id="create-name"
              placeholder="e.g. Winter Season Standings"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
              className="mt-1.5 h-10 w-full rounded-[6px] border border-[#e2e5ec] bg-white px-3 text-[14px] text-[#000000] outline-none transition focus:border-[#000000]"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#666666]" htmlFor="create-format">
                Format
              </label>
              <input
                id="create-format"
                value={newFormat}
                onChange={(e) => setNewFormat(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-[6px] border border-[#e2e5ec] bg-white px-3 text-[14px] text-[#000000] outline-none transition focus:border-[#000000]"
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#666666]" htmlFor="create-category">
                Category
              </label>
              <input
                id="create-category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-[6px] border border-[#e2e5ec] bg-white px-3 text-[14px] text-[#000000] outline-none transition focus:border-[#000000]"
              />
            </div>
          </div>
        </div>
      </AppPopupWindow>
    </>
  );
}
