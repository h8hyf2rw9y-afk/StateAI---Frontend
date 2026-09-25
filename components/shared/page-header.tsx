import type { ReactNode } from "react";

/** Standard title/description/actions row used at the top of every dashboard page. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="mb-3 flex items-center gap-2" aria-hidden="true">
          <span className="h-px w-6 bg-primary/70" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">Live workspace</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-[2rem]">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
