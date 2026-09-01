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
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className={cn("flex flex-col gap-1", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
