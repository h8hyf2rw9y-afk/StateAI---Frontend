import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Visual foundation for the future conversational Sales Copilot. It is
 * intentionally inert — no client state, no fake responses — until the
 * backend exposes a real agent endpoint for it to call.
 */
export function AiChatPlaceholder() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="size-6" aria-hidden="true" />
        </span>
        <div>
          <p className="font-medium">Sales Copilot chat is coming soon</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Once connected to the backend, you&apos;ll be able to ask about any lead,
            property, or deal and get an answer grounded in your pipeline.
          </p>
        </div>
        <div className="mt-2 flex w-full max-w-md items-center gap-2">
          <Input placeholder="Ask the Sales Copilot…" disabled />
          <Button disabled>Send</Button>
        </div>
      </CardContent>
    </Card>
  );
}
