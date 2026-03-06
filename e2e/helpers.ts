import { resolve } from "path";
import { config } from "dotenv";
import type { Page, APIRequestContext } from "@playwright/test";

// ── Supabase Config ────────────────────────────────────────

// Load .env.local so Supabase vars are available in local dev.
// In CI, these are set via $GITHUB_ENV and process.env already has them.
config({ path: resolve(process.cwd(), ".env.local") });

function getSupabaseConfig(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase config. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return { url, anonKey };
}

// ── Test Data ──────────────────────────────────────────────

export function generateTestEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@e2e.test`;
}

export const TEST_PASSWORD = "testpass123";
export const TEST_DISPLAY_NAME = "E2E Tester";

// ── User Management ────────────────────────────────────────

/**
 * Creates a test user via the Supabase REST API (no browser needed).
 * This bypasses the sign-up UI entirely, making it reliable across all browsers.
 */
export async function createTestUser(
  request: APIRequestContext,
  options?: {
    displayName?: string;
    email?: string;
    password?: string;
  }
): Promise<{ email: string; password: string; displayName: string }> {
  const { url, anonKey } = getSupabaseConfig();
  const email = options?.email ?? generateTestEmail();
  const password = options?.password ?? TEST_PASSWORD;
  const displayName = options?.displayName ?? TEST_DISPLAY_NAME;

  const response = await request.post(`${url}/auth/v1/signup`, {
    data: { email, password, data: { display_name: displayName } },
    headers: { apikey: anonKey },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(
      `Failed to create test user (${response.status()}): ${body}`
    );
  }

  return { email, password, displayName };
}

// ── UI Helpers ─────────────────────────────────────────────

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
  // WebKit needs explicit waitFor + clear before fill on type="email" inputs
  const emailField = page.getByLabel("Email");
  await emailField.waitFor({ state: "visible" });
  await emailField.clear();
  await emailField.fill(email);
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
  // WebKit needs explicit waitFor + clear before fill on type="email" inputs
  const emailField = page.getByLabel("Email");
  await emailField.waitFor({ state: "visible" });
  await emailField.clear();
  await emailField.fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: "Welcome Back" }).click();
}

/**
 * Hides the Next.js dev-tools overlay so it cannot intercept clicks.
 *
 * In dev mode (`npm run dev`), Next.js injects a `<nextjs-portal>` element
 * that renders an issues badge in the bottom-left corner. When an intermittent
 * dev warning fires, the badge expands and covers nearby fixed-position
 * elements (like the onboarding Back button). Setting `pointer-events: none`
 * prevents it from stealing clicks without removing it from the DOM.
 */
export async function dismissDevOverlay(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelectorAll("nextjs-portal").forEach((el) => {
      (el as HTMLElement).style.pointerEvents = "none";
    });
  });
}

/**
 * Completes the 3-step onboarding wizard using all defaults.
 * Assumes the page is already on /onboarding.
 * Does NOT wait for the redirect — callers should assert `toHaveURL(/\/dashboard/)`.
 */
export async function completeOnboardingViaUI(page: Page): Promise<void> {
  // Step 0: Welcome — click Next
  // exact: true avoids matching the Next.js Dev Tools button
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 1: Categories — accept defaults and click Next
  await page.getByText("Pick your categories").waitFor();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 2: Banner — accept default (Sage Green) and click Complete
  await page.getByText("Choose your cover").waitFor();
  await page.getByRole("button", { name: "Complete" }).click();
}

export async function skipOnboardingViaUI(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Skip for now" }).click();
}
