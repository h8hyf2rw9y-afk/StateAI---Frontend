import type { ReactNode } from "react";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Titled card wrapper used to build the dashboard's section grid (priorities, hot leads, activity, etc.). */
export function SectionCard({
  title,
  action,
  children,
  className,
  contentClassName,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn("surface-panel rounded-2xl border-border/65 shadow-none", className)}>
      <CardHeader className="flex-row items-center justify-between border-b border-border/50 px-5 py-4">
        <CardTitle className="text-sm font-semibold tracking-[-0.01em]">{title}</CardTitle>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className={cn("flex flex-col gap-1 px-5 py-5", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
