import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AiTransactionDraft } from "@/lib/validations/ai";

interface AiDraftCardProps {
  draft: AiTransactionDraft;
  draftStatus: "pending" | "confirmed" | null;
  isLatestPending: boolean;
  isConfirming: boolean;
  onConfirm: () => void;
}

export function AiDraftCard({
  draft,
  draftStatus,
  isLatestPending,
  isConfirming,
  onConfirm,
}: AiDraftCardProps) {
  return (
    <div className="mt-3 space-y-2 rounded-lg border border-border/60 bg-background/60 p-3 text-xs">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-foreground">Draft transaction</p>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          {draftStatus === "confirmed" ? "confirmed" : "pending"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
        <span>Type</span>
        <span className="text-foreground">{draft.type}</span>
        <span>Amount</span>
        <span className="text-foreground">{draft.amount === null ? "Missing" : draft.amount}</span>
        <span>Category</span>
        <span className="text-foreground">{draft.category_name ?? "Missing"}</span>
        <span>Date</span>
        <span className="text-foreground">{draft.date ?? "Missing"}</span>
        <span>Description</span>
        <span className="text-foreground">{draft.description ?? "Optional"}</span>
      </div>

      {draft.missing_fields.length > 0 ? (
        <p className="text-destructive">Missing: {draft.missing_fields.join(", ")}</p>
      ) : null}

      {!isLatestPending && draftStatus === "pending" ? (
        <p className="text-muted-foreground">Superseded by a newer draft below.</p>
      ) : (
        <Button
          type="button"
          size="sm"
          className="h-7"
          onClick={onConfirm}
          disabled={
            isConfirming ||
            draftStatus === "confirmed" ||
            draft.amount === null ||
            draft.category_id === null ||
            draft.date === null ||
            !isLatestPending
          }
        >
          {isConfirming ? (
            <>
              <Loader2 className="size-3 animate-spin" />
              Saving...
            </>
          ) : draftStatus === "confirmed" ? (
            "Saved"
          ) : (
            "Confirm and save"
          )}
        </Button>
      )}
    </div>
  );
}
