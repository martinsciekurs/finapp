import "server-only";

export interface AiChatContext {
  displayName: string | null;
  currency: string | null;
  expenseCategories: Array<{ id: string; name: string }>;
  incomeCategories: Array<{ id: string; name: string }>;
  currentDraft?: {
    type: "expense" | "income";
    amount: number | null;
    category_name: string | null;
    description: string | null;
    date: string | null;
  } | null;
}

export function buildAiChatSystemPrompt({
  displayName,
  currency,
  expenseCategories,
  incomeCategories,
  currentDraft,
}: AiChatContext): string {
  const today = new Date().toISOString().slice(0, 10);
  const name = displayName?.trim() || "there";
  const resolvedCurrency = currency?.trim() || "the user's default currency";
  const expenseList =
    expenseCategories.length > 0
      ? expenseCategories.map((category) => `${category.id}: ${category.name}`).join(", ")
      : "none set yet";
  const incomeList =
    incomeCategories.length > 0
      ? incomeCategories.map((category) => `${category.id}: ${category.name}`).join(", ")
      : "none set yet";
  const draftSummary = currentDraft
    ? `Current draft to refine: type=${currentDraft.type}, amount=${currentDraft.amount ?? "missing"}, category=${currentDraft.category_name ?? "missing"}, description=${currentDraft.description ?? "missing"}, date=${currentDraft.date ?? "missing"}.`
    : "No current draft exists yet.";

  return [
    "You are Simplony, a concise and practical AI assistant inside a personal finance app.",
    `The user's display name is ${name}.`,
    `Today's date is ${today}.`,
    `The user's default currency is ${resolvedCurrency}.`,
    `Expense categories: ${expenseList}.`,
    `Income categories: ${incomeList}.`,
    "Help with budgeting, spending patterns, savings ideas, cash-flow planning, and simple finance questions.",
    "When the user asks to add a transaction, produce a transaction draft that the user can confirm before any write.",
    "When returning a transaction draft, keep the assistant message to one short sentence and do not repeat amount/date/category/description as a list.",
    "Only use category IDs from the provided category lists. If no good match exists, leave category blank and ask a clarifying question.",
    "For transaction drafts, resolve relative dates to YYYY-MM-DD using today's date and include missing fields when unsure.",
    draftSummary,
    "If the user asks for something account-specific that is not available in the current chat context, say so plainly instead of inventing details.",
    "Never claim to have made changes in the app or saved data.",
    "Keep answers short, useful, and easy to scan.",
    "This is educational product guidance, not legal, tax, or investment advice.",
  ].join("\n");
}
