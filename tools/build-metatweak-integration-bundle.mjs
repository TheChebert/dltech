import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const definitionPath = resolve(root, "contracts/integration-bundles/metatweak.json");
const definition = JSON.parse(await readFile(definitionPath, "utf8"));
const outputRoot = resolve(root, "artifacts/metatweak-integration");
const output = resolve(outputRoot, definition.bundle_version);

if (!output.startsWith(outputRoot + sep)) throw new Error("Unsafe bundle output path");
const dotnetVersion = await readDotnetVersion();
if (definition.sdk_versions["Driftline.Licensing"] !== dotnetVersion) {
  throw new Error("Driftline.Licensing version does not match bundle definition");
}
const typescriptPackage = JSON.parse(await readFile(resolve(root, "packages/licensing-sdk/package.json"), "utf8"));
if (definition.sdk_versions["@driftline/licensing-sdk"] !== typescriptPackage.version) {
  throw new Error("TypeScript SDK version does not match bundle definition");
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const files = [];
for (const sourceName of definition.files) {
  const source = resolve(root, sourceName);
  if (!source.startsWith(root + sep)) throw new Error(`Unsafe source path: ${sourceName}`);
  const destination = resolve(output, sourceName);
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination);
  const bytes = await readFile(source);
  files.push({ path: sourceName.replaceAll("\\", "/"), sha256: createHash("sha256").update(bytes).digest("hex") });
}

const manifest = {
  ...definition,
  generated_at: new Date().toISOString(),
  source_commit: process.env.GITHUB_SHA ?? null,
  files,
};
await writeFile(resolve(output, "BUNDLE-MANIFEST.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(`Built ${relative(root, output)} with ${files.length} versioned files.`);

function readDotnetVersion() {
  return readFile(resolve(root, "packages/Driftline.Licensing/Driftline.Licensing.csproj"), "utf8")
    .then((value) => value.match(/<Version>([^<]+)<\/Version>/)?.[1])
    .then((value) => value ?? "");
}
