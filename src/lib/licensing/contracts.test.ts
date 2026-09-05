import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

type ProductContract = {
  contract_version: number;
  product_id: string;
  licensing_api_version: string;
  licensing_protocol_specification: string;
  compatible_sdks: Record<string, string>;
  feature_ids: string[];
  feature_boundaries: Record<string, { edition: string }>;
  deprecated_feature_ids: Record<string, string>;
};

const root = new URL("../../../", import.meta.url);
const contract = JSON.parse(readFileSync(new URL("contracts/products/metatweak.v2.json", root), "utf8")) as ProductContract;
const bundle = JSON.parse(readFileSync(new URL("contracts/integration-bundles/metatweak.json", root), "utf8")) as {
  contract: string;
  licensing_protocol_specification: string;
  sdk_versions: Record<string, string>;
};

describe("MetaTweak contract v2", () => {
  it("has explicit protocol and SDK compatibility", () => {
    expect(contract).toMatchObject({
      contract_version: 2,
      product_id: "metatweak",
      licensing_api_version: "v1",
      licensing_protocol_specification: "1.1.0",
    });
    expect(contract.compatible_sdks.dotnet).toContain("Driftline.Licensing");
  });

  it("maps every current feature exactly once", () => {
    expect(new Set(contract.feature_ids).size).toBe(contract.feature_ids.length);
    expect(Object.keys(contract.feature_boundaries).sort()).toEqual([...contract.feature_ids].sort());
    expect(contract.feature_boundaries.document_metadata.edition).toBe("free");
    expect(Object.values(contract.feature_boundaries).filter((value) => value.edition === "pro")).toHaveLength(8);
  });

  it("deprecates every ambiguous or unimplemented v1 capability", () => {
    expect(Object.keys(contract.deprecated_feature_ids).sort()).toEqual([
      "advanced_operations",
      "all_file_types",
      "backup_controls",
      "file_attributes",
    ]);
  });

  it("contains no authoritative commercial configuration", () => {
    const serialized = JSON.stringify(contract).toLowerCase();
    for (const prohibited of ["stripe_product", "stripe_price", "amount_minor", "activation_limit", "refresh_interval_days"]) {
      expect(serialized).not.toContain(prohibited);
    }
  });

  it("stays aligned with the versioned handoff bundle", () => {
    expect(bundle.contract).toBe("metatweak.v2");
    expect(bundle.licensing_protocol_specification).toBe(contract.licensing_protocol_specification);
    expect(bundle.sdk_versions).toEqual({
      "Driftline.Licensing": "1.0.0",
      "@driftline/licensing-sdk": "1.1.0",
    });
  });
});
