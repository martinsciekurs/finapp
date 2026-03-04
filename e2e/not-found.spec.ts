import { test, expect } from "@playwright/test";

test.describe("Not Found (404)", () => {
  test("displays 404 page for unknown routes", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page.getByText("404")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Back to dashboard" })
    ).toBeVisible();
  });
});
