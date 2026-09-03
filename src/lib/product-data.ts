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
  const configured = (data as unknown as ProductRow[]).map(mapProduct);
  const missingReleasedFallbacks = fallbackProducts.filter((fallback) => fallback.status === "available" && !configured.some((product) => product.slug === fallback.slug));
  return [...configured, ...missingReleasedFallbacks];
}

export async function getPublicProduct(slug: string): Promise<Product | undefined> {
  const supabase = publicClient();
  if (!supabase) return getProduct(slug);
  const { data, error } = await supabase.from("products").select(select).eq("slug", slug).maybeSingle();
  if (error || !data) return getProduct(slug);
  return mapProduct(data as unknown as ProductRow);
}

export type PublicEdition = {
  id: string;
  code: string;
  name: string;
  description: string;
  activationRequired: boolean;
  activationLimit: number;
  licenseType: string;
  features: string[];
  price: { amountMinor: number; currency: string; billingInterval: string | null; configured: boolean } | null;
};

export async function getPublicProductEditions(slug: string): Promise<PublicEdition[]> {
  const supabase = publicClient();
  if (!supabase) return [];
  const { data: product } = await supabase.from("products").select("id").eq("slug", slug).eq("status", "available").maybeSingle();
  if (!product) return [];
  const [{ data: editions }, { data: features }, { data: grants }, { data: prices }] = await Promise.all([
    supabase.from("product_editions").select("id, code, name, description, activation_required, activation_limit, license_type, sort_order").eq("product_id", product.id).eq("active", true).order("sort_order"),
    supabase.from("features").select("id, feature_key").eq("product_id", product.id),
    supabase.from("edition_features").select("edition_id, feature_id, value"),
    supabase.from("product_prices").select("edition_id, provider_price_id, currency, amount_minor, billing_interval, provider, environment, is_default").eq("product_id", product.id).eq("active", true).eq("is_default", true),
  ]);
  if (!editions) return [];
  const featureKeys = new Map((features ?? []).map((feature) => [feature.id, feature.feature_key]));
  return editions.map((edition) => {
    const price = (prices ?? []).find((item) => item.edition_id === edition.id && (item.provider === "internal" || item.environment === "test"));
    return {
      id: edition.id,
      code: edition.code,
      name: edition.name,
      description: edition.description,
      activationRequired: edition.activation_required,
      activationLimit: edition.activation_limit,
      licenseType: edition.license_type,
      features: (grants ?? [])
        .filter((grant) => grant.edition_id === edition.id && grant.value !== false)
        .flatMap((grant) => featureKeys.get(grant.feature_id) ? [featureKeys.get(grant.feature_id)!] : [])
        .sort(),
      price: price ? {
        amountMinor: price.amount_minor,
        currency: price.currency,
        billingInterval: price.billing_interval,
        configured: price.provider === "internal" || Boolean(price.provider_price_id),
      } : null,
    };
  });
}
