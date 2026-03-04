import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.getByText("FinApp")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Welcome Back" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create Account" })
    ).toBeVisible();
  });

  test("sign-up page renders correctly", async ({ page }) => {
    await page.goto("/auth/sign-up");
    await expect(page.getByText("FinApp")).toBeVisible();
    await expect(page.getByLabel("Display Name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Start Journey" })
    ).toBeVisible();
  });

  test("login form validates empty fields", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByRole("button", { name: "Welcome Back" }).click();
    await expect(
      page.getByText("Please enter a valid email")
    ).toBeVisible();
  });

  test("sign-up form validates empty fields", async ({ page }) => {
    await page.goto("/auth/sign-up");
    await page.getByRole("button", { name: "Start Journey" }).click();
    await expect(
      page.getByText("Name must be at least 2 characters")
    ).toBeVisible();
  });

  test("login page links to sign-up", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByRole("button", { name: "Create Account" }).click();
    await expect(page).toHaveURL(/\/auth\/sign-up/);
  });

  test("sign-up page links to login", async ({ page }) => {
    await page.goto("/auth/sign-up");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("unauthenticated users are redirected from dashboard", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("unauthenticated users are redirected from onboarding", async ({
    page,
  }) => {
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
