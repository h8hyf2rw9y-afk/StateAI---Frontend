import Link from "next/link";
import { Logo } from "@/components/shared/logo";

const PRODUCT_LINKS = [
  { href: "/product", label: "Product" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
];

const ACCOUNT_LINKS = [
  { href: "/login", label: "Log in" },
  { href: "/register", label: "Get started" },
];

/** Shared footer for every app/(marketing)/ page. Deliberately minimal — no newsletter form, no social icon wall, nothing that isn't a real, working link. */
export function MarketingFooter() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 sm:flex-row sm:items-start sm:justify-between lg:px-8">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            An AI-powered operating system for real estate advisors — built around the relationship, not just the transaction.
          </p>
        </div>

        <div className="flex gap-16">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground uppercase">Product</p>
            {PRODUCT_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground uppercase">Account</p>
            {ACCOUNT_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-white/5 px-4 py-4 text-center text-xs text-muted-foreground lg:px-8">
        © {new Date().getFullYear()} State AI. PropPilot is built and run by a real estate advisor.
      </div>
    </footer>
  );
}
