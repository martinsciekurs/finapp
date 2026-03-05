import { test, expect } from "@playwright/test";
import { createTestUser, loginViaUI, completeOnboardingViaUI, dismissDevOverlay } from "./helpers";

test.describe("Onboarding", () => {
  test("onboarding page requires authentication", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

// ── Onboarding flow (requires running Supabase) ───────────
test.describe("Onboarding wizard", () => {
  test("displays welcome step with user name", async ({ page, request }) => {
    const user = await createTestUser(request, {
      displayName: "Onboarding Tester",
    });
    await loginViaUI(page, user);
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });

    await expect(
      page.getByRole("heading", { name: `Welcome, ${user.displayName}!` })
    ).toBeVisible();
    await expect(page.getByText("Step 1 of 3")).toBeVisible();
  });

  test("navigates through all three steps", async ({ page, request }) => {
    const user = await createTestUser(request);
    await loginViaUI(page, user);
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });

    // Step 0: Welcome
    await expect(page.getByText("Step 1 of 3")).toBeVisible();
    await page
      .getByRole("button", { name: "Next", exact: true })
      .click();

    // Step 1: Categories
    await expect(page.getByText("Pick your categories")).toBeVisible();
    await expect(page.getByText("Step 2 of 3")).toBeVisible();
    await page
      .getByRole("button", { name: "Next", exact: true })
      .click();

    // Step 2: Banner
    await expect(page.getByText("Choose your cover")).toBeVisible();
    await expect(page.getByText("Step 3 of 3")).toBeVisible();
  });

  test("back button navigates to previous step", async ({
    page,
    request,
  }) => {
    const user = await createTestUser(request);
    await loginViaUI(page, user);
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });

    // Go to step 1
    await page
      .getByRole("button", { name: "Next", exact: true })
      .click();
    await expect(page.getByText("Pick your categories")).toBeVisible();

    // Go back to step 0
    // Dismiss dev overlay — its "issues badge" sits in the bottom-left and
    // can intermittently cover the Back button (dev-mode only).
    await dismissDevOverlay(page);
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByText("Step 1 of 3")).toBeVisible();
  });

  test("completes onboarding and redirects to dashboard", async ({
    page,
    request,
  }) => {
    const user = await createTestUser(request);
    await loginViaUI(page, user);
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });

    await completeOnboardingViaUI(page);

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
  });

  test("redirects to dashboard if onboarding already completed", async ({
    page,
    request,
  }) => {
    const user = await createTestUser(request);
    await loginViaUI(page, user);
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });

    await completeOnboardingViaUI(page);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });

    // Try going back to onboarding — should redirect to dashboard
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });
});

// ── Full user lifecycle ────────────────────────────────────
test.describe("End-to-end user flow", () => {
  test("complete onboarding, log out, log back in", async ({
    page,
    request,
  }) => {
    // 1. Create user and log in
    const user = await createTestUser(request);
    await loginViaUI(page, user);
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });

    // 2. Complete onboarding
    await completeOnboardingViaUI(page);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });

    // 3. Log out (clear session)
    await page.context().clearCookies();

    // 4. Log back in
    await loginViaUI(page, user);

    // 5. Should arrive at dashboard (onboarding is completed)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });
});
