import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  onDark?: boolean;
  priority?: boolean;
};

export function BrandLogo({ className, onDark = false, priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/brand/dltech.svg"
      alt="Driftline Tech"
      width={1440}
      height={280}
      priority={priority}
      className={cn(onDark && "brightness-0 invert", className)}
    />
  );
}
