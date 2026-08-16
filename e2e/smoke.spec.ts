import { test, expect } from "@playwright/test";

/**
 * A minimal smoke test, not the full manual checklist in SETUP.md / the project plan (magic
 * link auth can't be automated without a real inbox). Requires a real Supabase project — see
 * SETUP.md — since the login page renders Supabase's client which needs valid env vars.
 */
test("login page renders and accepts an email", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "BUDGY" })).toBeVisible();

  await page.getByLabel("Email").fill("test@example.com");
  await page.getByRole("button", { name: "Send magic link" }).click();

  await expect(page.getByText(/check/i)).toBeVisible({ timeout: 10_000 });
});

test("unauthenticated visitors are redirected away from the app", async ({ page }) => {
  await page.goto("/transactions");
  await expect(page).toHaveURL(/\/login/);
});
