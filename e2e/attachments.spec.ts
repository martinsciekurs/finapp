import { test, expect } from "@playwright/test";
import {
  createTestUser,
  loginViaUI,
  completeOnboardingViaUI,
} from "./helpers";

test.describe("Attachments on transactions", () => {
  test.setTimeout(60_000);
  let testUser: { email: string; password: string; displayName: string };

  test.beforeAll(async ({ request }) => {
    testUser = await createTestUser(request);
  });

  test.beforeEach(async ({ page }) => {
    await loginViaUI(page, testUser);
    await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 30000 });

    if (page.url().includes("/onboarding")) {
      await completeOnboardingViaUI(page);
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
    }

    await page.goto("/dashboard/transactions");
    await expect(page).toHaveURL(/\/dashboard\/transactions/);
  });

  test("upload, persist across reload, and delete attachment", async ({ page }) => {
    await page.getByLabel("Amount").fill("42");
    await page.getByRole("combobox").click();
    await page.getByRole("option").first().click();
    await page.getByLabel("Description").fill("Attachment smoke test");
    await page.getByRole("button", { name: /add expense/i }).click();
    await expect(page.getByText("Attachment smoke test")).toBeVisible({ timeout: 10000 });

    await page.getByText("Attachment smoke test").click();

    const attachBtn = page.getByRole("button", { name: /attach file/i });
    await expect(attachBtn).toBeVisible({ timeout: 5000 });

    const fileChooserPromise = page.waitForEvent("filechooser");
    await attachBtn.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "test-receipt.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake-png-data-for-e2e-test"),
    });

    await expect(page.getByText("Attachment uploaded")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("test-receipt.png")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Attachment smoke test")).toBeVisible({ timeout: 10000 });
    await page.getByText("Attachment smoke test").click();
    await expect(page.getByText("test-receipt.png")).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: "Delete attachment" }).click();
    await expect(page.getByText("Attachment deleted")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("test-receipt.png")).not.toBeVisible();
  });

  test("rejects unsupported file type", async ({ page }) => {
    await page.getByLabel("Amount").fill("10");
    await page.getByRole("combobox").click();
    await page.getByRole("option").first().click();
    await page.getByLabel("Description").fill("MIME reject test");
    await page.getByRole("button", { name: /add expense/i }).click();
    await expect(page.getByText("MIME reject test")).toBeVisible({ timeout: 10000 });

    await page.getByText("MIME reject test").click();
    const attachBtn = page.getByRole("button", { name: /attach file/i });
    await expect(attachBtn).toBeVisible({ timeout: 5000 });

    const fileChooserPromise = page.waitForEvent("filechooser");
    await attachBtn.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "evil.html",
      mimeType: "text/html",
      buffer: Buffer.from("<script>alert(1)</script>"),
    });

    await expect(page.getByText("File type not supported")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("evil.html")).not.toBeVisible();
  });
});

test.describe("Attachments on debts", () => {
  test.setTimeout(60_000);
  let testUser: { email: string; password: string; displayName: string };

  test.beforeEach(async ({ page, request }) => {
    testUser = await createTestUser(request);
    await loginViaUI(page, testUser);
    await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 30000 });

    if (page.url().includes("/onboarding")) {
      await completeOnboardingViaUI(page);
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
    }

    await page.goto("/dashboard/debts");
    await expect(page).toHaveURL(/\/dashboard\/debts/);
  });

  test("upload attachment on debt via expand toggle", async ({ page }) => {
    await page.getByRole("button", { name: "Add Debt" }).click();
    await page.getByLabel("Counterparty").fill("E2E Attach Test");
    await page.getByLabel("Amount").fill("100");
    await page.getByRole("dialog").getByRole("combobox").click();
    await page.getByRole("option").first().click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Add Debt" })
      .click();
    await expect(page.getByText("E2E Attach Test")).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /^attachments/i }).click();

    const attachBtn = page.getByRole("button", { name: /attach file/i });
    await expect(attachBtn).toBeVisible({ timeout: 5000 });

    const fileChooserPromise = page.waitForEvent("filechooser");
    await attachBtn.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "debt-invoice.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("fake-pdf-data"),
    });

    await expect(page.getByText("Attachment uploaded")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("debt-invoice.pdf")).toBeVisible();
    await expect(page.getByRole("button", { name: /attachments \(1\)/i })).toBeVisible();
  });
});
