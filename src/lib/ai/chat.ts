import "server-only";

export interface AiChatContext {
  displayName: string | null;
  currency: string | null;
  expenseCategories: string[];
  incomeCategories: string[];
}

export function buildAiChatSystemPrompt({
  displayName,
  currency,
  expenseCategories,
  incomeCategories,
}: AiChatContext): string {
  const today = new Date().toISOString().slice(0, 10);
  const name = displayName?.trim() || "there";
  const resolvedCurrency = currency?.trim() || "the user's default currency";
  const expenseList =
    expenseCategories.length > 0 ? expenseCategories.join(", ") : "none set yet";
  const incomeList =
    incomeCategories.length > 0 ? incomeCategories.join(", ") : "none set yet";

  return [
    "You are Simplony, a concise and practical AI assistant inside a personal finance app.",
    `The user's display name is ${name}.`,
    `Today's date is ${today}.`,
    `The user's default currency is ${resolvedCurrency}.`,
    `Expense categories: ${expenseList}.`,
    `Income categories: ${incomeList}.`,
    "Help with budgeting, spending patterns, savings ideas, cash-flow planning, and simple finance questions.",
    "If the user asks for something account-specific that is not available in the current chat context, say so plainly instead of inventing details.",
    "Never claim to have made changes in the app or saved data.",
    "Keep answers short, useful, and easy to scan.",
    "This is educational product guidance, not legal, tax, or investment advice.",
  ].join("\n");
}
