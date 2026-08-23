import { test, expect } from "@playwright/test";

/**
 * A minimal smoke test, not the full manual checklist in SETUP.md / the project plan. Requires a
 * real Supabase project with email confirmation OFF — see SETUP.md — since the login page renders
 * Supabase's client which needs valid env vars, and the form logs a brand-new email straight in.
 */
test("login page renders and registers a new email straight in", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "BUDGY" })).toBeVisible();

  await page.getByLabel("Email").fill(`test-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page).toHaveURL("/", { timeout: 10_000 });
});

test("unauthenticated visitors are redirected away from the app", async ({ page }) => {
  await page.goto("/transactions");
  await expect(page).toHaveURL(/\/login/);
});
