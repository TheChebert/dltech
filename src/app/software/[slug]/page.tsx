import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Custom Software Services",
  robots: { index: false, follow: false },
};

export default function ProductDetailPage() {
  redirect("/services/custom-software");
}