import { Badge } from "@/components/ui/badge";
import { PROPERTY_STATUS_LABELS, type PropertyStatus } from "@/features/properties/types";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<PropertyStatus, string> = {
  available: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  under_offer: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  sold: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
  off_market: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

export function PropertyStatusBadge({ status, className }: { status: PropertyStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", STATUS_STYLES[status], className)}>
      {PROPERTY_STATUS_LABELS[status]}
    </Badge>
  );
}
