import { latestVersionResponse } from "@/lib/licensing/catalog-http";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return latestVersionResponse(request, slug);
}
