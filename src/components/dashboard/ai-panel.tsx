"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, Loader2, Sparkles, X } from "lucide-react";
import { usePathname } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { aiInputSchema, type AiChatMessage } from "@/lib/validations/ai";
import { cn } from "@/lib/utils";
import { useAiPanel } from "./ai-panel-provider";

const STARTER_MESSAGE: AiChatMessage = {
  role: "assistant",
  content:
    "Hi! Ask about budgeting, saving ideas, category choices, or how to use Simplony.",
};

export function AiPanel() {
  const { open, close } = useAiPanel();
  const pathname = usePathname();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AiChatMessage[]>([STARTER_MESSAGE]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    const nextMessages = [...messages, nextUserMessage];

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
        body: JSON.stringify({ messages: nextMessages }),
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; message?: AiChatMessage }
        | null;
      const assistantMessage = data?.message;

      if (!response.ok || !assistantMessage) {
        setError(data?.error ?? "Failed to send message");
        return;
      }

      setMessages((current) => [...current, assistantMessage]);
    } catch {
      setError("Failed to send message");
    } finally {
      setIsSubmitting(false);
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

        {/* Messages */}
        <div
          ref={scrollerRef}
          className="flex flex-1 flex-col gap-4 overflow-y-auto bg-muted/15 px-4 py-5"
        >
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl border px-3 py-2 text-sm leading-relaxed shadow-sm",
                  message.role === "user"
                    ? "border-primary/70 bg-primary text-primary-foreground"
                    : "border-border/60 bg-card text-foreground"
                )}
              >
                {message.role === "user" ? (
                  message.content
                ) : (
                  <div className="space-y-2 break-words [overflow-wrap:anywhere] [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-background/70 [&_code]:px-1 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-background/70 [&_pre]:p-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
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
