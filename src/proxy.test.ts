import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { proxy } from "@/proxy";

describe("dedicated licensing API deployment boundary", () => {
  afterEach(() => delete process.env.DRIFTLINE_API_ONLY);

  it.each([
    ["GET", "/api/v1/health"],
    ["GET", "/api/v1/licensing/jwks"],
    ["POST", "/api/v1/licenses/activate"],
    ["POST", "/api/v1/licenses/validate"],
    ["POST", "/api/v1/licenses/deactivate"],
    ["POST", "/api/v1/entitlements/resolve"],
  ])("allows %s %s", async (method, path) => {
    process.env.DRIFTLINE_API_ONLY = "true";
    const response = await proxy(new NextRequest(`https://licensing.example${path}`, { method }));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it.each([
    ["GET", "/"],
    ["GET", "/admin"],
    ["POST", "/api/v1/admin/licenses/issue"],
    ["POST", "/api/v1/checkout/sessions"],
    ["POST", "/api/v1/webhooks/stripe"],
    ["GET", "/api/v1/licenses/activate"],
  ])("returns 404 for %s %s", async (method, path) => {
    process.env.DRIFTLINE_API_ONLY = "true";
    const response = await proxy(new NextRequest(`https://licensing.example${path}`, { method }));
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "not_found" });
  });
});
