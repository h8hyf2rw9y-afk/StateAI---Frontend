"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, Sparkles } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { navItemsFor } from "@/components/navigation/nav-config";
import { isRenovaOnly } from "@/features/auth/access";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { NavLink } from "@/components/navigation/nav-link";
import { Logo } from "@/components/shared/logo";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationBell } from "@/components/layout/notification-bell";

/** Slim topbar: mobile nav trigger on small screens, user menu on the right. Page titles live in each page via PageHeader, not here. */
export function AppHeader() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { me } = useCurrentUser();
  // A Renova-only advisor has no CRM notifications and no access to the AI
  // assistant (the backend refuses both), so neither is offered.
  const showCrmExtras = me !== null && !isRenovaOnly(me.role);

  return (
    <header className="relative z-20 flex h-[4.5rem] shrink-0 items-center gap-4 border-b border-border/60 bg-background/62 px-4 backdrop-blur-2xl lg:px-7">
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu className="size-5" />
        </Button>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="h-16 justify-center border-b px-5">
            <SheetTitle className="sr-only">Navigation menu</SheetTitle>
            <Logo showParentBrand={false} />
          </SheetHeader>
          <nav className="flex flex-col gap-1 p-3">
            {navItemsFor(me?.role).map((item) => (
              <NavLink
                key={item.href}
                item={item}
                onNavigate={() => setMobileNavOpen(false)}
              />
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      <div className="hidden items-center gap-2.5 text-xs text-muted-foreground md:flex">
        <span className="relative flex size-2 items-center justify-center">
          <span className="absolute size-2 rounded-full bg-emerald-400/30 blur-[2px]" />
          <span className="relative size-1.5 rounded-full bg-emerald-400" />
        </span>
        Centro operativo
      </div>

      <div className="flex-1" />

      {showCrmExtras && (
        <Link
          href="/ai-assistant"
          className={buttonVariants({
            variant: "ghost",
            className: "hidden h-9 gap-2 rounded-xl border border-primary/15 bg-primary/[0.045] px-3 text-muted-foreground hover:border-primary/25 hover:bg-primary/[0.08] hover:text-foreground md:inline-flex",
          })}
        >
          <Sparkles className="size-3.5 text-primary" />
          Preguntar a State AI
          <ArrowUpRight className="ml-2 size-3.5" />
        </Link>
      )}

      {showCrmExtras && <NotificationBell />}
      <UserMenu />
    </header>
  );
}
