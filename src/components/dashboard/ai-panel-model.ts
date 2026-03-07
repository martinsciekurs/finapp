import {
  aiChatMessageSchema,
  aiTransactionDraftSchema,
  type AiChatMessage,
  type AiTransactionDraft,
} from "@/lib/validations/ai";

export interface AiPanelMessage extends AiChatMessage {
  draft: AiTransactionDraft | null;
  draftStatus: "pending" | "confirmed" | null;
}

export const AI_CHAT_STORAGE_KEY = "dashboard.aiPanel.messages";
export const MAX_STORED_MESSAGES = 40;

export const STARTER_MESSAGE: AiPanelMessage = {
  role: "assistant",
  content:
    "Hi! Ask about budgeting, saving ideas, or tell me to add a transaction in natural language.",
  draft: null,
  draftStatus: null,
};

export function parseStoredMessage(raw: unknown): AiPanelMessage | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as Record<string, unknown>;
  const parsedMessage = aiChatMessageSchema.safeParse({
    role: candidate.role,
    content: candidate.content,
  });

  if (!parsedMessage.success) {
    return null;
  }

  let draft: AiTransactionDraft | null = null;
  if (candidate.draft !== undefined && candidate.draft !== null) {
    const parsedDraft = aiTransactionDraftSchema.safeParse(candidate.draft);
    if (parsedDraft.success) {
      draft = parsedDraft.data;
    }
  }

  const draftStatus =
    candidate.draftStatus === "pending" || candidate.draftStatus === "confirmed"
      ? candidate.draftStatus
      : null;

  return {
    role: parsedMessage.data.role,
    content: parsedMessage.data.content,
    draft,
    draftStatus,
  };
}

export function restoreStoredMessages(stored: string | null): AiPanelMessage[] {
  if (!stored) {
    return [STARTER_MESSAGE];
  }

  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) {
      return [STARTER_MESSAGE];
    }

    const restoredMessages = parsed
      .map((item) => parseStoredMessage(item))
      .filter((item): item is AiPanelMessage => item !== null)
      .slice(-MAX_STORED_MESSAGES);

    return restoredMessages.length > 0 ? restoredMessages : [STARTER_MESSAGE];
  } catch {
    return [STARTER_MESSAGE];
  }
}

export function getLatestPendingDraftIndex(messages: AiPanelMessage[]): number | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (
      message?.role === "assistant" &&
      message.draft &&
      message.draftStatus === "pending"
    ) {
      return index;
    }
  }

  return null;
}

export function getDraftFromMessages(
  messages: AiPanelMessage[]
): AiTransactionDraft | undefined {
  const latestPendingDraftIndex = getLatestPendingDraftIndex(messages);
  return latestPendingDraftIndex !== null
    ? messages[latestPendingDraftIndex]?.draft ?? undefined
    : undefined;
}

export function isAffirmativeConfirmation(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return [
    "yes",
    "y",
    "yep",
    "yeah",
    "confirm",
    "save",
    "save it",
    "looks good",
    "ok",
    "okay",
  ].includes(normalized);
}
