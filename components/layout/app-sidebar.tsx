import { NAV_ITEMS } from "@/components/navigation/nav-config";
import { NavLink } from "@/components/navigation/nav-link";
import { Logo } from "@/components/shared/logo";
import { Sparkles } from "lucide-react";
import Link from "next/link";

const GROUPS = [
  { id: "workspace", label: "Operación" },
  { id: "organize", label: "Organización" },
  { id: "system", label: "Inteligencia" },
] as const;

/** Persistent desktop navigation rail. Hidden below the `lg` breakpoint in favor of the mobile sheet (see app-header.tsx). */
export function AppSidebar() {
  return (
    <aside className="relative hidden w-56 shrink-0 flex-col border-r border-sidebar-border/60 bg-sidebar/90 text-sidebar-foreground backdrop-blur-2xl lg:flex xl:w-60">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-[radial-gradient(circle_at_35%_0%,oklch(0.62_0.16_285/0.12),transparent_70%)]" />
      <div className="relative flex h-[4.5rem] items-center px-5">
        <Logo />
      </div>
      <nav className="quiet-scrollbar relative flex flex-1 flex-col gap-6 overflow-y-auto px-3 pb-3 pt-3">
        {GROUPS.map((group) => (
          <div key={group.id} className="space-y-1">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/55">
              {group.label}
            </p>
            {NAV_ITEMS.filter((item) => item.group === group.id).map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        ))}
      </nav>
      <div className="surface-panel m-3 rounded-2xl border border-primary/15 p-3.5">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-foreground">
          <span className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-3.5" aria-hidden="true" />
          </span>
          State AI activo
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">Decisiones, seguimiento y contexto en un solo lugar.</p>
        <Link href="/ai-assistant" className="mt-3 inline-flex text-[11px] font-medium text-primary hover:text-primary/80">
          Abrir asistente →
        </Link>
      </div>
    </aside>
  );
}
