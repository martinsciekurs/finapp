import { expect, test } from "@playwright/test";
import { completeOnboardingViaUI, createTestUser, loginViaUI } from "./helpers";

test.describe("Debts page", () => {
  let testUser: { email: string; password: string; displayName: string };

  test.beforeEach(async ({ page, request }) => {
    testUser = await createTestUser(request);
    await loginViaUI(page, testUser);
    await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 15000 });

    if (page.url().includes("/onboarding")) {
      await completeOnboardingViaUI(page);
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
    }

    await page.goto("/dashboard/debts");
    await expect(page).toHaveURL(/\/dashboard\/debts/);
  });

  test("adds debt, logs payment, and creates linked transaction", async ({ page }) => {
    await page.getByRole("button", { name: "Add Debt" }).click();

    await page.getByLabel("Counterparty").fill("John Doe");
    await page.getByLabel("Amount").fill("120");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Add Debt" })
      .click();

    await expect(page.getByText("John Doe")).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: "Log payment" }).click();
    await page.getByLabel("Payment Amount").fill("120");
    await page.getByRole("button", { name: "Save Payment" }).click();

    await expect(page.getByText("Settled (1)")).toBeVisible({ timeout: 10000 });

    await page.goto("/dashboard/transactions");
    await expect(page.getByText("Payment to John Doe")).toBeVisible({ timeout: 10000 });
  });
});
