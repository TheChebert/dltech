import { expect, test } from "@playwright/test";

const unreleasedNames = /EzeBay Listing Manager|Easy File Editor|Viewsaic/;

test("homepage presents services without unreleased products or named projects", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Custom solutions");
  await expect(page.getByRole("link", { name: "Explore services" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Discuss a project" })).toBeVisible();
  const heroDevice = page.getByRole("img", { name: "Laptop and smartphone displaying Driftline Tech digital solutions." });
  await expect(heroDevice).toHaveAttribute("src", /Driftline-Tech-Hero-Devices-v2\.png/);
  await expect(heroDevice).toHaveAttribute("width", "1827");
  await expect(heroDevice).toHaveAttribute("height", "861");
  await expect(heroDevice).toHaveAttribute("loading", "eager");
  await expect(heroDevice).toHaveAttribute("fetchpriority", "high");
  await expect(page.getByRole("link", { name: "Driftline Tech home" }).locator("img")).toHaveAttribute(
    "src",
    /Driftline-Tech-Compact-Horizontal-White-and-Blue\.svg/,
  );
  await expect(page.locator("footer").getByRole("img", { name: "Driftline Tech" })).toHaveAttribute(
    "src",
    /Driftline-Tech-Primary-Logo-White-and-Blue\.svg/,
  );
  await expect(page.locator("body")).not.toContainText(unreleasedNames);
  await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Software" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Work" })).toHaveCount(0);

  const surfacePattern = await page.locator("main > section[data-surface]").evaluateAll((sections) =>
    sections.map((section) => section.getAttribute("data-surface")),
  );
  expect(surfacePattern).toEqual(["dark", "dark", "dark", "light", "dark", "light"]);
  const deliverySection = page.locator("#how-we-deliver");
  await expect(deliverySection.getByRole("heading", { name: "Built around your business." })).toBeVisible();
  const deliveryStages = deliverySection.getByRole("list", { name: "Delivery stages" });
  for (const stage of ["Discover", "Build", "Launch", "Improve"]) {
    await expect(deliveryStages).toContainText(stage);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await expect(page.getByRole("heading", { name: "You do not need a finished specification to begin." })).toBeVisible();
});

test("homepage uses varied softened surfaces without a decorative hero icon", async ({ page }) => {
  await page.goto("/");

  const eyebrow = page.locator(".eyebrow");
  await expect(eyebrow).toHaveText("Websites, applications, and connected systems");
  await expect(eyebrow.locator("svg")).toHaveCount(0);

  const surfaceColors = await page.locator("main > section[data-surface]").evaluateAll((sections) =>
    sections.map((section) => getComputedStyle(section).backgroundColor),
  );
  expect(surfaceColors[1]).not.toBe(surfaceColors[2]);
  expect(surfaceColors).not.toContain("rgb(255, 255, 255)");

  for (const index of [3, 5]) {
    const channels = surfaceColors[index].match(/\d+/g)?.map(Number) ?? [];
    expect(Math.max(...channels.slice(0, 3))).toBeLessThanOrEqual(244);
  }
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

test("manifest uses the official dark app icon", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.icons).toContainEqual(expect.objectContaining({ src: "/brand/Driftline-Tech-App-Icon-Dark.svg" }));
});

test("public pages do not expose launch-stage placeholder language", async ({ page }) => {
  for (const path of ["/", "/services", "/about", "/contact", "/support", "/legal/privacy", "/legal/terms"]) {
    await page.goto(path);
    await expect(page.locator("body")).not.toContainText(
      /provisional|production-ready|coming soon|placeholder|illustrative concept|legal review required/i,
    );
  }
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

test("hero composition stays prominent and contained across viewports", async ({ page, isMobile }) => {
  await page.goto("/");
  const heroDevice = page.getByRole("img", { name: "Laptop and smartphone displaying Driftline Tech digital solutions." });
  const heroDeviceBox = await heroDevice.boundingBox();
  const viewport = page.viewportSize();
  expect(heroDeviceBox).not.toBeNull();
  expect(viewport).not.toBeNull();

  if (heroDeviceBox && viewport) {
    if (isMobile) {
      expect(heroDeviceBox.width).toBeLessThanOrEqual(viewport.width);
    } else {
      expect(heroDeviceBox.width).toBeGreaterThanOrEqual(750);
      expect(heroDeviceBox.width).toBeLessThanOrEqual(1050);
      const heroSectionBox = await page.locator("main > section").first().boundingBox();
      const connectedLineBox = await page.getByText("Connected technology.", { exact: true }).boundingBox();
      expect(heroSectionBox).not.toBeNull();
      expect(connectedLineBox).not.toBeNull();
      if (heroSectionBox && connectedLineBox) {
        const bottomGap = heroSectionBox.y + heroSectionBox.height - (heroDeviceBox.y + heroDeviceBox.height);
        expect(bottomGap).toBeGreaterThanOrEqual(20);
        expect(bottomGap).toBeLessThanOrEqual(100);
        expect(Math.abs(heroDeviceBox.y - connectedLineBox.y)).toBeLessThanOrEqual(120);
      }
    }
  }

  const headerLogoBox = await page.getByRole("link", { name: "Driftline Tech home" }).locator("img").boundingBox();
  expect(headerLogoBox).not.toBeNull();
  if (headerLogoBox) expect(headerLogoBox.width).toBeGreaterThanOrEqual(isMobile ? 195 : 225);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
});
