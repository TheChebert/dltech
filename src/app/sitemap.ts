import type { MetadataRoute } from "next";

import { products, services } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/la-crosse-wi", "/services", "/software", "/about", "/contact", "/support", "/legal/privacy", "/legal/terms"];
  const routes = [
    ...staticRoutes,
    ...services.map((service) => "/services/" + service.slug),
    ...products.filter((product) => product.status === "available").map((product) => "/software/" + product.slug),
  ];
  return routes.map((route) => ({
    url: absoluteUrl(route || "/"),
    lastModified: new Date("2026-08-31"),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/la-crosse-wi" || route === "/services" ? 0.9 : 0.7,
  }));
}
