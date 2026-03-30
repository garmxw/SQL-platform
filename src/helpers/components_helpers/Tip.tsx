import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TipProps {
  label: string;
  kbd?: string[]; // Optional array of strings for keyboard shortcuts
  side?: "top" | "right" | "bottom" | "left";
  children: React.ReactNode;
}

export function Tip({ label, kbd, side = "bottom", children }: TipProps) {
  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} className="flex items-center gap-2 text-xs">
          <span>{label}</span>
          {kbd && (
            <div className="flex items-center gap-1">
              {" "}
              {/* Replaced KbdGroup if not defined */}
              {kbd.map((k, i) =>
                k === "+" ? (
                  <span key={i} className="text-muted-foreground text-[10px]">
                    +
                  </span>
                ) : (
                  <kbd
                    key={i}
                    className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-sans"
                  >
                    {k}
                  </kbd>
                ),
              )}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
