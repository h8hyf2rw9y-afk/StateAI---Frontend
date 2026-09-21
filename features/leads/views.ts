/**
 * The three top-level views of the Leads page, persisted in the URL as
 * `?view=all|active|renova` so a reload, a shared link and the browser's
 * back/forward buttons all land on the same view.
 *
 *  - all     every real-estate Contact (history included) — the original list.
 *  - active  Contacts with an open Opportunity or a live Buyer Requirement
 *            (computed by GET /contacts?active=true, not here).
 *  - renova  the independent house-flipping module. Same page, separate
 *            domain: Renova cases are not Contacts (see features/renova/).
 */
export const LEADS_VIEWS = ["all", "active", "renova"] as const;
export type LeadsView = (typeof LEADS_VIEWS)[number];

export const DEFAULT_LEADS_VIEW: LeadsView = "all";

export const LEADS_VIEW_LABELS: Record<LeadsView, string> = {
  all: "Todos",
  active: "Clientes activos",
  renova: "Renova",
};

/** Anything missing or unrecognized (`?view=bogus`) falls back to "all" rather than breaking the page. */
export function parseLeadsView(value: string | null | undefined): LeadsView {
  return (LEADS_VIEWS as readonly string[]).includes(value ?? "") ? (value as LeadsView) : DEFAULT_LEADS_VIEW;
}
