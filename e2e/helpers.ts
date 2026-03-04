import type { Page } from "@playwright/test";

/**
 * Generates a unique email address for test isolation.
 * Uses timestamp + random suffix to avoid collisions across parallel workers.
 */
export function generateTestEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@e2e.test`;
}

export const TEST_PASSWORD = "testpass123";
export const TEST_DISPLAY_NAME = "E2E Tester";

/**
 * Signs up a new user via the sign-up form.
 * Does NOT wait for navigation — callers should assert the expected redirect.
 */
export async function signUpViaUI(
  page: Page,
  options: {
    displayName?: string;
    email?: string;
    password?: string;
  } = {}
): Promise<{ email: string; password: string; displayName: string }> {
  const email = options.email ?? generateTestEmail();
  const password = options.password ?? TEST_PASSWORD;
  const displayName = options.displayName ?? TEST_DISPLAY_NAME;

  await page.goto("/auth/sign-up");
  await page.getByLabel("Display Name").fill(displayName);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Start Journey" }).click();

  return { email, password, displayName };
}

/**
 * Logs in via the login form.
 * Does NOT wait for navigation — callers should assert the expected redirect.
 */
export async function loginViaUI(
  page: Page,
  credentials: { email: string; password: string }
): Promise<void> {
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: "Welcome Back" }).click();
}

/**
 * Completes the 3-step onboarding wizard using all defaults.
 * Assumes the page is already on /onboarding after sign-up.
 */
export async function completeOnboardingViaUI(page: Page): Promise<void> {
  // Step 0: Welcome — just click Next
  await page.getByRole("button", { name: "Next" }).click();

  // Step 1: Categories — accept defaults (all expense + Salary) and click Next
  await page.getByText("Pick your categories").waitFor();
  await page.getByRole("button", { name: "Next" }).click();

  // Step 2: Banner — accept default (Sage Green) and click Complete
  await page.getByText("Choose your cover").waitFor();
  await page.getByRole("button", { name: "Complete" }).click();
}
