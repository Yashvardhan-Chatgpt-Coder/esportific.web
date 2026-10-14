import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type AppPopupWindowProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  portal?: boolean;
};

export function AppPopupWindow({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  bodyClassName,
  headerClassName,
  footerClassName,
  portal = true,
}: AppPopupWindowProps) {
  const titleId = useId();
  const descriptionId = useId();
  const popupRef = useRef<HTMLDivElement>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => {
      // Preserve an input's autoFocus; only focus the dialog when nothing
      // inside it claimed focus during the initial render.
      if (document.activeElement === document.body) popupRef.current?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        onOpenChangeRef.current(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!mounted) return null;

  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onOpenChange(false);
  };

  const popup = (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          onMouseDown={handleBackdropMouseDown}
        >
          <motion.div
            ref={popupRef}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={cn(
              "relative flex max-h-[90vh] w-full max-w-[720px] flex-col gap-0 overflow-hidden rounded-[16px] border border-[#e2e5ec] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.12)] outline-none",
              className,
            )}
            onMouseDown={(event) => event.stopPropagation()}
          >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 z-10 cursor-pointer rounded-[6px] p-1 text-[#9aa1b0] transition-colors hover:bg-[#f7f8fb] hover:text-[#000000] focus:outline-none"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className={cn("border-b border-[#f0f1f3] px-6 py-4", headerClassName)}>
          <h2 id={titleId} className="text-[18px] font-semibold text-[#000000]">
            {title}
          </h2>
          {description ? <p id={descriptionId} className="mt-1 text-[13px] text-[#666666]">{description}</p> : null}
        </div>

        <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>

        {footer ? (
          <div className={cn("flex items-center justify-end gap-3 border-t border-[#f0f1f3] bg-white px-6 py-4", footerClassName)}>
            {footer}
          </div>
        ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return portal ? createPortal(popup, document.body) : popup;
}
