import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";

/** Composes the sidebar + topbar shell around every authenticated route. Used only by app/(dashboard)/layout.tsx. */
export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-dvh overflow-hidden bg-background">
      <div className="pointer-events-none absolute left-[18%] top-[-18rem] size-[38rem] rounded-full bg-primary/[0.045] blur-[120px]" aria-hidden="true" />
      <AppSidebar />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="workspace-grid pointer-events-none absolute inset-0 opacity-30" aria-hidden="true" />
        <AppHeader />
        <main className="quiet-scrollbar relative flex-1 overflow-y-auto">
          <div className="animate-enter mx-auto w-full max-w-[1580px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7 xl:px-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
