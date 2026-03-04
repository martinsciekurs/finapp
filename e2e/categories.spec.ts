import { test, expect } from "@playwright/test";
import {
  createTestUser,
  loginViaUI,
  completeOnboardingViaUI,
} from "./helpers";

// ────────────────────────────────────────────
// Category Management E2E Tests
// ────────────────────────────────────────────

test.describe("Category management", () => {
  let testUser: { email: string; password: string; displayName: string };

  test.beforeAll(async ({ request }) => {
    testUser = await createTestUser(request);
  });

  test.beforeEach(async ({ page }) => {
    await loginViaUI(page, testUser);
    await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 15000 });

    // Complete onboarding if needed
    if (page.url().includes("/onboarding")) {
      await completeOnboardingViaUI(page);
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
    }

    // Navigate to Settings > Categories
    await page.goto("/dashboard/settings/categories");
    await expect(page).toHaveURL(/\/dashboard\/settings\/categories/);
  });

  // ── Page structure ──

  test("displays the categories page heading and breadcrumb", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: "Categories" })
    ).toBeVisible();
    await expect(
      page.getByText("Organize your expense and income categories into groups.")
    ).toBeVisible();

    // Back link to settings
    await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
  });

  test("shows expense tab active by default with onboarding groups", async ({
    page,
  }) => {
    // Expense tab should be active
    const expenseTab = page.getByRole("tab", { name: "Expense" });
    await expect(expenseTab).toHaveAttribute("aria-selected", "true");

    // Onboarding creates default expense groups/categories — at least one group visible
    await expect(
      page.getByRole("button", { name: /add group/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /add category/i })
    ).toBeVisible();
  });

  test("can switch between expense and income tabs", async ({ page }) => {
    const incomeTab = page.getByRole("tab", { name: "Income" });
    await incomeTab.click();
    await expect(incomeTab).toHaveAttribute("aria-selected", "true");

    const expenseTab = page.getByRole("tab", { name: "Expense" });
    await expenseTab.click();
    await expect(expenseTab).toHaveAttribute("aria-selected", "true");
  });

  // ── Group CRUD ──

  test("creates a new group", async ({ page }) => {
    await page.getByRole("button", { name: /add group/i }).click();

    // Dialog should open
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Fill in group name and submit
    await dialog.getByLabel("Name").fill("Test Group");
    await dialog.getByRole("button", { name: /create|save|add/i }).click();

    // Dialog should close and new group should appear
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Test Group")).toBeVisible({ timeout: 5000 });
  });

  test("renames a group", async ({ page }) => {
    // First create a group
    await page.getByRole("button", { name: /add group/i }).click();
    const createDialog = page.getByRole("dialog");
    await createDialog.getByLabel("Name").fill("Rename Me");
    await createDialog.getByRole("button", { name: /create|save|add/i }).click();
    await expect(createDialog).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Rename Me")).toBeVisible({ timeout: 5000 });

    // Open the group actions menu
    await page
      .getByRole("button", { name: "Actions for Rename Me group" })
      .click();
    await page.getByRole("menuitem", { name: /rename group/i }).click();

    // Rename dialog should open
    const renameDialog = page.getByRole("dialog");
    await expect(renameDialog).toBeVisible();
    await renameDialog.getByLabel("Name").clear();
    await renameDialog.getByLabel("Name").fill("Renamed Group");
    await renameDialog.getByRole("button", { name: /save|rename|update/i }).click();

    await expect(renameDialog).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Renamed Group")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Rename Me")).not.toBeVisible();
  });

  test("deletes an empty group", async ({ page }) => {
    // Create a group to delete
    await page.getByRole("button", { name: /add group/i }).click();
    const createDialog = page.getByRole("dialog");
    await createDialog.getByLabel("Name").fill("Delete Me");
    await createDialog.getByRole("button", { name: /create|save|add/i }).click();
    await expect(createDialog).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Delete Me")).toBeVisible({ timeout: 5000 });

    // Open group actions and delete
    await page
      .getByRole("button", { name: "Actions for Delete Me group" })
      .click();
    await page.getByRole("menuitem", { name: /delete group/i }).click();

    // Confirm delete in dialog
    const deleteDialog = page.getByRole("dialog");
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole("button", { name: /delete/i }).click();

    await expect(deleteDialog).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Delete Me")).not.toBeVisible({ timeout: 5000 });
  });

  // ── Category CRUD ──

  test("creates a new category in a group", async ({ page }) => {
    // First create a group
    await page.getByRole("button", { name: /add group/i }).click();
    const groupDialog = page.getByRole("dialog");
    await groupDialog.getByLabel("Name").fill("My Group");
    await groupDialog.getByRole("button", { name: /create|save|add/i }).click();
    await expect(groupDialog).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("My Group")).toBeVisible({ timeout: 5000 });

    // Click the "+" button on the group to add a category
    await page
      .getByRole("button", { name: "Add category to My Group" })
      .click();

    // Category form dialog should open
    const catDialog = page.getByRole("dialog");
    await expect(catDialog).toBeVisible();

    // Fill in the name
    await catDialog.getByLabel("Name").fill("Test Category");

    // Submit
    await catDialog.getByRole("button", { name: /create|save|add/i }).click();
    await expect(catDialog).not.toBeVisible({ timeout: 5000 });

    // New category should appear
    await expect(page.getByText("Test Category")).toBeVisible({ timeout: 5000 });
  });

  test("edits a category", async ({ page }) => {
    // Create group + category
    await page.getByRole("button", { name: /add group/i }).click();
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill("Edit Group");
    await dialog.getByRole("button", { name: /create|save|add/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: "Add category to Edit Group" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill("Edit Me Cat");
    await dialog.getByRole("button", { name: /create|save|add/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Edit Me Cat")).toBeVisible({ timeout: 5000 });

    // Open category actions menu
    await page.getByRole("button", { name: "Actions for Edit Me Cat" }).click();
    await page.getByRole("menuitem", { name: /edit/i }).click();

    // Edit dialog
    const editDialog = page.getByRole("dialog");
    await expect(editDialog).toBeVisible();
    await editDialog.getByLabel("Name").clear();
    await editDialog.getByLabel("Name").fill("Edited Cat");
    await editDialog.getByRole("button", { name: /save|update/i }).click();

    await expect(editDialog).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Edited Cat")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Edit Me Cat")).not.toBeVisible();
  });

  test("deletes a category with no transactions", async ({ page }) => {
    // Create group + category
    await page.getByRole("button", { name: /add group/i }).click();
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill("Del Cat Group");
    await dialog.getByRole("button", { name: /create|save|add/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: "Add category to Del Cat Group" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill("Delete This Cat");
    await dialog.getByRole("button", { name: /create|save|add/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Delete This Cat")).toBeVisible({ timeout: 5000 });

    // Delete the category
    await page.getByRole("button", { name: "Actions for Delete This Cat" }).click();
    await page.getByRole("menuitem", { name: /delete/i }).click();

    const deleteDialog = page.getByRole("dialog");
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole("button", { name: /delete/i }).click();

    await expect(deleteDialog).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Delete This Cat")).not.toBeVisible({
      timeout: 5000,
    });
  });

  // ── Navigation ──

  test("navigates back to settings hub via breadcrumb", async ({ page }) => {
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/dashboard\/settings$/);
  });

  // ── Drag handles visible ──

  test("shows drag handles for groups and categories", async ({ page }) => {
    // Onboarding creates default groups — check that drag handles exist
    // Group drag handles
    const groupHandles = page.getByRole("button", { name: /drag .+ group/i });
    await expect(groupHandles.first()).toBeVisible();

    // Category drag handles
    const catHandles = page.getByRole("button", { name: /^drag (?!.+ group)/i });
    await expect(catHandles.first()).toBeVisible();
  });

  // ── Settings hub ──

  test("settings hub has a link to categories", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await expect(page).toHaveURL(/\/dashboard\/settings$/);

    const categoriesLink = page.getByRole("link", { name: /categories/i });
    await expect(categoriesLink).toBeVisible();

    await categoriesLink.click();
    await expect(page).toHaveURL(/\/dashboard\/settings\/categories/);
  });
});
