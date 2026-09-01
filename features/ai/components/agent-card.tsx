import { BrainCircuit, MessageCircleMore, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AiAgent } from "@/features/ai/types";

const ICONS: Record<AiAgent["icon"], LucideIcon> = {
  BrainCircuit,
  MessageCircleMore,
  Sparkles,
};

export function AgentCard({ agent }: { agent: AiAgent }) {
  const Icon = ICONS[agent.icon];

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <Badge variant="secondary">
            {agent.status === "available" ? "Available" : "Coming soon"}
          </Badge>
        </div>
        <div>
          <p className="font-medium">{agent.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{agent.description}</p>
        </div>
        <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          {agent.capabilities.map((capability) => (
            <li key={capability} className="flex items-start gap-2">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground" />
              {capability}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
