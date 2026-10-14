import { type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";

type ComingSoonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  icon?: ReactNode;
  actionLabel?: string;
};

export function ComingSoonDialog({
  open,
  onOpenChange,
  title = "Coming soon",
  description = "This feature is being prepared and will be available soon.",
  icon,
  actionLabel = "Got it",
}: ComingSoonDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex w-full max-w-[380px] flex-col gap-0 overflow-hidden rounded-[14px] border border-[#e2e5ec] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.12)]">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="border-b border-[#f0f1f3] px-6 py-4">
          <div className="mb-3 grid h-10 w-10 place-items-center rounded-[8px] bg-[#f7f8fb] text-[#000000]">
            {icon || <Sparkles className="h-5 w-5" />}
          </div>
          <h2 className="text-[18px] font-semibold text-[#000000]">{title}</h2>
          <DialogDescription className="mt-1 text-[13px] leading-5 text-[#666666]">
            {description}
          </DialogDescription>
        </div>
        <div className="flex justify-end px-6 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-8 cursor-pointer rounded-[6px] bg-[#000000] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#333]"
          >
            {actionLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
