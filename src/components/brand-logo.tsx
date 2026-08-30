import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  onDark?: boolean;
  preload?: boolean;
};

export function BrandLogo({ className, onDark = false, preload = false }: BrandLogoProps) {
  const source = onDark
    ? {
        src: "/brand/Driftline-Tech-Reversed-Dark.svg",
        width: 1200,
        height: 300,
      }
    : {
        src: "/brand/Driftline-Tech-Primary-Logo.svg",
        width: 1440,
        height: 280,
      };

  return (
    <Image
      src={source.src}
      alt="Driftline Tech"
      width={source.width}
      height={source.height}
      preload={preload}
      className={cn(className)}
    />
  );
}
