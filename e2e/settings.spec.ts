import { test, expect } from "@playwright/test";
import {
  createTestUser,
  loginViaUI,
  completeOnboardingViaUI,
} from "./helpers";

test.describe("Settings", () => {
  test("settings profile page requires authentication", async ({ page }) => {
    await page.goto("/dashboard/settings/profile");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("updates profile display name and logs out", async ({ page, request }) => {
    const user = await createTestUser(request);

    await loginViaUI(page, user);
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });

    await completeOnboardingViaUI(page);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });

    await page.goto("/dashboard/settings/profile");
    await expect(page).toHaveURL(/\/dashboard\/settings\/profile/, {
      timeout: 15000,
    });

    const profileForm = page.locator("form").filter({
      has: page.getByLabel("Display Name"),
    });

    await profileForm.getByLabel("Display Name").fill("Settings Smoke User");
    await profileForm.getByRole("button", { name: "Save" }).click();

    await expect(
      page.locator('[data-sonner-toast][data-type="success"]').filter({
        hasText: "Profile updated",
      })
    ).toBeVisible({ timeout: 10000 });

    await page.goto("/dashboard/settings");
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 15000 });
  });
});
