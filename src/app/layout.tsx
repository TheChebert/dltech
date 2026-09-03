import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { absoluteUrl, serializeJsonLd, serviceAreas, siteConfig } from "@/lib/site";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const verification: Metadata["verification"] = {
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : {}),
  ...(process.env.BING_SITE_VERIFICATION
    ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } }
    : {}),
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Driftline Tech | Web Design & Custom Software in La Crosse, WI",
    template: "%s | Driftline Tech",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  creator: siteConfig.name,
  publisher: siteConfig.name,
  category: "technology",
  verification,
  formatDetection: { address: false, email: false, telephone: false },
  icons: {
    icon: [
      { url: "/brand/Driftline-Tech-App-Icon-Color.svg", type: "image/svg+xml", media: "(prefers-color-scheme: light)" },
      { url: "/brand/Driftline-Tech-App-Icon-Dark.svg", type: "image/svg+xml", media: "(prefers-color-scheme: dark)" },
    ],
    shortcut: "/brand/Driftline-Tech-App-Icon-Dark.svg",
  },
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: siteConfig.name,
    title: "Driftline Tech | Web Design & Custom Software in La Crosse, WI",
    description: siteConfig.description,
    url: "/",
    images: [{ url: "/og.png", width: 1734, height: 907, alt: "Driftline Tech — Custom Solutions. Powerful Software. Real Results." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Driftline Tech | Web Design & Custom Software in La Crosse, WI",
    description: siteConfig.description,
    images: ["/og.png"],
  },
};

const organizationGraph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Organization", "ProfessionalService"],
      "@id": absoluteUrl("/#organization"),
      name: siteConfig.name,
      legalName: siteConfig.legalName,
      url: siteConfig.url,
      logo: absoluteUrl("/brand/Driftline-Tech-Primary-Logo.svg"),
      image: absoluteUrl("/og.png"),

      telephone: siteConfig.phoneE164,
      description: siteConfig.description,
      address: {
        "@type": "PostalAddress",
        addressLocality: "La Crosse",
        addressRegion: "WI",
        addressCountry: "US",
      },
      areaServed: serviceAreas,
      contactPoint: {
        "@type": "ContactPoint",
        telephone: siteConfig.phoneE164,
        contactType: "sales and customer service",
        areaServed: "US",
        availableLanguage: "English",
      },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Technology services",
        itemListElement: [
          "Web design and development",
          "Custom software development",
          "Automation and integrations",
          "AI solutions",
          "Support and maintenance",
          "Technology consulting",
        ].map((name) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name } })),
      },
    },
    {
      "@type": "WebSite",
      "@id": absoluteUrl("/#website"),
      url: siteConfig.url,
      name: siteConfig.name,
      description: siteConfig.description,
      inLanguage: "en-US",
      publisher: { "@id": absoluteUrl("/#organization") },
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const className = geistSans.variable + " " + geistMono.variable + " scroll-smooth antialiased";
  return (
    <html lang="en" className={className}>
      <body>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationGraph) }} />
      </body>
    </html>
  );
}

