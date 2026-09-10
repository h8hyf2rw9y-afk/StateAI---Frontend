"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
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
    <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-background px-4 lg:px-6">
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

      <div className="flex-1" />

      <NotificationBell />
      <UserMenu />
    </header>
  );
}
