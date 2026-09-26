"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, Loader2, MessageSquarePlus, Send, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  askRenovaChat,
  createRenovaChatConversation,
  getRenovaChatConversations,
  getRenovaChatMessages,
} from "@/lib/api/renova-chat";
import type { RenovaChatConversation, RenovaChatMessage } from "@/features/ai/renova-chat-types";

const SUGGESTIONS = [
  "¿Cuántos leads activos tengo?",
  "Muéstrame el pipeline de Renova",
  "¿Cuál es la deuda total de Juan Carlos?",
  "¿Cuál es la dirección de Juan Carlos?",
];

type LoadState = "loading" | "ready" | "error";

export function RenovaChatWorkspace() {
  const [conversations, setConversations] = useState<RenovaChatConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<RenovaChatMessage[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadedConversationId, setLoadedConversationId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    getRenovaChatConversations().then((response) => {
      if (cancelled) return;
      if (!response.ok) {
        setError(getApiErrorMessage(response.error));
        setLoadState("error");
        return;
      }
      setConversations(response.data);
      setSelectedId(response.data[0]?.id ?? null);
      setLoadState("ready");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedId || loadedConversationId === selectedId) return;
    let cancelled = false;
    getRenovaChatMessages(selectedId).then((response) => {
      if (cancelled) return;
      if (!response.ok) {
        setError(getApiErrorMessage(response.error));
        setLoadedConversationId(selectedId);
        return;
      }
      setMessages(response.data);
      setLoadedConversationId(selectedId);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId, loadedConversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages, sending]);

  function startNewConversation() {
    setSelectedId(null);
    setLoadedConversationId(null);
    setMessages([]);
    setInput("");
    setError(null);
  }

  async function ensureConversation(): Promise<string | null> {
    if (selectedId) return selectedId;
    const response = await createRenovaChatConversation();
    if (!response.ok) {
      setError(getApiErrorMessage(response.error));
      return null;
    }
    setConversations((current) => [response.data, ...current]);
    setSelectedId(response.data.id);
    setLoadedConversationId(response.data.id);
    return response.data.id;
  }

  async function submit(content: string) {
    const question = content.trim();
    if (!question || sending) return;
    setSending(true);
    setError(null);
    setInput("");

    const conversationId = await ensureConversation();
    if (!conversationId) {
      setSending(false);
      setInput(question);
      return;
    }

    const optimistic: RenovaChatMessage = {
      id: `pending-${crypto.randomUUID()}`,
      conversation_id: conversationId,
      role: "user",
      content: question,
      intent: null,
      referenced_case_id: null,
      created_at: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimistic]);

    const response = await askRenovaChat(conversationId, question);
    setSending(false);
    if (!response.ok) {
      setMessages((current) => current.filter((message) => message.id !== optimistic.id));
      setInput(question);
      setError(getApiErrorMessage(response.error));
      return;
    }

    setMessages((current) => [
      ...current.filter((message) => message.id !== optimistic.id),
      response.data.user_message,
      response.data.assistant_message,
    ]);
    setLoadedConversationId(conversationId);
    setConversations((current) => [
      response.data.conversation,
      ...current.filter((conversation) => conversation.id !== response.data.conversation.id),
    ]);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(input);
  }

  const messagesLoading = selectedId !== null && loadedConversationId !== selectedId;
  const isEmpty = !messagesLoading && messages.length === 0;

  return (
    <div className="overflow-hidden rounded-3xl border border-border/70 bg-card/75 shadow-[0_24px_80px_-48px_rgba(124,58,237,0.45)] backdrop-blur-xl">
      <div className="grid min-h-[690px] md:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b border-border/70 bg-muted/20 p-3 md:border-r md:border-b-0">
          <Button className="w-full justify-start gap-2" onClick={startNewConversation}>
            <MessageSquarePlus className="size-4" />
            Nueva conversación
          </Button>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 md:max-h-[610px] md:flex-col md:overflow-y-auto">
            {loadState === "loading" && (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Cargando…
              </div>
            )}
            {loadState === "ready" && conversations.length === 0 && (
              <p className="px-3 py-3 text-xs leading-relaxed text-muted-foreground">
                Tus conversaciones sobre Renova aparecerán aquí.
              </p>
            )}
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => {
                  setError(null);
                  setSelectedId(conversation.id);
                }}
                className={cn(
                  "min-w-52 rounded-xl px-3 py-2.5 text-left text-sm transition-colors md:min-w-0",
                  selectedId === conversation.id
                    ? "bg-primary/12 text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <span className="block truncate font-medium">{conversation.title}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-h-[620px] min-w-0 flex-col">
          <header className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <Sparkles className="size-4" />
                </span>
                <div>
                  <h2 className="font-semibold">Renova Assistant</h2>
                  <p className="text-xs text-muted-foreground">Consultas de expedientes y pipeline</p>
                </div>
              </div>
            </div>
            <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-2.5 py-1 text-[11px] text-emerald-600 sm:flex dark:text-emerald-300">
              <ShieldCheck className="size-3.5" /> Solo lectura
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-8">
            {messagesLoading && (
              <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Cargando conversación…
              </div>
            )}

            {isEmpty && (
              <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
                <span className="mb-5 flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[0_0_30px_rgba(124,58,237,0.16)]">
                  <Bot className="size-7" />
                </span>
                <h3 className="text-xl font-semibold tracking-tight">Pregunta sobre tus leads de Renova</h3>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
                  Consulta cantidades, etapas, adeudos, teléfonos, direcciones y datos registrados de un propietario.
                </p>
                <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void submit(suggestion)}
                      className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-left text-sm transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/[0.04]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!messagesLoading && messages.length > 0 && (
              <div className="mx-auto flex max-w-3xl flex-col gap-5">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[86%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed",
                        message.role === "user"
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md border border-border/70 bg-muted/45 text-foreground"
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-border/70 bg-muted/45 px-4 py-3 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" /> Consultando Renova…
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <div className="border-t border-border/60 bg-background/40 p-4 sm:px-8">
            {error && <p role="alert" className="mx-auto mb-2 max-w-3xl text-sm text-destructive">{error}</p>}
            <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-border bg-background p-2 shadow-sm focus-within:border-primary/45">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    if (input.trim()) void submit(input);
                  }
                }}
                placeholder="Pregunta por tus leads de Renova…"
                className="max-h-36 min-h-11 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                disabled={sending}
                maxLength={2000}
                aria-label="Pregunta para Renova Assistant"
              />
              <Button type="submit" size="icon" disabled={sending || !input.trim()} aria-label="Enviar pregunta">
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </form>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              El asistente puede equivocarse al interpretar nombres. Verifica el expediente antes de tomar decisiones.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
