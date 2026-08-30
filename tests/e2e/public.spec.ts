import { expect, test } from "@playwright/test";

test("homepage presents the Driftline offer and product platform", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Custom solutions");
  await expect(page.getByRole("link", { name: "Explore services" })).toBeVisible();
  await expect(page.getByText("EzeBay Listing Manager", { exact: true }).first()).toBeVisible();
});

test("service and product routes render real detail pages", async ({ page }) => {
  await page.goto("/services/custom-software");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Software that fits");
  await page.goto("/software/viewsaic");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Viewsaic");
  await expect(page.getByText("Availability", { exact: true })).toBeVisible();
  await expect(page.getByText("No public release yet")).toBeVisible();
});

test("protected customer route redirects to sign in", async ({ page }) => {
  await page.goto("/account/dashboard");
  await expect(page).toHaveURL(/\/account/);
  await expect(page.getByRole("heading", { name: "Sign in with a secure link" })).toBeVisible();
});

test("mobile navigation exposes the primary routes", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile navigation check");
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Software", exact: true }).last()).toBeVisible();
});
