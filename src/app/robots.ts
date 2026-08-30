import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://driftlinetech.com";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/auth", "/api"],
    },
    sitemap: base + "/sitemap.xml",
    host: base,
  };
}
