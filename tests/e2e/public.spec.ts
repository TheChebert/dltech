import { expect, test } from "@playwright/test";

const unreleasedNames = /EzeBay Listing Manager|Easy File Editor|Viewsaic/;

test("homepage presents services without unreleased products or named projects", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Custom solutions");
  await expect(page.getByRole("link", { name: "Explore services" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Discuss a project" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Driftline Tech home" }).locator("img")).toHaveAttribute(
    "src",
    /Driftline-Tech-Reversed-Dark\.svg/,
  );
  await expect(page.locator("body")).not.toContainText(unreleasedNames);
  await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Software" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Work" })).toHaveCount(0);
});

test("custom software remains a service while legacy product and work routes stay hidden", async ({ page }) => {
  await page.goto("/services/custom-software");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Software that fits");

  await page.goto("/software/viewsaic");
  await expect(page).toHaveURL(/\/services\/custom-software$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Software that fits");
  await expect(page.locator("body")).not.toContainText(unreleasedNames);

  await page.goto("/work");
  await expect(page).toHaveURL(/\/services$/);
});

test("sitemap excludes hidden software, portfolio, and licensing routes", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.ok()).toBe(true);
  const sitemap = await response.text();
  expect(sitemap).not.toContain("/software");
  expect(sitemap).not.toContain("/work");
  expect(sitemap).not.toContain("/legal/software-license");
});

test("protected customer route redirects to sign in", async ({ page }) => {
  await page.goto("/account/dashboard");
  await expect(page).toHaveURL(/\/account/);
  await expect(page.getByRole("heading", { name: "Sign in with a secure link" })).toBeVisible();
});

test("mobile navigation exposes only the current public routes", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile navigation check");
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  const navigation = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Services", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "About", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Resources", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Software", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Work", exact: true })).toHaveCount(0);
});