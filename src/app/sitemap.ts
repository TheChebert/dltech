import type { MetadataRoute } from "next";

import { products, services } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://driftlinetech.com";
  const staticRoutes = ["", "/services", "/software", "/work", "/about", "/contact", "/support", "/legal/privacy", "/legal/terms", "/legal/software-license"];
  const routes = [
    ...staticRoutes,
    ...services.map((service) => "/services/" + service.slug),
    ...products.map((product) => "/software/" + product.slug),
  ];
  return routes.map((route) => ({
    url: base + route,
    lastModified: new Date("2026-08-30"),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/services" || route === "/software" ? 0.9 : 0.7,
  }));
}
