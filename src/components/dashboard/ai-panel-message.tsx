import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";
import type { AiPanelMessage } from "./ai-panel-model";
import { AiDraftCard } from "./ai-draft-card";

interface AiPanelMessageProps {
  message: AiPanelMessage;
  index: number;
  latestPendingDraftIndex: number | null;
  confirmingDraftIndex: number | null;
  onConfirmDraft: (index: number) => void;
}

export function AiPanelMessageView({
  message,
  index,
  latestPendingDraftIndex,
  confirmingDraftIndex,
  onConfirmDraft,
}: AiPanelMessageProps) {
  return (
    <div
      className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
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

        {message.role === "assistant" && message.draft ? (
          <AiDraftCard
            draft={message.draft}
            draftStatus={message.draftStatus}
            isLatestPending={index === latestPendingDraftIndex}
            isConfirming={confirmingDraftIndex === index}
            onConfirm={() => onConfirmDraft(index)}
          />
        ) : null}
      </div>
    </div>
  );
}
