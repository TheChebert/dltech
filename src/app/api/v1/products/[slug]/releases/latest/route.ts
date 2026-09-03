import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";

const channelSchema = z.enum(["stable", "beta", "alpha"]);

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const channelResult = channelSchema.safeParse(new URL(request.url).searchParams.get("channel") ?? "stable");
  if (!channelResult.success || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, slug, name, status")
    .eq("slug", slug)
    .in("status", ["private_beta", "available"])
    .not("published_at", "is", null)
    .maybeSingle();

  if (productError) return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: release, error: releaseError } = await supabase
    .from("product_versions")
    .select("version, channel, release_notes, minimum_supported_version, critical, published_at")
    .eq("product_id", product.id)
    .eq("channel", channelResult.data)
    .eq("is_published", true)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (releaseError) return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  if (!release) return NextResponse.json({ error: "no_release" }, { status: 404 });

  return NextResponse.json({
    product: { slug: product.slug, name: product.name },
    release: {
      version: release.version,
      channel: release.channel,
      releaseNotes: release.release_notes,
      minimumSupportedVersion: release.minimum_supported_version,
      critical: release.critical,
      publishedAt: release.published_at,
    },
  }, {
    headers: {
      "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
