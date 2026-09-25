/**
 * The two top-level views of the Pipeline page, persisted in the URL as
 * `?view=crm|renova` so a reload, a shared link and the browser's
 * back/forward buttons all land on the same view — same pattern as
 * features/leads/views.ts.
 *
 *  - crm     the traditional real-estate Opportunity pipeline (unchanged).
 *  - renova  the independent house-flipping module's own Kanban board.
 *            Same page, separate domain: a RenovaCase never becomes a
 *            Contact or an Opportunity (see features/renova/).
 */
export const PIPELINE_VIEWS = ["crm", "renova"] as const;
export type PipelineView = (typeof PIPELINE_VIEWS)[number];

export const DEFAULT_PIPELINE_VIEW: PipelineView = "crm";

export const PIPELINE_VIEW_LABELS: Record<PipelineView, string> = {
  crm: "Operaciones inmobiliarias",
  renova: "Renova",
};

/** Anything missing or unrecognized (`?view=bogus`) falls back to "crm" rather than breaking the page. */
export function parsePipelineView(value: string | null | undefined): PipelineView {
  return (PIPELINE_VIEWS as readonly string[]).includes(value ?? "") ? (value as PipelineView) : DEFAULT_PIPELINE_VIEW;
}
