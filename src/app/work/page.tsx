import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Services",
  robots: { index: false, follow: false },
};

export default function WorkPage() {
  redirect("/services");
}