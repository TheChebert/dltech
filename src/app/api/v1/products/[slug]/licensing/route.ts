import { licensingPolicyResponse } from "@/lib/licensing/catalog-http";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return licensingPolicyResponse(slug);
}
