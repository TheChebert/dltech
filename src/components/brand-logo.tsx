import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  onDark?: boolean;
  preload?: boolean;
  variant?: "primary" | "compact" | "stacked";
};

const logoSources = {
  light: {
    primary: { src: "/brand/Driftline-Tech-Primary-Logo.svg", width: 1440, height: 280 },
    compact: { src: "/brand/Driftline-Tech-Compact-Horizontal.svg", width: 1160, height: 250 },
    stacked: { src: "/brand/Driftline-Tech-Stacked.svg", width: 800, height: 540 },
  },
  dark: {
    primary: { src: "/brand/Driftline-Tech-Dark-Background-Variants/Driftline-Tech-Primary-Logo-White-and-Blue.svg", width: 1440, height: 280 },
    compact: { src: "/brand/Driftline-Tech-Dark-Background-Variants/Driftline-Tech-Compact-Horizontal-White-and-Blue.svg", width: 1160, height: 250 },
    stacked: { src: "/brand/Driftline-Tech-Dark-Background-Variants/Driftline-Tech-Stacked-White-and-Blue.svg", width: 800, height: 540 },
  },
} as const;

export function BrandLogo({ className, onDark = false, preload = false, variant = "primary" }: BrandLogoProps) {
  const source = logoSources[onDark ? "dark" : "light"][variant];

  return (
    <Image
      src={source.src}
      alt="Driftline Tech"
      width={source.width}
      height={source.height}
      preload={preload}
      unoptimized
      className={cn(className)}
    />
  );
}