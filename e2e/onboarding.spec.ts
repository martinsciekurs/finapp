import { test, expect } from "@playwright/test";

test.describe("Onboarding", () => {
  // Note: Full onboarding E2E tests require a running Supabase instance.
  // These tests verify the UI structure and navigation.

  test("onboarding page requires authentication", async ({ page }) => {
    await page.goto("/onboarding");
    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
