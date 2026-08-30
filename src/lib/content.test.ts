import { describe, expect, it } from "vitest";

import { products, services } from "@/lib/content";

describe("public content model", () => {
  it("uses unique stable service slugs", () => {
    expect(new Set(services.map((item) => item.slug)).size).toBe(services.length);
    expect(services).toHaveLength(6);
  });

  it("keeps provisional products honest", () => {
    expect(products).toHaveLength(3);
    expect(products.every((product) => product.status !== "available")).toBe(true);
    expect(products.every((product) => product.pricingLabel.toLowerCase().includes("announced"))).toBe(true);
  });

  it("includes platform, feature, and license information for every product", () => {
    for (const product of products) {
      expect(product.features.length).toBeGreaterThanOrEqual(4);
      expect(product.platforms.length).toBeGreaterThan(0);
      expect(product.licenseModel.length).toBeGreaterThan(10);
    }
  });
});
