import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getProduct, products as fallbackProducts, type Product } from "@/lib/content";

type ProductRow = {
  slug: string;
  name: string;
  eyebrow: string | null;
  tagline: string;
  description: string;
  status: "planned" | "private_beta" | "available";
  current_version: string | null;
  license_model: string;
  pricing_label: string | null;
  metadata: Record<string, unknown> | null;
  product_features: { title: string; sort_order: number }[];
  product_platforms: { platform: string; minimum_requirements: string | null; sort_order: number }[];
};

function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function mapProduct(row: ProductRow): Product {
  const configuredAccent = row.metadata?.accent;
  const accent = configuredAccent === "emerald" || configuredAccent === "violet" || configuredAccent === "blue"
    ? configuredAccent
    : row.slug === "ezebay-listing-manager" ? "emerald" : row.slug === "easy-file-editor" ? "violet" : "blue";
  return {
    slug: row.slug,
    name: row.name,
    eyebrow: row.eyebrow ?? "Driftline software",
    shortDescription: row.tagline,
    description: row.description,
    status: row.status === "private_beta" ? "private-beta" : row.status,
    statusLabel: row.status === "available" ? "Available" : row.status === "private_beta" ? "Private beta" : "In development",
    version: row.current_version,
    pricingLabel: row.pricing_label ?? "Pricing to be announced",
    accent,
    features: [...row.product_features].sort((a, b) => a.sort_order - b.sort_order).map((item) => item.title),
    requirements: [...row.product_platforms].sort((a, b) => a.sort_order - b.sort_order).map((item) => item.minimum_requirements).filter((item): item is string => Boolean(item)),
    platforms: [...row.product_platforms].sort((a, b) => a.sort_order - b.sort_order).map((item) => item.platform),
    licenseModel: row.license_model,
  };
}

const select = "slug, name, eyebrow, tagline, description, status, current_version, license_model, pricing_label, metadata, product_features(title, sort_order), product_platforms(platform, minimum_requirements, sort_order)";

export async function getPublicProducts(): Promise<Product[]> {
  const supabase = publicClient();
  if (!supabase) return fallbackProducts;
  const { data, error } = await supabase.from("products").select(select).order("created_at");
  if (error || !data?.length) return fallbackProducts;
  return (data as unknown as ProductRow[]).map(mapProduct);
}

export async function getPublicProduct(slug: string): Promise<Product | undefined> {
  const supabase = publicClient();
  if (!supabase) return getProduct(slug);
  const { data, error } = await supabase.from("products").select(select).eq("slug", slug).maybeSingle();
  if (error || !data) return getProduct(slug);
  return mapProduct(data as unknown as ProductRow);
}
