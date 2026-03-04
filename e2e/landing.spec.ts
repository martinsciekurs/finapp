import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("landing page renders correctly", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText("Your finances, beautifully simple")
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Get started" })
    ).toBeVisible();
  });

  test("landing page CTA links to sign-up", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Start for free" }).click();
    await expect(page).toHaveURL(/\/auth\/sign-up/);
  });
});
