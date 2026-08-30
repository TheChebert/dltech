import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: "Driftline Tech | Custom Software & Digital Solutions",
    template: "%s | Driftline Tech",
  },
  description: "Driftline Tech builds modern websites, custom applications, automation, AI solutions, and connected systems for growing businesses.",
  applicationName: "Driftline Tech",
  category: "technology",
  icons: {
    icon: [{ url: "/brand/Driftline-Tech-App-Icon-Color.svg", type: "image/svg+xml" }],
    shortcut: "/brand/Driftline-Tech-App-Icon-Color.svg",
  },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Driftline Tech",
    title: "Driftline Tech | Custom Software & Digital Solutions",
    description: "Modern websites, custom applications, automation, AI solutions, and connected systems built for real-world business needs.",
    url: "/",
    images: [{ url: "/og.png", width: 1734, height: 907, alt: "Driftline Tech — Custom Solutions. Powerful Software. Real Results." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Driftline Tech | Custom Software & Digital Solutions",
    description: "Modern websites, custom applications, automation, AI solutions, and connected systems.",
    images: ["/og.png"],
  },
};

const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Driftline Tech",
  url: siteOrigin,
  logo: siteOrigin + "/brand/Driftline-Tech-Primary-Logo.svg",
  email: "hello@driftlinetech.com",
  description: "Custom software, web design, automation, AI solutions, integrations, support, and technology consulting.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const className = geistSans.variable + " " + geistMono.variable + " scroll-smooth antialiased";
  return (
    <html lang="en" className={className}>
      <body>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
      </body>
    </html>
  );
}

