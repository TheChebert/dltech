import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Terms",
  robots: { index: false, follow: false },
};

export default function SoftwareLicensePage() {
  redirect("/legal/terms");
}