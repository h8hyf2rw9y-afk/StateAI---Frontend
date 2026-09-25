"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NAV_ITEMS } from "@/components/navigation/nav-config";
import { NavLink } from "@/components/navigation/nav-link";
import { Logo } from "@/components/shared/logo";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationBell } from "@/components/layout/notification-bell";

/** Slim topbar: mobile nav trigger on small screens, user menu on the right. Page titles live in each page via PageHeader, not here. */
export function AppHeader() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <header className="relative z-20 flex h-16 shrink-0 items-center gap-4 border-b border-border/70 bg-background/70 px-4 backdrop-blur-xl lg:px-6">
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
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                onNavigate={() => setMobileNavOpen(false)}
              />
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
        <span className="size-1.5 rounded-full bg-primary" />
        State AI workspace
      </div>

      <div className="flex-1" />

      <Button variant="ghost" className="hidden h-9 gap-2 border border-border/70 bg-background/50 px-3 text-muted-foreground hover:text-foreground md:inline-flex" render={<Link href="/ai-assistant" />}>
        <Sparkles className="size-3.5 text-primary" />
        Ask State AI
        <ArrowUpRight className="ml-2 size-3.5" />
      </Button>

      <NotificationBell />
      <UserMenu />
    </header>
  );
}
