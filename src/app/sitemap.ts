import type { MetadataRoute } from "next";

import { services } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://driftlinetech.com";
  const staticRoutes = ["", "/services", "/about", "/contact", "/support", "/legal/privacy", "/legal/terms"];
  const routes = [
    ...staticRoutes,
    ...services.map((service) => "/services/" + service.slug),
  ];
  return routes.map((route) => ({
    url: base + route,
    lastModified: new Date("2026-08-30"),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/services" ? 0.9 : 0.7,
  }));
}