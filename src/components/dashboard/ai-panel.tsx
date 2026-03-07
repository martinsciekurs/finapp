"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, Loader2, Sparkles, Trash2, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

import { createTransaction } from "@/app/dashboard/transactions/actions";
import { Button } from "@/components/ui/button";
import { aiInputSchema, type AiChatMessage, type AiTransactionDraft } from "@/lib/validations/ai";
import { cn } from "@/lib/utils";
import {
  AI_CHAT_STORAGE_KEY,
  MAX_STORED_MESSAGES,
  STARTER_MESSAGE,
  getDraftFromMessages,
  getLatestPendingDraftIndex,
  isAffirmativeConfirmation,
  restoreStoredMessages,
  type AiPanelMessage,
} from "./ai-panel-model";
import { AiPanelMessageView } from "./ai-panel-message";
import { useAiPanel } from "./ai-panel-provider";

export function AiPanel() {
  const { open, close } = useAiPanel();
  const pathname = usePathname();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AiPanelMessage[]>([STARTER_MESSAGE]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmingDraftIndex, setConfirmingDraftIndex] = useState<number | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isConfirmingRef = useRef(false);
  const hasHydratedMessagesRef = useRef(false);

  const latestPendingDraftIndex = getLatestPendingDraftIndex(messages);

  const focusInput = useCallback(() => {
    if (!open || isSubmitting) return;

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [open, isSubmitting]);

  useEffect(() => {
    const container = scrollerRef.current;
    if (!container) return;

    if (typeof container.scrollTo === "function") {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [messages, isSubmitting]);

  useEffect(() => {
    focusInput();
  }, [focusInput, pathname, messages]);

  useEffect(() => {
    if (!hasHydratedMessagesRef.current) {
      return;
    }

    try {
      window.localStorage.setItem(
        AI_CHAT_STORAGE_KEY,
        JSON.stringify(messages.slice(-MAX_STORED_MESSAGES))
      );
    } catch {
    }
  }, [messages]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(AI_CHAT_STORAGE_KEY);
      const restoredMessages = restoreStoredMessages(stored);

      if (restoredMessages.length > 0) {
        setMessages(restoredMessages);
      }
    } catch {
    } finally {
      hasHydratedMessagesRef.current = true;
    }
  }, []);

  function handleClearChat() {
    setMessages([STARTER_MESSAGE]);
    setInput("");
    setError(null);
    setConfirmingDraftIndex(null);
    isConfirmingRef.current = false;

    try {
      window.localStorage.removeItem(AI_CHAT_STORAGE_KEY);
    } catch {
    }
  }

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const parsed = aiInputSchema.safeParse({ text: input });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid message");
      return;
    }

    const nextUserMessage: AiChatMessage = {
      role: "user",
      content: parsed.data.text,
    };

    if (
      latestPendingDraftIndex !== null &&
      isAffirmativeConfirmation(parsed.data.text)
    ) {
      setMessages((current) => [
        ...current,
        {
          ...nextUserMessage,
          draft: null,
          draftStatus: null,
        },
      ]);
      setInput("");
      setError(null);
      await handleConfirmDraft(latestPendingDraftIndex);
      return;
    }

    const nextMessages: AiPanelMessage[] = [
      ...messages,
      {
        ...nextUserMessage,
        draft: null,
        draftStatus: null,
      },
    ];
    const currentDraft = getDraftFromMessages(messages);

    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          currentDraft,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
            message?: AiChatMessage;
            draft?: AiTransactionDraft | null;
          }
        | null;
      const assistantMessage = data?.message;

      if (!response.ok || !assistantMessage) {
        setError(data?.error ?? "Failed to send message");
        return;
      }

      setMessages((current) => [
        ...current,
        {
          ...assistantMessage,
          draft: data?.draft ?? null,
          draftStatus: data?.draft ? "pending" : null,
        },
      ]);
    } catch {
      setError("Failed to send message");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmDraft(index: number) {
    if (isConfirmingRef.current) {
      return;
    }

    const message = messages[index];
    const draft = message?.draft;

    if (!message || !draft) {
      setError("Draft no longer available");
      return;
    }

    if (
      draft.amount === null ||
      draft.category_id === null ||
      draft.date === null ||
      index !== latestPendingDraftIndex
    ) {
      setError("Please resolve missing details in the latest draft first");
      return;
    }

    setConfirmingDraftIndex(index);
    isConfirmingRef.current = true;
    setError(null);

    try {
      const result = await createTransaction({
        category_id: draft.category_id,
        amount: draft.amount,
        type: draft.type,
        description: draft.description ?? "",
        date: draft.date,
        source: "web",
        ai_generated: true,
      });

      if (!result.success) {
        setError(result.error ?? "Failed to create transaction");
        return;
      }

      toast.success("Transaction added");

      setMessages((current) => {
        const next = [...current];
        const target = next[index];
        if (target) {
          next[index] = {
            ...target,
            draftStatus: "confirmed",
          };
        }
        next.push({
          role: "assistant",
          content: "Saved. Want to add another one?",
          draft: null,
          draftStatus: null,
        });
        return next;
      });
    } catch {
      setError("Failed to create transaction");
    } finally {
      setConfirmingDraftIndex(null);
      isConfirmingRef.current = false;
    }
  }

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close AI panel overlay"
          className="fixed inset-0 z-[55] bg-black/30 lg:hidden"
          onClick={close}
        />
      ) : null}

      <aside
        aria-label="AI Assistant"
        aria-hidden={!open}
        className={cn(
          "fixed inset-y-0 right-0 z-[60] w-full max-w-full transform transition-transform duration-200 ease-in-out lg:sticky lg:top-0 lg:z-20 lg:h-dvh lg:shrink-0 lg:overflow-hidden lg:transition-[width]",
          open
            ? "translate-x-0 lg:w-[380px] lg:border-l lg:border-border/50"
            : "translate-x-full lg:w-0 lg:translate-x-0"
        )}
      >
        <div className="ml-auto flex h-dvh w-full flex-col border-l border-border/60 bg-gradient-to-b from-background via-background to-muted/20 shadow-xl sm:max-w-[380px] lg:w-[380px] lg:max-w-none lg:shadow-none">
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Sparkles className="size-4" />
            </span>
            <span className="text-sm font-semibold text-foreground">
              AI Assistant
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground/80 hover:bg-muted/70 hover:text-foreground"
              aria-label="Clear chat history"
              onClick={handleClearChat}
              disabled={isSubmitting || confirmingDraftIndex !== null}
            >
              <Trash2 className="size-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              aria-label="Close AI panel"
              onClick={close}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollerRef}
          className="flex flex-1 flex-col gap-4 overflow-y-auto bg-muted/15 px-4 py-5"
        >
          {messages.map((message, index) => (
            <AiPanelMessageView
              key={`${message.role}-${index}`}
              message={message}
              index={index}
              latestPendingDraftIndex={latestPendingDraftIndex}
              confirmingDraftIndex={confirmingDraftIndex}
              onConfirmDraft={handleConfirmDraft}
            />
          ))}

          {isSubmitting ? (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm">
                <Loader2 className="size-4 animate-spin" />
                Thinking...
              </div>
            </div>
          ) : null}
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-border/60 bg-background/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/85">
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-1.5 shadow-sm transition-colors focus-within:border-primary/40">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  if (error) {
                    setError(null);
                  }
                }}
                placeholder="Ask anything..."
                className="flex-1 bg-transparent py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                aria-label="Ask AI Assistant"
                disabled={isSubmitting}
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon-xs"
                className="shrink-0 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                aria-label="Send message"
                disabled={isSubmitting || !input.trim()}
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowUp className="size-4" />
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between gap-4 text-xs">
              <p className="text-muted-foreground">Keep it short: 100 words max.</p>
              {error ? (
                <p className="text-right text-destructive">{error}</p>
              ) : null}
            </div>
          </form>
        </div>
      </div>
      </aside>
    </>
  );
}
