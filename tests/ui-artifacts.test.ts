import { afterEach, describe, expect, test } from "bun:test";
import { cp, mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { uiBuildId, uiOutputInventory, uiSourceIdentity, validateUiArtifacts } from "../src/services/ui-artifacts.ts";
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "spm UI artifacts ")); roots.push(root);
  for (const path of ["src", "web/src", "web/runtime", "web/build", "scripts"]) await mkdir(join(root, path), { recursive: true });
  const tools = { "@sveltejs/adapter-node": "5.5.8", "@sveltejs/kit": "2.55.0", svelte: "5.55.1", vite: "8.0.3" };
  await writeFile(join(root, "package.json"), JSON.stringify({ name: "@leonarto/spec-embryo", version: "0.3.1", dependencies: tools }));
  await writeFile(join(root, "web/package.json"), JSON.stringify({ devDependencies: tools }));
  for (const path of ["bun.lock", "web/svelte.config.js", "web/svelte-plugin-options.js", "web/vite.config.ts", "web/vite-paths.ts", "web/tsconfig.json", "tsconfig.json", "scripts/build-ui.ts", "src/product.ts", "web/src/app.html", "web/runtime/server.mjs", "web/build/handler.js"]) await writeFile(join(root, path), path);
  const identity = { schema: 1 as const, ...await uiSourceIdentity(root), node: "v25.6.0", outputs: await uiOutputInventory(root) };
  await writeFile(join(root, "web/build/spm-manifest.json"), JSON.stringify({ ...identity, buildId: uiBuildId(identity) }));
  return root;
}
describe("UI artifact identities", () => {
  test("survives extraction with spaces and ignores docs, AGENTS and clock metadata", async () => {
    const root = await fixture(); const original = await validateUiArtifacts(root);
    await writeFile(join(root, "src/AGENTS.md"), "guidance"); await writeFile(join(root, "project-document.md"), "project data");
    expect((await validateUiArtifacts(root)).buildId).toBe(original.buildId);
    const extracted = await mkdtemp(join(tmpdir(), "spm extracted space ")); roots.push(extracted); await cp(root, extracted, { recursive: true });
    expect((await validateUiArtifacts(extracted)).buildId).toBe(original.buildId);
  });
  test("rejects same-version source and lock mutation, tampered/missing/unlisted output", async () => {
    for (const file of ["src/product.ts", "web/runtime/server.mjs", "bun.lock", "web/build/handler.js", "web/build/unlisted.js"]) {
      const root = await fixture(); await writeFile(join(root, file), "changed"); await expect(validateUiArtifacts(root)).rejects.toThrow("stale or invalid");
    }
    const root = await fixture(); await rm(join(root, "web/build/handler.js")); await expect(validateUiArtifacts(root)).rejects.toThrow();
  });
  test("rejects symlinked intermediate web and scripts directories before following leaves", async () => {
    for (const name of ["web", "scripts"]) {
      const root = await fixture();
      await rename(join(root, name), join(root, `${name}-target`));
      await symlink(join(root, `${name}-target`), join(root, name));
      await expect(validateUiArtifacts(root)).rejects.toThrow("parent must be an owned directory");
      await expect(uiSourceIdentity(root)).rejects.toThrow("parent must be an owned directory");
    }
  });
  test("rejects schema corruption, traversal, symlinks and a mixed identity", async () => {
    for (const mutation of ["schema", "traversal", "identity", "symlink"]) {
      const root = await fixture(); const path = join(root, "web/build/spm-manifest.json"); const manifest = JSON.parse(await readFile(path, "utf8"));
      if (mutation === "schema") manifest.schema = 2;
      if (mutation === "traversal") manifest.outputs[0].path = "../escape";
      if (mutation === "identity") manifest.tools.vite = "8.0.4";
      if (mutation === "symlink") await symlink(join(root, "src/product.ts"), join(root, "web/build/extra.js"));
      await writeFile(path, JSON.stringify(manifest)); await expect(validateUiArtifacts(root)).rejects.toThrow();
    }
  });
});
