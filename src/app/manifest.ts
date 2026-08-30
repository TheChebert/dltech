import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Driftline Tech",
    short_name: "Driftline",
    description: "Custom software, websites, automation, AI solutions, and Driftline software products.",
    start_url: "/",
    display: "standalone",
    background_color: "#06111e",
    theme_color: "#06111e",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
