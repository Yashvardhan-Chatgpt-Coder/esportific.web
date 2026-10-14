import { pageMeta } from "@/lib/route-meta";
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SoftwareHeader } from "@/components/dashboard/SoftwareHeader";
import { AddGameModal } from "@/components/dashboard/AddGameModal";
import { queue } from "@/components/ui/Toast";
import {
  apiGamesToCodeCatalogGames,
  apiGameToCatalogGame,
  catalogGameToApiPayload,
  type CatalogGame,
} from "@/lib/games-catalog";
import { adminApi } from "@/lib/api";
import { GameIcon } from "@/components/dashboard/GameLabel";
import { Pencil, Search } from "lucide-react";
import { GlobalPageLoader } from "@/components/ui/GlobalPageLoader";

export const Route = createFileRoute("/admin/games")({
  head: () => pageMeta('Manage games', 'Manage supported games and their maps.'),
  component: AdminGamesPage,
});

function AdminGamesPage() {
  const [games, setGames] = useState<CatalogGame[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogGame | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getGames()
      .then((items) => setGames(apiGamesToCodeCatalogGames(items)))
      .catch((err) => {
        queue.add(
          {
            title: "Could not load games",
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
    if (!q) return games;
    return games.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.maps.some((m) => m.toLowerCase().includes(q)) ||
        g.formats.some((m) => m.name.toLowerCase().includes(q)),
    );
  }, [games, search]);

  const handleSave = async (game: CatalogGame) => {
    const exists = games.some((g) => g.id === game.id);
    if (!exists) {
      queue.add(
        { title: "Game is not connected", description: "Refresh games and try again.", variant: "error" },
        { timeout: 5000 },
      );
      return;
    }
    try {
      const saved = game.id.startsWith("code-")
        ? await adminApi.createGame(catalogGameToApiPayload(game))
        : await adminApi.updateGame(game.id, catalogGameToApiPayload(game));
      const catalogGame = apiGameToCatalogGame(saved);
      setGames((current) =>
        current.map((g) =>
          g.id === game.id
            ? { ...g, id: catalogGame.id, maps: catalogGame.maps, updatedAt: catalogGame.updatedAt }
            : g,
        ),
      );
      queue.add(
        {
          title: "Maps updated",
          description: `${game.name} maps were saved.`,
          variant: "success",
        },
        { timeout: 5000 },
      );
      setEditing(null);
    } catch (err) {
      queue.add(
        {
          title: "Save failed",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "error",
        },
        { timeout: 5000 },
      );
      throw err;
    }
  };

  return (
    <>
      <SoftwareHeader title="Games" variant="admin" />
      <main className="min-h-0 flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <h1 className="text-[28px] font-semibold tracking-tight text-[#000000]">Games</h1>
              <p className="mt-1 max-w-[520px] text-[14px] text-[#666666]">
                Games, logos, and formats are managed from code. Only maps are editable here.
              </p>
            </div>
          </div>

          <div className="relative mb-6 max-w-[320px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1b0]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search games..."
              className="h-[40px] w-full rounded-[8px] border-2 border-[#eef0f4] bg-white pl-9 pr-3 text-[14px] outline-none placeholder:text-[#9aa1b0] focus:border-[#000000]"
            />
          </div>

          {loading ? (
            <div className="rounded-[12px] border border-dashed border-[#d1d5db] bg-white py-20 text-center">
              <GlobalPageLoader label="Loading games" variant="section" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-[#d1d5db] bg-white py-20 text-center">
              <p className="text-[15px] font-semibold text-[#000000]">No games found</p>
              <p className="mt-1 text-[14px] text-[#666666]">No code-managed games are available.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((game) => (
                <article
                  key={game.id}
                  className="rounded-[10px] border border-[#e2e5ec] bg-white p-5"
                >
                  <div className="flex items-start gap-4">
                    <GameIcon
                      name={game.name}
                      logo={game.logoLight || game.logoDark || game.logo}
                      size="card"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[17px] font-semibold text-[#000000]">{game.name}</h3>
                      <p className="mt-2 text-[12px] font-medium uppercase tracking-wider text-[#9aa1b0]">
                        Maps
                      </p>
                      <p className="text-[13px] text-[#666666]">
                        {game.maps.length ? game.maps.join(" · ") : "—"}
                      </p>
                      <p className="mt-2 text-[12px] font-medium uppercase tracking-wider text-[#9aa1b0]">
                        Formats
                      </p>
                      <p className="text-[13px] text-[#666666]">
                        {game.formats.length ? game.formats.map((format) => format.name).join(" · ") : "—"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(game);
                          setModalOpen(true);
                        }}
                        className="grid h-8 w-8 cursor-pointer place-items-center rounded-[6px] border border-[#e2e5ec] hover:bg-[#f7f8fb]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      <AddGameModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditing(null);
        }}
        initial={editing}
        onSave={handleSave}
      />
    </>
  );
}
