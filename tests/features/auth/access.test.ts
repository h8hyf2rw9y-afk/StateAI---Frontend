import { describe, expect, it } from "vitest";
import { canManageTeam, homePathFor, isPathAllowed, isRenovaOnly } from "@/features/auth/access";
import { navItemsFor } from "@/components/navigation/nav-config";

describe("access rules", () => {
  it("keeps a Renova-only advisor inside Leads → Renova and Settings", () => {
    for (const path of ["/leads", "/leads/renova/case-1", "/settings"]) {
      expect(isPathAllowed("renova_agent", path)).toBe(true);
    }
    for (const path of ["/dashboard", "/leads/contact-1", "/pipeline", "/tasks", "/ai-assistant", "/admin", "/properties/p1"]) {
      expect(isPathAllowed("renova_agent", path)).toBe(false);
    }
    expect(homePathFor("renova_agent")).toBe("/leads?view=renova");
  });

  it("lets only owners and admins open Administración", () => {
    expect(isPathAllowed("owner", "/admin")).toBe(true);
    expect(isPathAllowed("admin", "/admin")).toBe(true);
    expect(isPathAllowed("agent", "/admin")).toBe(false);
    expect(isPathAllowed("agent", "/dashboard")).toBe(true);
    expect(canManageTeam("owner")).toBe(true);
    expect(canManageTeam("renova_agent")).toBe(false);
    expect(isRenovaOnly("agent")).toBe(false);
  });

  it("builds the menu per role", () => {
    expect(navItemsFor(undefined)).toEqual([]);
    expect(navItemsFor("renova_agent").map((item) => item.href)).toEqual(["/leads?view=renova", "/settings"]);
    expect(navItemsFor("owner").map((item) => item.href)).toContain("/admin");
    expect(navItemsFor("agent").map((item) => item.href)).not.toContain("/admin");
    expect(navItemsFor("agent").map((item) => item.href)).toContain("/dashboard");
  });
});
