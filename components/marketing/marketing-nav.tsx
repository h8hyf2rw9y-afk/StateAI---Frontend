"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Logo } from "@/components/shared/logo";
import { useUser } from "@/hooks/useUser";

const LINKS = [
  { href: "/product", label: "Product" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
];

/**
 * The public site's persistent header — sticky, translucent over content
 * (Apple-style), reused across every route in app/(marketing)/. A Client
 * Component (unlike the rest of these largely-static pages) for two
 * reasons: the mobile nav sheet needs open/close state, and the primary CTA
 * needs to know whether a visitor is already signed in.
 *
 * `useUser()` (hooks/useUser.ts) is the same reactive session hook the CRM
 * itself already uses for the user menu — reused as-is, not reimplemented.
 * It does not gate access to anything here (proxy.ts still owns that); it
 * only decides whether this header offers "Log in / Get Started" or "Go to
 * Dashboard" — a returning, already-signed-in visitor landing on the
 * marketing site (e.g. from a bookmark) shouldn't be told to sign up again.
 */
export function MarketingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, isLoading } = useUser();

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 lg:px-8">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex-1 md:hidden" />

        <div className="hidden items-center gap-2 md:flex">
          {!isLoading && isAuthenticated ? (
            <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Log in
              </Link>
              <Link href="/register" className={buttonVariants({ size: "sm" })}>
                Get Started
              </Link>
            </>
          )}
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="size-5" />
          </Button>
          <SheetContent side="right" className="w-72 p-0">
            <SheetHeader className="h-16 justify-center border-b px-5">
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <Logo />
            </SheetHeader>
            <nav className="flex flex-col gap-1 p-3">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-2 border-t p-3">
              {!isLoading && isAuthenticated ? (
                <Link href="/dashboard" className={buttonVariants()} onClick={() => setMobileOpen(false)}>
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className={buttonVariants({ variant: "outline" })}
                    onClick={() => setMobileOpen(false)}
                  >
                    Log in
                  </Link>
                  <Link href="/register" className={buttonVariants()} onClick={() => setMobileOpen(false)}>
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
