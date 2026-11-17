import { createHash } from "node:crypto";
import { lstat, readdir, readFile } from "node:fs/promises";
import { join, posix } from "node:path";

export const UI_ADAPTER_VERSION = "5.5.8";
const TOOLS = ["@sveltejs/adapter-node", "@sveltejs/kit", "svelte", "vite"] as const;
const INPUT_FILES = ["package.json", "web/package.json", "bun.lock", "web/svelte.config.js", "web/svelte-plugin-options.js", "web/vite.config.ts", "web/vite-paths.ts", "web/tsconfig.json", "tsconfig.json", "scripts/build-ui.ts"];
export interface UiFileHash { path: string; bytes: number; sha256: string }
export interface UiManifest {
  schema: 1; package: { name: string; version: string }; tools: Record<string, string>;
  node: string; sourceDigest: string; lockDigest: string; inputs: UiFileHash[]; outputs: UiFileHash[]; buildId: string;
}
export const sha256 = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function safePath(path: string): boolean {
  return Boolean(path) && !path.includes("\\") && !path.includes("\0") && !posix.isAbsolute(path) && path.split("/").every(part => part !== "" && part !== "." && part !== "..");
}
export async function assertUiArtifactParents(root: string, path: string, checked = new Set<string>(), allowMissing = false): Promise<void> {
  if (!safePath(path)) throw new Error(`Unsafe UI artifact path: ${path}`);
  const segments = path.split("/");
  for (let length = 1; length < segments.length; length++) {
    const parent = segments.slice(0, length).join("/");
    if (checked.has(parent)) continue;
    let stat;
    try { stat = await lstat(join(root, parent)); }
    catch (error) { if (allowMissing && (error as NodeJS.ErrnoException).code === "ENOENT") return; throw error; }
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`UI artifact parent must be an owned directory without symlinks: ${parent}`);
    checked.add(parent);
  }
}
async function inventory(root: string, paths: string[], omit?: (path: string) => boolean): Promise<UiFileHash[]> {
  const result: UiFileHash[] = [];
  const checkedParents = new Set<string>();
  async function visit(path: string): Promise<void> {
    if (!safePath(path)) throw new Error(`Unsafe UI artifact path: ${path}`);
    await assertUiArtifactParents(root, path, checkedParents);
    const stat = await lstat(join(root, path));
    if (stat.isSymbolicLink()) throw new Error(`UI artifacts cannot contain symlinks: ${path}`);
    if (omit?.(path)) return;
    if (stat.isDirectory()) {
      for (const entry of (await readdir(join(root, path))).sort()) await visit(`${path}/${entry}`);
    } else if (stat.isFile()) {
      const bytes = await readFile(join(root, path));
      result.push({ path, bytes: bytes.length, sha256: sha256(bytes) });
    } else throw new Error(`Unsupported UI artifact: ${path}`);
  }
  for (const path of paths) await visit(path);
  return result.sort((a,b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
export async function uiSourceIdentity(root: string) {
  const inputs = await inventory(root, [...INPUT_FILES, "src", "web/src", "web/runtime"], path => /(?:^|\/)(?:AGENTS\.md|[^/]+\.(?:test|spec)\.[^/]+)$/.test(path));
  const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const web = JSON.parse(await readFile(join(root, "web/package.json"), "utf8"));
  const tools: Record<string,string> = {};
  for (const tool of TOOLS) {
    const version = pkg.dependencies?.[tool];
    if (typeof version !== "string" || version !== web.devDependencies?.[tool] || !/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`UI tool identity mismatch: ${tool}`);
    tools[tool] = version;
  }
  if (tools[TOOLS[0]] !== UI_ADAPTER_VERSION) throw new Error("Unsupported UI adapter version.");
  return { package: { name: pkg.name as string, version: pkg.version as string }, tools, inputs, sourceDigest: sha256(canonical(inputs)), lockDigest: inputs.find(file => file.path === "bun.lock")!.sha256 };
}
export async function uiOutputInventory(root: string): Promise<UiFileHash[]> {
  return inventory(root, ["web/build"], path => path === "web/build/spm-manifest.json");
}
export function uiBuildId(manifest: Omit<UiManifest, "buildId">): string { return sha256(canonical(manifest)); }
function validateEntries(value: unknown): value is UiFileHash[] {
  return Array.isArray(value) && value.every((item, index) => item && Object.keys(item).sort().join(",") === "bytes,path,sha256" && typeof item.path === "string" && safePath(item.path) && Number.isSafeInteger(item.bytes) && item.bytes >= 0 && /^[a-f0-9]{64}$/.test(item.sha256) && (index === 0 || value[index-1].path < item.path));
}
export async function validateUiArtifacts(root: string): Promise<UiManifest> {
  try {
    await assertUiArtifactParents(root, "web/build/spm-manifest.json");
    const path = join(root, "web/build/spm-manifest.json");
    if (!(await lstat(path)).isFile() || (await lstat(path)).isSymbolicLink()) throw new Error("Invalid manifest file.");
    const manifest = JSON.parse(await readFile(path, "utf8")) as UiManifest;
    if (!manifest || Object.keys(manifest).sort().join(",") !== "buildId,inputs,lockDigest,node,outputs,package,schema,sourceDigest,tools" || manifest.schema !== 1 || !validateEntries(manifest.inputs) || !validateEntries(manifest.outputs) || typeof manifest.node !== "string" || !/^v\d+\.\d+\.\d+$/.test(manifest.node)) throw new Error("Invalid manifest schema.");
    const { buildId, ...identity } = manifest;
    if (uiBuildId(identity) !== buildId) throw new Error("Invalid build identity.");
    const source = await uiSourceIdentity(root);
    for (const key of ["package", "tools", "inputs", "sourceDigest", "lockDigest"] as const) if (canonical(source[key]) !== canonical(manifest[key])) throw new Error(`Stale UI ${key}.`);
    const outputs = await uiOutputInventory(root);
    if (!outputs.some(file => file.path === "web/build/handler.js") || canonical(outputs) !== canonical(manifest.outputs)) throw new Error("Missing, unexpected or corrupt UI output.");
    return manifest;
  } catch (error) {
    throw new Error(`Precompiled UI artifacts are missing, stale or invalid (${error instanceof Error ? error.message : String(error)}). In a checkout run bun run web:build or use spm ui --dev; for an installed package reinstall a complete matching package.`);
  }
}
