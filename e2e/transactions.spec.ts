import { test, expect } from "@playwright/test";
import {
  createTestUser,
  loginViaUI,
  completeOnboardingViaUI,
} from "./helpers";

// ────────────────────────────────────────────
// Transaction CRUD E2E Tests
// ────────────────────────────────────────────

test.describe("Transactions page", () => {
  let testUser: { email: string; password: string; displayName: string };

  test.beforeAll(async ({ request }) => {
    testUser = await createTestUser(request);
  });

  test.beforeEach(async ({ page }) => {
    // Login and complete onboarding if needed
    await loginViaUI(page, testUser);

    // May redirect to onboarding or dashboard
    const url = page.url();
    if (url.includes("/onboarding")) {
      await completeOnboardingViaUI(page);
      await expect(page).toHaveURL(/\/dashboard/);
    }

    // Navigate to transactions page
    await page.goto("/dashboard/transactions");
    await expect(page).toHaveURL(/\/dashboard\/transactions/);
  });

  test("displays the transactions page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Transactions" })
    ).toBeVisible();
    await expect(
      page.getByText("Track your expenses and income.")
    ).toBeVisible();
  });

  test("shows the inline add form with type toggle", async ({ page }) => {
    // Type toggle buttons
    await expect(page.getByRole("radio", { name: "Expense" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Income" })).toBeVisible();

    // Form fields
    await expect(page.getByLabel("Amount")).toBeVisible();
    await expect(page.getByLabel("Description")).toBeVisible();
    await expect(page.getByLabel("Date")).toBeVisible();

    // Submit button
    await expect(
      page.getByRole("button", { name: /add expense/i })
    ).toBeVisible();
  });

  test("shows empty state when no transactions exist", async ({ page }) => {
    await expect(
      page.getByText("No transactions yet")
    ).toBeVisible();
  });

  test("adds an expense transaction", async ({ page }) => {
    // Fill amount
    await page.getByLabel("Amount").fill("25.50");

    // Select a category
    await page.getByRole("combobox").click();
    // Pick the first available expense category
    const firstOption = page.getByRole("option").first();
    await firstOption.click();

    // Fill description
    await page.getByLabel("Description").fill("Test grocery purchase");

    // Submit
    await page.getByRole("button", { name: /add expense/i }).click();

    // Wait for the transaction to appear in the list
    await expect(page.getByText("Test grocery purchase")).toBeVisible({
      timeout: 10000,
    });
  });

  test("adds an income transaction", async ({ page }) => {
    // Switch to income type
    await page.getByRole("radio", { name: "Income" }).click();

    // Submit button should change
    await expect(
      page.getByRole("button", { name: /add income/i })
    ).toBeVisible();

    // Fill amount
    await page.getByLabel("Amount").fill("3200");

    // Select a category
    await page.getByRole("combobox").click();
    const firstOption = page.getByRole("option").first();
    await firstOption.click();

    // Fill description
    await page.getByLabel("Description").fill("Monthly salary payment");

    // Submit
    await page.getByRole("button", { name: /add income/i }).click();

    // Wait for the transaction to appear
    await expect(page.getByText("Monthly salary payment")).toBeVisible({
      timeout: 10000,
    });
  });

  test("filters transactions by type", async ({ page }) => {
    // First add both an expense and income so we have data to filter
    // Add expense
    await page.getByLabel("Amount").fill("10");
    await page.getByRole("combobox").click();
    await page.getByRole("option").first().click();
    await page.getByLabel("Description").fill("Filter test expense");
    await page.getByRole("button", { name: /add expense/i }).click();
    await expect(page.getByText("Filter test expense")).toBeVisible({
      timeout: 10000,
    });

    // Add income
    await page.getByRole("radio", { name: "Income" }).click();
    await page.getByLabel("Amount").fill("20");
    await page.getByRole("combobox").click();
    await page.getByRole("option").first().click();
    await page.getByLabel("Description").fill("Filter test income");
    await page.getByRole("button", { name: /add income/i }).click();
    await expect(page.getByText("Filter test income")).toBeVisible({
      timeout: 10000,
    });

    // Filter to expense only
    await page.getByRole("button", { name: "expense" }).click();
    await expect(page.getByText("Filter test expense")).toBeVisible();
    await expect(
      page.getByText("Filter test income")
    ).not.toBeVisible();

    // Filter to income only
    await page.getByRole("button", { name: "income" }).click();
    await expect(page.getByText("Filter test income")).toBeVisible();
    await expect(
      page.getByText("Filter test expense")
    ).not.toBeVisible();

    // Show all
    await page.getByRole("button", { name: "all" }).click();
    await expect(page.getByText("Filter test expense")).toBeVisible();
    await expect(page.getByText("Filter test income")).toBeVisible();
  });

  test("deletes a transaction", async ({ page }) => {
    // Add a transaction first
    await page.getByLabel("Amount").fill("5.00");
    await page.getByRole("combobox").click();
    await page.getByRole("option").first().click();
    await page.getByLabel("Description").fill("To be deleted");
    await page.getByRole("button", { name: /add expense/i }).click();
    await expect(page.getByText("To be deleted")).toBeVisible({
      timeout: 10000,
    });

    // Hover to reveal delete button and click it
    const transactionRow = page.getByText("To be deleted").locator("../..");
    await transactionRow.hover();
    await transactionRow
      .getByRole("button", { name: /delete transaction/i })
      .click();

    // Transaction should disappear
    await expect(page.getByText("To be deleted")).not.toBeVisible({
      timeout: 10000,
    });
  });

  test("shows validation error for empty amount", async ({ page }) => {
    // Try to submit without filling amount
    await page.getByRole("button", { name: /add expense/i }).click();

    // Should show validation error
    await expect(
      page.getByText(/amount must be positive/i)
    ).toBeVisible();
  });
});
