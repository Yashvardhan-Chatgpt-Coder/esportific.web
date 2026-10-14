export type ExportProgressController = {
  update: (percent: number) => void;
  complete: () => void;
  dismiss: () => void;
};

export type ExportProgressState = {
  id: number;
  percent: number;
  complete: boolean;
};

const EVENT_NAME = "esportific:export-progress";
let activeExportId = 0;

function publish(state: ExportProgressState | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ExportProgressState | null>(EVENT_NAME, { detail: state }));
}

export async function beginExportProgress(): Promise<ExportProgressController> {
  const id = ++activeExportId;
  publish({ id, percent: 0, complete: false });
  // Give React a frame to show the window before CPU-heavy export work starts.
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

  return {
    update(percent) {
      if (id !== activeExportId) return;
      publish({ id, percent: Math.max(0, Math.min(99, Math.round(percent))), complete: false });
    },
    complete() {
      if (id !== activeExportId) return;
      publish({ id, percent: 100, complete: true });
      window.setTimeout(() => {
        if (id === activeExportId) publish(null);
      }, 1300);
    },
    dismiss() {
      if (id === activeExportId) publish(null);
    },
  };
}

export const exportProgressEventName = EVENT_NAME;
