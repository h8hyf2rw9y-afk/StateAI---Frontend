import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Show the "by State AI" line under the product name. Off in tight spaces like the mobile sheet header. */
  showParentBrand?: boolean;
}

/**
 * PropPilot is the product; State AI is the company building it. The
 * lockup always leads with the product name — that's what agents use day
 * to day — with the parent brand as a small secondary line.
 */
export function Logo({ className, showParentBrand = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm shadow-primary/30">
        <Sparkles className="size-4" aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-sm font-semibold tracking-tight">PropPilot</span>
        {showParentBrand && (
          <span className="text-[11px] text-muted-foreground">by State AI</span>
        )}
      </span>
    </div>
  );
}
