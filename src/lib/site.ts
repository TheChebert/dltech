export const siteConfig = {
  name: "Driftline Tech",
  legalName: "Driftline Tech, LLC",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://driftlinetech.com",

  phoneDisplay: "608-502-0949",
  phoneE164: "+16085020949",
  location: "La Crosse, Wisconsin",
  localPagePath: "/la-crosse-wi",
  description:
    "La Crosse, Wisconsin technology company providing web design, custom software, automation, AI solutions, integrations, support, and technology consulting.",
} as const;

export const serviceAreas = [
  { "@type": "City", name: "La Crosse", containedInPlace: { "@type": "State", name: "Wisconsin" } },
  { "@type": "City", name: "Onalaska", containedInPlace: { "@type": "State", name: "Wisconsin" } },
  { "@type": "City", name: "Holmen", containedInPlace: { "@type": "State", name: "Wisconsin" } },
  { "@type": "City", name: "West Salem", containedInPlace: { "@type": "State", name: "Wisconsin" } },
  { "@type": "AdministrativeArea", name: "Coulee Region, Wisconsin" },
] as const;

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
