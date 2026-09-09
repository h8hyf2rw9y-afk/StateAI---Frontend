import { Badge } from "@/components/ui/badge";
import { formatPropertyStatus, getPropertyStatusBadgeClassName } from "@/features/properties/types";
import { cn } from "@/lib/utils";

/** `status` is the backend's real soft-enum string (draft/active/under_offer/reserved/sold/rented/inactive) — see features/properties/types.ts. */
export function PropertyStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", getPropertyStatusBadgeClassName(status), className)}>
      {formatPropertyStatus(status)}
    </Badge>
  );
}
