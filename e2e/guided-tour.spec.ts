import { test, expect } from "@playwright/test";
import {
  createTestUser,
  loginViaUI,
  completeOnboardingViaUI,
  dismissDevOverlay,
} from "./helpers";

test.describe("Guided Tour", () => {
  test("shows welcome tour on first dashboard visit and dismisses correctly", async ({
    page,
    request,
  }) => {
    const user = await createTestUser(request);
    await loginViaUI(page, user);
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });
    await dismissDevOverlay(page);
    await completeOnboardingViaUI(page);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    const popover = page.locator(".driver-popover");
    await expect(popover).toBeVisible({ timeout: 5000 });
    await expect(popover.locator(".driver-popover-title")).toContainText(
      "Welcome to your dashboard"
    );

    await page.locator(".driver-popover-next-btn").click();
    await expect(popover.locator(".driver-popover-title")).toContainText(
      "Your financial snapshot"
    );

    await page.locator(".driver-popover-next-btn").click();
    await expect(popover.locator(".driver-popover-title")).toContainText(
      "Navigate your finances"
    );

    await page.locator(".driver-popover-next-btn").click();
    await expect(popover.locator(".driver-popover-title")).toContainText(
      "Start by adding a transaction"
    );

    await popover.getByRole("button", { name: "Got it!" }).click();
    await expect(popover).not.toBeVisible({ timeout: 3000 });
  });

  test("does not show tour on subsequent visits after finishing the tour", async ({
    page,
    request,
  }) => {
    const user = await createTestUser(request);
    await loginViaUI(page, user);
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });
    await dismissDevOverlay(page);
    await completeOnboardingViaUI(page);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    const popover = page.locator(".driver-popover");
    await expect(popover).toBeVisible({ timeout: 5000 });
    await page.locator(".driver-popover-next-btn").click();
    await page.locator(".driver-popover-next-btn").click();
    await page.locator(".driver-popover-next-btn").click();
    await popover.getByRole("button", { name: "Got it!" }).click();
    await expect(popover).not.toBeVisible({ timeout: 3000 });

    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator('[data-tour="hero-banner"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(popover).not.toBeVisible({ timeout: 3000 });
  });

  test("tour can be closed early via close button", async ({
    page,
    request,
  }) => {
    const user = await createTestUser(request);
    await loginViaUI(page, user);
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });
    await dismissDevOverlay(page);
    await completeOnboardingViaUI(page);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    const popover = page.locator(".driver-popover");
    await expect(popover).toBeVisible({ timeout: 5000 });

    await page.locator(".driver-popover-close-btn").click();
    await expect(popover).not.toBeVisible({ timeout: 3000 });

    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator('[data-tour="hero-banner"]')).toBeVisible({ timeout: 10000 });
    await expect(popover).toBeVisible({ timeout: 5000 });
  });
});
