import { test, expect } from "@playwright/test";
import {
  signUpViaUI,
  loginViaUI,
  createTestUser,
  generateTestEmail,
} from "./helpers";

test.describe("Authentication", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.getByText("Simplony")).toBeVisible();
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
    await expect(page.getByText("Simplony")).toBeVisible();
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

// ── Sign-up validation (client-side Zod) ───────────────────
test.describe("Sign-up validation", () => {
  test("rejects short display name", async ({ page }) => {
    await page.goto("/auth/sign-up");
    await page.getByLabel("Display Name").fill("A");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Start Journey" }).click();
    await expect(
      page.getByText("Name must be at least 2 characters")
    ).toBeVisible();
  });

  test("rejects invalid email format", async ({ page }) => {
    await page.goto("/auth/sign-up");
    await page.getByLabel("Display Name").fill("Test User");
    // Use an email that passes HTML5 type="email" validation (has @)
    // but fails Zod's stricter .email() check (no valid TLD)
    await page.getByLabel("Email").fill("test@invalid");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Start Journey" }).click();
    await expect(
      page.getByText("Please enter a valid email")
    ).toBeVisible();
  });

  test("rejects short password", async ({ page }) => {
    await page.goto("/auth/sign-up");
    await page.getByLabel("Display Name").fill("Test User");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Password").fill("12345");
    await page.getByRole("button", { name: "Start Journey" }).click();
    await expect(
      page.getByText("Password must be at least 6 characters")
    ).toBeVisible();
  });

  test("shows all validation errors at once", async ({ page }) => {
    await page.goto("/auth/sign-up");
    await page.getByLabel("Display Name").fill("A");
    // Must include @ to bypass browser's native type="email" check
    await page.getByLabel("Email").fill("bad@x");
    await page.getByLabel("Password").fill("12345");
    await page.getByRole("button", { name: "Start Journey" }).click();
    await expect(
      page.getByText("Name must be at least 2 characters")
    ).toBeVisible();
    await expect(
      page.getByText("Please enter a valid email")
    ).toBeVisible();
    await expect(
      page.getByText("Password must be at least 6 characters")
    ).toBeVisible();
  });
});

// ── Login validation (client-side Zod) ─────────────────────
test.describe("Login validation", () => {
  test("rejects empty email", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Welcome Back" }).click();
    await expect(
      page.getByText("Please enter a valid email")
    ).toBeVisible();
  });

  test("rejects short password", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Password").fill("12345");
    await page.getByRole("button", { name: "Welcome Back" }).click();
    await expect(
      page.getByText("Password must be at least 6 characters")
    ).toBeVisible();
  });
});

// ── Sign-up flow (requires running Supabase) ──────────────
// Serial mode: reduces concurrent Supabase load across parallel projects
test.describe("Sign-up flow", () => {
  test.describe.configure({ mode: "serial" });
  test("successfully signs up and redirects to onboarding", async ({
    page,
  }) => {
    await signUpViaUI(page);
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });
  });

  test("rejects sign-up with already registered email", async ({ page }) => {
    const email = generateTestEmail();

    // First sign-up succeeds
    await signUpViaUI(page, { email });
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });

    // Clear session completely (cookies + localStorage where Supabase stores tokens)
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await signUpViaUI(page, { email });

    // Should not reach onboarding — either error toast or redirect to login
    await Promise.any([
      expect(
        page.locator('[data-sonner-toast][data-type="error"]')
      ).toBeVisible({ timeout: 10000 }),
      expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 }),
    ]);
  });
});

// ── Login flow (requires running Supabase) ─────────────────
test.describe("Login flow", () => {
  test("shows error for invalid credentials", async ({ page }) => {
    await loginViaUI(page, {
      email: "nonexistent@example.com",
      password: "wrongpassword",
    });
    await expect(
      page.locator('[data-sonner-toast][data-type="error"]')
    ).toBeVisible({ timeout: 10000 });
  });

  test("shows error for wrong password", async ({ page, request }) => {
    const user = await createTestUser(request);

    await loginViaUI(page, { email: user.email, password: "wrongpassword123" });

    await expect(
      page.locator('[data-sonner-toast][data-type="error"]')
    ).toBeVisible({ timeout: 10000 });
  });

  test("successfully logs in", async ({ page, request }) => {
    const user = await createTestUser(request);

    await loginViaUI(page, user);

    // Login succeeds — middleware redirects to /onboarding (not yet completed)
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });
  });
});
