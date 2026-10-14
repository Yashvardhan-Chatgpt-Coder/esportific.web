import { pageMeta } from "@/lib/route-meta";
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SoftwareHeader } from "@/components/dashboard/SoftwareHeader";
import { 
  Database, 
  Trash2, 
  RefreshCw, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle 
} from "lucide-react";
import { adminApi, type ApiOrphanedAsset } from "@/lib/api";
import { optimizeCloudinaryUrl } from "@/lib/utils";
import { queue } from "@/components/ui/Toast";
import { format } from "date-fns";
import { GlobalPageLoader } from "@/components/ui/GlobalPageLoader";

export const Route = createFileRoute("/admin/cloudinary")({
  head: () => pageMeta('Cloudinary cleanup', 'Review and clean up unused media assets.'),
  component: AdminCloudinaryPage,
});

function AdminCloudinaryPage() {
  const [assets, setAssets] = useState<ApiOrphanedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOrphaned = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getOrphanedAssets();
      setAssets(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Could not reach the server to fetch assets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrphaned();
  }, []);

  const handleDelete = async (publicId: string) => {
    setDeletingId(publicId);
    try {
      await adminApi.cleanupOrphanedAssets([publicId]);
      setAssets(prev => prev.filter(a => a.publicId !== publicId));
      queue.add(
        { title: "Asset deleted", description: "Successfully purged from Cloudinary storage.", variant: "success" },
        { timeout: 5000 }
      );
    } catch (err: any) {
      console.error(err);
      queue.add(
        { title: "Delete failed", description: err.message || "Failed to purge asset.", variant: "error" },
        { timeout: 5000 }
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleSweepAll = async () => {
    if (assets.length === 0) return;
    if (!confirm(`Are you sure you want to permanently delete all ${assets.length} orphaned images?`)) return;

    setCleaning(true);
    try {
      const ids = assets.map(a => a.publicId);
      await adminApi.cleanupOrphanedAssets(ids);
      setAssets([]);
      queue.add(
        { title: "Storage swept successfully", description: `Purged ${ids.length} unused assets.`, variant: "success" },
        { timeout: 5000 }
      );
    } catch (err: any) {
      console.error(err);
      queue.add(
        { title: "Sweep failed", description: err.message || "Failed to batch purge assets.", variant: "error" },
        { timeout: 5000 }
      );
    } finally {
      setCleaning(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const totalWastedBytes = assets.reduce((acc, a) => acc + (a.bytes || 0), 0);

  return (
    <>
      <SoftwareHeader title="Cloudinary Cleanup" variant="admin" />
      <main className="min-h-0 flex-1 overflow-y-auto p-8 lg:p-12">
        <div className="mx-auto max-w-[1200px] space-y-8 pb-20">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-[#000000]">
              Cloudinary Storage Cleanup
            </h1>
              <p className="mt-1 text-[14px] text-[#666666] max-w-[600px]">
              Audit and purge unused uploaded images that are taking up storage but not linked to any active database entries.
            </p>
          </div>

          {loading ? (
            <GlobalPageLoader label="Auditing Cloudinary storage" variant="section" />
          ) : error ? (
            <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[#e2e5ec] bg-white p-12 text-center">
              <AlertTriangle className="h-10 w-10 text-[#dc2626] mb-3" />
              <h3 className="text-[16px] font-semibold text-[#000000]">Database Connection Offline</h3>
              <p className="mt-2 max-w-[380px] text-[13px] text-[#666666] leading-relaxed">
                {error}. Please ensure your Node.js backend server and MongoDB are fully running.
              </p>
              <button
                onClick={fetchOrphaned}
                className="mt-5 flex items-center gap-2 rounded-[6px] border border-[#e2e5ec] bg-white px-4 py-2 text-[13px] font-medium text-[#000000] hover:bg-[#f7f8fb]"
              >
                <RefreshCw className="h-4 w-4" /> Try again
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overview stats */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[10px] border border-[#e2e5ec] bg-white p-5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#9aa1b0]">Wasted Files</p>
                  <p className="mt-2 text-[28px] font-semibold text-[#000000]">{assets.length}</p>
                </div>
                <div className="rounded-[10px] border border-[#e2e5ec] bg-white p-5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#9aa1b0]">Wasted Space</p>
                  <p className="mt-2 text-[28px] font-semibold text-[#dc2626]">{formatSize(totalWastedBytes)}</p>
                </div>
                <div className="rounded-[10px] border border-[#e2e5ec] bg-white p-5 flex flex-col justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#9aa1b0]">Cloudinary Folder</p>
                  <p className="mt-2 text-[15px] font-semibold text-[#000000]">Rangrove/Esportific/Software</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="text-[16px] font-semibold text-[#000000]">Unused Logos & Images</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={fetchOrphaned}
                    className="flex h-[36px] cursor-pointer items-center gap-2 rounded-[6px] border border-[#e2e5ec] bg-white px-4 text-[13px] font-medium text-[#000000] hover:bg-[#f7f8fb]"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                  <button
                    disabled={assets.length === 0 || cleaning}
                    onClick={handleSweepAll}
                    className="flex h-[36px] cursor-pointer items-center gap-2 rounded-[6px] bg-[#dc2626] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#b91c1c] disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {cleaning ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Database className="h-4 w-4" />
                    )}
                    Sweep Trash Bin
                  </button>
                </div>
              </div>

              {assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[#e2e5ec] bg-white py-16 text-center">
                  <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-[#e2f5ec]">
                    <CheckCircle2 className="h-6 w-6 text-[#059669]" />
                  </div>
                  <h3 className="text-[16px] font-semibold text-[#000000]">Storage is Clean</h3>
                  <p className="mt-2 max-w-[340px] text-[13px] text-[#666666] leading-relaxed">
                    All uploaded images in Cloudinary are actively linked to your database. No wasted bytes found!
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-[10px] border border-[#e2e5ec] bg-white">
                  <table className="w-full text-left text-[13px]">
                    <thead className="border-b border-[#e2e5ec] bg-[#f9fbfc]">
                      <tr>
                        <th className="px-5 py-3 font-medium uppercase tracking-wider text-[#4b5563]">Image</th>
                        <th className="px-5 py-3 font-medium uppercase tracking-wider text-[#4b5563]">Public ID / Name</th>
                        <th className="px-5 py-3 font-medium uppercase tracking-wider text-[#4b5563]">Folder</th>
                        <th className="px-5 py-3 font-medium uppercase tracking-wider text-[#4b5563]">Format</th>
                        <th className="px-5 py-3 font-medium uppercase tracking-wider text-[#4b5563]">Size</th>
                        <th className="px-5 py-3 font-medium uppercase tracking-wider text-[#4b5563]">Uploaded</th>
                        <th className="px-5 py-3 text-right font-medium uppercase tracking-wider text-[#4b5563]">Purge</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f1f3]">
                      {assets.map((asset) => (
                        <tr key={asset.publicId} className="hover:bg-[#fcfdfd]">
                          <td className="px-5 py-3.5">
                            <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-[#eef0f4] bg-[#f9fbfc]">
                              <img
                                src={optimizeCloudinaryUrl(asset.url, 80, 80)}
                                alt=""
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            </div>
                          </td>
                          <td className="px-5 py-3.5 font-medium text-[#000000] truncate max-w-[200px]" title={asset.publicId}>
                            {asset.publicId.split("/").pop()}
                          </td>
                          <td className="px-5 py-3.5 text-[#666666] truncate max-w-[260px]" title={asset.folder}>
                            {asset.folder || "-"}
                          </td>
                          <td className="px-5 py-3.5 text-[#666666] uppercase">{asset.format}</td>
                          <td className="px-5 py-3.5 text-[#000000] font-medium">{formatSize(asset.bytes)}</td>
                          <td className="px-5 py-3.5 text-[#666666]">{format(new Date(asset.createdAt), "PPp")}</td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              disabled={deletingId === asset.publicId}
                              onClick={() => handleDelete(asset.publicId)}
                              className="rounded-[5px] cursor-pointer p-2 text-[#9aa1b0] transition-colors hover:bg-[#fee2e2] hover:text-[#ef4444]"
                            >
                              {deletingId === asset.publicId ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
