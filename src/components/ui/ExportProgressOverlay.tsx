import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { exportProgressEventName, type ExportProgressState } from "@/lib/export-progress";

export function ExportProgressOverlay() {
  const [progress, setProgress] = useState<ExportProgressState | null>(null);

  useEffect(() => {
    const handleProgress = (event: Event) => {
      setProgress((event as CustomEvent<ExportProgressState | null>).detail);
    };
    window.addEventListener(exportProgressEventName, handleProgress);
    return () => window.removeEventListener(exportProgressEventName, handleProgress);
  }, []);

  return (
    <AnimatePresence>
      {progress && (
        <motion.div
          key={progress.id}
          role="dialog"
          aria-modal="true"
          aria-label="Export progress"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[120] grid place-items-center bg-black/20 px-4 backdrop-blur-[2px]"
        >
          <motion.div
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[340px] rounded-[12px] border border-[#e5e7eb] bg-white px-5 py-5 shadow-[0_12px_40px_rgba(15,23,42,0.14)]"
          >
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="text-[14px] font-medium text-[#111827]">
                {progress.complete ? "Download started" : "Preparing your download"}
              </p>
              <span className="tabular-nums text-[13px] font-medium text-[#6b7280]">{progress.percent}%</span>
            </div>
            <div
              className="h-[6px] overflow-hidden rounded-full bg-[#edf0f4]"
              role="progressbar"
              aria-label="Export progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.percent}
            >
              <div
                className="h-full rounded-full bg-[#171717] transition-[width] duration-300 ease-out"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
