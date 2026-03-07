import { describe, expect, it } from "vitest";

import {
  STARTER_MESSAGE,
  getDraftFromMessages,
  getLatestPendingDraftIndex,
  isAffirmativeConfirmation,
  parseStoredMessage,
  restoreStoredMessages,
} from "../ai-panel-model";

describe("ai-panel-model", () => {
  it("restores starter message when storage is empty or invalid", () => {
    expect(restoreStoredMessages(null)).toEqual([STARTER_MESSAGE]);
    expect(restoreStoredMessages("not-json")).toEqual([STARTER_MESSAGE]);
  });

  it("finds the latest pending draft", () => {
    const messages = [
      STARTER_MESSAGE,
      {
        role: "assistant" as const,
        content: "First draft",
        draft: {
          type: "expense" as const,
          amount: 10,
          category_id: "cat-1",
          category_name: "Food",
          description: "Coffee",
          date: "2026-03-07",
          confidence: 0.8,
          missing_fields: [],
          needs_confirmation: true,
        },
        draftStatus: "confirmed" as const,
      },
      {
        role: "assistant" as const,
        content: "Second draft",
        draft: {
          type: "expense" as const,
          amount: 20,
          category_id: "cat-2",
          category_name: "Groceries",
          description: "Milk",
          date: "2026-03-07",
          confidence: 0.9,
          missing_fields: [],
          needs_confirmation: true,
        },
        draftStatus: "pending" as const,
      },
    ];

    expect(getLatestPendingDraftIndex(messages)).toBe(2);
    expect(getDraftFromMessages(messages)?.category_name).toBe("Groceries");
  });

  it("detects affirmative confirmation variants", () => {
    expect(isAffirmativeConfirmation("yes")).toBe(true);
    expect(isAffirmativeConfirmation(" Save it ")).toBe(true);
    expect(isAffirmativeConfirmation("yes!")).toBe(true);
    expect(isAffirmativeConfirmation(" ok. ")).toBe(true);
    expect(isAffirmativeConfirmation("looks good!")).toBe(true);
    expect(isAffirmativeConfirmation("change category")).toBe(false);
  });

  it("drops draft status when the stored draft is invalid", () => {
    const parsed = parseStoredMessage({
      role: "assistant",
      content: "Broken draft",
      draft: { type: "expense", amount: "not-a-number" },
      draftStatus: "pending",
    });

    expect(parsed).toEqual({
      role: "assistant",
      content: "Broken draft",
      draft: null,
      draftStatus: null,
    });
  });
});
