"use client";

import { useDroppable } from "@dnd-kit/core";
import { RenovaPipelineCard } from "@/features/renova/components/renova-pipeline-card";
import { formatRenovaStatus, type RenovaPipelineCase, type RenovaPipelineStageStatus } from "@/features/renova/types";
import { cn } from "@/lib/utils";

/** One Kanban column — a fixed width so six of them scroll horizontally instead of compressing into illegible cards. */
export function RenovaPipelineColumn({
  status,
  cards,
  totalCount,
  currentUserId,
  movingIds,
  onOpen,
  onShare,
  onMove,
  onRequestExit,
}: {
  status: RenovaPipelineStageStatus;
  /** Already filtered for display. */
  cards: RenovaPipelineCase[];
  /** Unfiltered count for this stage, shown next to the filtered count when they differ. */
  totalCount: number;
  currentUserId: string | undefined;
  movingIds: Set<string>;
  onOpen: (caseId: string) => void;
  onShare: (caseId: string) => void;
  onMove: (caseId: string, status: RenovaPipelineStageStatus) => void;
  onRequestExit: (caseId: string, status: "rejected" | "cancelled") => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const filtered = cards.length !== totalCount;

  return (
    <div className="flex w-72 shrink-0 flex-col gap-3 rounded-2xl border border-border/70 bg-background/30 p-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-foreground">{formatRenovaStatus(status)}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {filtered ? `${cards.length}/${totalCount}` : totalCount}
        </span>
      </div>

      <div
        ref={setNodeRef}
        data-testid={`pipeline-column-${status}`}
        className={cn(
          "flex min-h-24 flex-1 flex-col gap-2 rounded-xl p-1 transition-colors",
          isOver && "bg-primary/5 outline-2 outline-dashed outline-primary/40"
        )}
      >
        {cards.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            {totalCount === 0 ? "Sin expedientes" : "Ningún expediente coincide con los filtros"}
          </p>
        ) : (
          cards.map((card) => (
            <RenovaPipelineCard
              key={card.id}
              card={card}
              currentUserId={currentUserId}
              isMoving={movingIds.has(card.id)}
              onOpen={onOpen}
              onShare={onShare}
              onMove={(next) => onMove(card.id, next)}
              onRequestExit={(next) => onRequestExit(card.id, next)}
            />
          ))
        )}
      </div>
    </div>
  );
}
