import { Orbit } from "lucide-react";
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
      <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-primary/25 bg-primary/10 text-primary shadow-[0_0_28px_-8px_var(--primary)]">
        <span className="absolute inset-x-1 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
        <Orbit className="size-[18px]" aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-sm font-semibold tracking-[-0.02em]">PropPilot</span>
        {showParentBrand && (
          <span className="text-[11px] text-muted-foreground">by State AI</span>
        )}
      </span>
    </div>
  );
}
