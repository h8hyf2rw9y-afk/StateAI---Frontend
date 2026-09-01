import { NAV_ITEMS } from "@/components/navigation/nav-config";
import { NavLink } from "@/components/navigation/nav-link";
import { Logo } from "@/components/shared/logo";

/** Persistent desktop navigation rail. Hidden below the `lg` breakpoint in favor of the mobile sheet (see app-header.tsx). */
export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-16 items-center border-b px-5">
        <Logo />
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>
    </aside>
  );
}
