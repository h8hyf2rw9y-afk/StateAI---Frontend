"use client";

import { useDraggable } from "@dnd-kit/core";
import { AlertTriangle, FolderOpen, GripVertical, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { advisorLabel } from "@/features/renova/lib/errors";
import { formatMoney } from "@/features/renova/lib/money";
import {
  RENOVA_PIPELINE_STAGES,
  formatRenovaDwellingWithDuplex,
  formatRenovaPipelinePropertyTaxDebt,
  formatRenovaPipelineUpdatedAt,
  formatRenovaStatus,
  isRenovaPipelineCaseIncomplete,
  type RenovaPipelineCase,
  type RenovaPipelineStageStatus,
} from "@/features/renova/types";
import { cn } from "@/lib/utils";

/**
 * One card on the Renova Kanban board. Compact by design (per the brief's own
 * example): each money line only renders when its value exists, and "Predial"
 * reads in whichever unit was actually captured (formatRenovaPipelinePropertyTaxDebt
 * already appends "· Importe por confirmar" for a years-only figure).
 *
 * Dragging is confined to the small grip handle, not the whole card — buttons
 * and the "Mover a…" menu stay ordinary clickable controls. That menu is the
 * *required* accessible alternative to drag-and-drop (keyboard, mobile,
 * environments where drag doesn't work), not a fallback bolted on afterward,
 * so it lists every stage plus the two exit statuses on equal footing.
 */
export function RenovaPipelineCard({
  card,
  currentUserId,
  isMoving,
  onOpen,
  onShare,
  onMove,
  onRequestExit,
}: {
  card: RenovaPipelineCase;
  currentUserId: string | undefined;
  isMoving: boolean;
  onOpen: (caseId: string) => void;
  onShare: (caseId: string) => void;
  onMove: (status: RenovaPipelineStageStatus) => void;
  onRequestExit: (status: "rejected" | "cancelled") => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    disabled: isMoving,
  });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  const dwelling = card.dwelling_type || card.is_duplex ? formatRenovaDwellingWithDuplex(card.dwelling_type, card.is_duplex) : null;
  const predial = formatRenovaPipelinePropertyTaxDebt(card);
  const incomplete = isRenovaPipelineCaseIncomplete(card);

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`pipeline-card-${card.id}`}
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-border/70 bg-card/60 p-3 text-sm shadow-sm transition-opacity",
        isDragging && "opacity-40",
        isMoving && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={() => onOpen(card.id)} className="min-w-0 flex-1 text-left">
          <p className="truncate font-medium text-foreground">{card.owner_name}</p>
          {dwelling && <p className="truncate text-xs text-muted-foreground">{dwelling}</p>}
        </button>
        <button
          type="button"
          {...listeners}
          {...attributes}
          aria-label={`Arrastrar expediente de ${card.owner_name} a otra etapa`}
          disabled={isMoving}
          className="shrink-0 cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>
      </div>

      {(card.final_offer || card.market_value || card.other_debt || predial) && (
        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          {card.final_offer && <p>Propuesta: {formatMoney(card.final_offer)}</p>}
          {card.market_value && <p>Valor de mercado: {formatMoney(card.market_value)}</p>}
          {card.other_debt && <p>Saldo de crédito: {formatMoney(card.other_debt)}</p>}
          {predial && <p>{predial}</p>}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>Asesor: {advisorLabel(card.assigned_user_id, currentUserId)}</span>
        <span>Actualizado: {formatRenovaPipelineUpdatedAt(card.updated_at)}</span>
      </div>

      {incomplete && (
        <Badge variant="outline" className="w-fit gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">
          <AlertTriangle className="size-3" aria-hidden="true" />
          Expediente incompleto
        </Badge>
      )}

      <div className="flex items-center gap-1 border-t border-border/60 pt-2">
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Abrir expediente de ${card.owner_name}`} onClick={() => onOpen(card.id)}>
          <FolderOpen />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Ver ficha y compartir de ${card.owner_name}`} onClick={() => onShare(card.id)}>
          <Share2 />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={isMoving}
            render={
              <Button type="button" variant="outline" size="sm" className="ml-auto" aria-label={`Mover expediente de ${card.owner_name} a…`}>
                Mover a…
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            {RENOVA_PIPELINE_STAGES.filter((stage) => stage !== card.status).map((stage) => (
              <DropdownMenuItem key={stage} onClick={() => onMove(stage)}>
                {formatRenovaStatus(stage)}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onRequestExit("rejected")}>
              Rechazado
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => onRequestExit("cancelled")}>
              Cancelado
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
