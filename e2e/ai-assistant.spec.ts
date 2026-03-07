import { expect, test } from "@playwright/test";

import {
  createTestUser,
  dismissDevOverlay,
  fetchUserCategories,
  loginAndOpenTransactions,
  openAiAssistant,
} from "./helpers";

test.describe("AI assistant", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(90000);

  let testUser: { email: string; password: string; displayName: string };
  let expenseCategory: { id: string; name: string; type: "expense" | "income" };
  let secondExpenseCategory: { id: string; name: string; type: "expense" | "income" };

  test.beforeEach(async ({ page, request }) => {
    testUser = await createTestUser(request);
    await loginAndOpenTransactions(page, testUser);
    const categories = await fetchUserCategories(request, testUser);
    const expenseCategories = categories.filter((category) => category.type === "expense");
    if (expenseCategories.length === 0) {
      throw new Error("Expected onboarding to create at least one expense category");
    }

    expenseCategory = expenseCategories[0]!;
    secondExpenseCategory = expenseCategories[1] ?? expenseCategories[0]!;
    await dismissDevOverlay(page);
    await openAiAssistant(page);
  });

  test("creates a transaction from an AI draft with mocked response", async ({
    page,
  }) => {
    await page.route("**/api/ai/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: {
            role: "assistant",
            content: "I prepared a draft. Confirm to save, or tell me what to change.",
          },
          draft: {
            type: "expense",
            amount: 25,
            category_id: expenseCategory.id,
            category_name: expenseCategory.name,
            description: "Orlando SeaWorld",
            date: "2026-03-07",
            confidence: 0.92,
            missing_fields: [],
            needs_confirmation: true,
          },
        }),
      });
    });

    await page.getByLabel("Ask AI Assistant").fill("add 25 euro expense for Orlando SeaWorld");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(page.getByText("Draft transaction")).toBeVisible();
    await expect(page.getByText("Orlando SeaWorld", { exact: true })).toHaveCount(1);

    await page.getByRole("button", { name: "Confirm and save" }).click();

    await expect(page.locator('[data-sonner-toast]').getByText("Transaction added")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Orlando SeaWorld", { exact: true })).toHaveCount(2, {
      timeout: 10000,
    });
  });

  test("sends current draft context when user asks for changes", async ({ page }) => {
    const requests: unknown[] = [];

    await page.route("**/api/ai/chat", async (route) => {
      requests.push(route.request().postDataJSON());
      const callIndex = requests.length;

      const body =
        callIndex === 1
          ? {
              message: {
                role: "assistant",
                content: "I prepared a draft. Confirm to save, or tell me what to change.",
              },
              draft: {
                type: "expense",
                amount: 25,
                category_id: expenseCategory.id,
                category_name: expenseCategory.name,
                description: "Orlando SeaWorld",
                date: "2026-03-07",
                confidence: 0.92,
                missing_fields: [],
                needs_confirmation: true,
              },
            }
          : {
              message: {
                role: "assistant",
                content: "I prepared a draft. Confirm to save, or tell me what to change.",
              },
              draft: {
                type: "expense",
                amount: 25,
                category_id: secondExpenseCategory.id,
                category_name: secondExpenseCategory.name,
                description: "Orlando SeaWorld snack",
                date: "2026-03-07",
                confidence: 0.91,
                missing_fields: [],
                needs_confirmation: true,
              },
            };

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });

    await page.getByLabel("Ask AI Assistant").fill("add 25 euro expense for Orlando SeaWorld");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText(expenseCategory.name)).toBeVisible();

    await page.getByLabel("Ask AI Assistant").fill("make that food instead");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(page.getByText("Superseded by a newer draft below.")).toBeVisible();
    await expect(page.getByText("Orlando SeaWorld snack")).toBeVisible();

    await expect.poll(() => requests.length).toBe(2);
    expect(requests[1]).toMatchObject({
      currentDraft: {
        type: "expense",
        amount: 25,
        category_id: expenseCategory.id,
        category_name: expenseCategory.name,
        description: "Orlando SeaWorld",
        date: "2026-03-07",
      },
    });
  });

  test("restores and clears chat history with mocked responses", async ({ page }) => {
    await page.route("**/api/ai/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: {
            role: "assistant",
            content: "Track subscriptions and trim one category this week.",
          },
          draft: null,
        }),
      });
    });

    await page.getByLabel("Ask AI Assistant").fill("help me reduce spending");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(page.getByText("Track subscriptions and trim one category this week.")).toBeVisible();

    await page.reload();
    await dismissDevOverlay(page);
    await expect(page.getByText("Track subscriptions and trim one category this week.")).toBeVisible();

    await page.getByRole("button", { name: "Clear chat history" }).click();
    await expect(
      page.getByText(
        "Hi! Ask about budgeting, saving ideas, or tell me to add a transaction in natural language."
      )
    ).toBeVisible();
    await expect(
      page.getByText("Track subscriptions and trim one category this week.")
    ).not.toBeVisible();
  });
});
