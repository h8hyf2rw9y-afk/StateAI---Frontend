import { AlertCircle } from "lucide-react";

/** Shared error banner — originally for the login/register forms, also reused by the AI panels (features/ai/components/). Renders nothing when there's no message. */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
