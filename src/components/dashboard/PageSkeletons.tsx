import { Skeleton } from "@/components/ui/skeleton";

function SkeletonStatus({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-label={label} aria-live="polite" className="h-full min-h-0 overflow-hidden animate-in fade-in duration-200">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <SkeletonStatus label="Loading dashboard">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1200px] flex-col gap-8 overflow-hidden p-8">
        <div className="shrink-0 space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>

        <div className="grid shrink-0 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="flex h-[54px] items-center justify-between rounded-[8px] border border-[#e2e6ed] bg-white px-4"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] border border-[#e2e5ec] bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-[#f0f1f3] px-6 py-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-5 w-40" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="grid grid-cols-[32%_18%_22%_11%_17%] bg-[#f9fbfc] px-4 py-3">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-3 w-16" />
            ))}
          </div>
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="grid grid-cols-[32%_18%_22%_11%_17%] items-center border-t border-[#f0f1f3] px-4 py-3"
            >
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-8 w-8 rounded-[6px]" />
                <Skeleton className="h-4 w-36 max-w-[80%]" />
              </div>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-12" />
              <div className="flex justify-end"><Skeleton className="h-7 w-20 rounded-[6px]" /></div>
            </div>
          ))}
        </section>
      </div>
    </SkeletonStatus>
  );
}

export function EventsTableSkeleton() {
  return (
    <SkeletonStatus label="Loading events">
      <div className="overflow-hidden rounded-[10px] border border-[#e2e5ec] bg-white">
        <div className="grid min-w-[860px] grid-cols-[38%_18%_18%_10%_16%] bg-[#f9fbfc] px-4 py-3">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-3 w-16" />
          ))}
        </div>
        {Array.from({ length: 7 }, (_, index) => (
          <div
            key={index}
            className="grid min-w-[860px] grid-cols-[38%_18%_18%_10%_16%] items-center border-t border-[#f0f1f3] px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-[6px]" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-4 w-24" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-12" />
            <div className="flex justify-end"><Skeleton className="h-8 w-20 rounded-[6px]" /></div>
          </div>
        ))}
      </div>
    </SkeletonStatus>
  );
}

export function ScoringRulesSkeleton() {
  return (
    <SkeletonStatus label="Loading scoring rules">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-[12px] border border-[#e2e5ec] bg-white p-5">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <Skeleton className="h-11 w-11 shrink-0 rounded-[8px]" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-36 max-w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-7 w-7 rounded-[6px]" />
            </div>
            <Skeleton className="mb-4 h-4 w-full" />
            <Skeleton className="mb-2 h-4 w-4/5" />
            <div className="mt-5 flex gap-2 border-t border-[#f0f1f3] pt-4">
              <Skeleton className="h-8 flex-1 rounded-[6px]" />
              <Skeleton className="h-8 flex-1 rounded-[6px]" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonStatus>
  );
}

export function TeamsTableSkeleton() {
  return (
    <SkeletonStatus label="Loading teams">
      <div className="h-full min-h-0 overflow-hidden rounded-[10px] border border-[#e2e5ec] bg-white">
        <div className="grid grid-cols-[minmax(250px,2fr)_1fr_1.3fr_1.2fr_1fr_100px] items-center bg-[#f9fbfc] px-6 py-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-3 w-16" />
          ))}
        </div>
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="grid grid-cols-[minmax(250px,2fr)_1fr_1.3fr_1.2fr_1fr_100px] items-center border-t border-[#f0f1f3] px-6 py-3.5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <div className="flex justify-end gap-1">
              <Skeleton className="h-8 w-8 rounded-[6px]" />
              <Skeleton className="h-8 w-8 rounded-[6px]" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonStatus>
  );
}
