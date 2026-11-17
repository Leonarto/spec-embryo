import { spawn } from "node:child_process";
import { mkdir, rm, writeFile, rename } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { assertUiArtifactParents, canonical, uiBuildId, uiOutputInventory, uiSourceIdentity, validateUiArtifacts, type UiManifest } from "../src/services/ui-artifacts.ts";
import { productionUiEnvironment, resolveNodeRuntime } from "../src/services/ui.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = join(root, "web/build");
const manifestPath = join(output, "spm-manifest.json");
const require = createRequire(join(root, "package.json"));
async function run(executable: string, args: string[], sourceDigest: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const environment = productionUiEnvironment(process.env, root);
    delete environment.SPM_PROJECT_ROOT;
    environment.SPM_UI_BUILD_IDENTITY = sourceDigest;
    // The builder is explicitly a compiler invocation; Vite needs its production build mode.
    const child = spawn(executable, args, { cwd: join(root, "web"), stdio: "inherit", env: environment });
    child.once("error", reject);
    child.once("close", (code, signal) => code === 0 ? resolve() : reject(new Error(`UI build failed (${signal ?? code}).`)));
  });
}
// Refuse intermediate symlinks before touching any previous output.
await assertUiArtifactParents(root, "web/build/spm-manifest.json", undefined, true);
// Invalidate the prior success marker before probing tools or invoking a compiler.
await rm(manifestPath, { force: true });
try {
  const before = await uiSourceIdentity(root);
  const node = await resolveNodeRuntime();
  for (const [tool, version] of Object.entries(before.tools)) {
    for (const location of [root, join(root, "web")]) {
      const resolver = createRequire(join(location, "package.json"));
      const installed = resolver(`${tool}/package.json`) as { version: string };
      if (installed.version !== version) throw new Error(`Installed UI tool differs from pinned identity: ${tool}.`);
    }
  }
  await rm(output, { recursive: true, force: true });
  const kitPackage = require.resolve("@sveltejs/kit/package.json");
  const vitePackage = require.resolve("vite/package.json");
  await run(node.executable, [join(kitPackage, "../svelte-kit.js"), "sync"], before.sourceDigest);
  await run(node.executable, [join(vitePackage, "../bin/vite.js"), "build"], before.sourceDigest);
  const after = await uiSourceIdentity(root);
  if (canonical(before) !== canonical(after)) throw new Error("UI build inputs changed during compilation; rebuild from stable source.");
  const identity = { schema: 1 as const, ...before, node: node.version, outputs: await uiOutputInventory(root) };
  const manifest: UiManifest = { ...identity, buildId: uiBuildId(identity) };
  await mkdir(output, { recursive: true });
  await writeFile(`${manifestPath}.tmp`, JSON.stringify(manifest, null, 2) + "\n");
  await rename(`${manifestPath}.tmp`, manifestPath);
  await validateUiArtifacts(root);
  console.log(`Precompiled UI verified: ${manifest.buildId} (${manifest.outputs.length} files). Stop running UI servers before rebuilding.`);
} catch (error) {
  await rm(manifestPath, { force: true });
  await rm(`${manifestPath}.tmp`, { force: true });
  throw error;
}
