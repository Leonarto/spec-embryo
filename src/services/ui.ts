import { execFile } from "node:child_process";
import { createServer } from "node:net";
import { realpath } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { ParsedArgs } from "../cli.ts";
import { pathExists } from "../storage.ts";
import { normalizeHost } from "../../web/runtime/server.mjs";

export interface UiLaunchConfig { webDir: string; packageRoot: string; projectRoot: string; host: string; port: number; requestedPort: number; dev: boolean; registryFile?: string }
interface UiLaunchResolutionOptions { portProbe?: (host: string, port: number) => Promise<boolean> }
const PACKAGED_WEB_DIR = fileURLToPath(new URL("../../web", import.meta.url));
const execFileAsync = promisify(execFile);
async function canListen(host: string, port: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", (error: NodeJS.ErrnoException) => error.code === "EADDRINUSE" ? resolve(false) : reject(error));
    server.listen(port, host, () => server.close(() => resolve(true)));
  });
}
export async function resolveUiLaunchConfig(rootDir: string, parsed: ParsedArgs, options?: UiLaunchResolutionOptions): Promise<UiLaunchConfig> {
  if (!(await pathExists(PACKAGED_WEB_DIR))) throw new Error("Packaged web app not found. Reinstall Spec Embryo.");
  const valued = (name: string, fallback: string) => {
    const value = parsed.flags.get(name);
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !value) throw new Error(`\`ui --${name}\` requires a value.`);
    return value;
  };
  const devFlag = parsed.flags.get("dev");
  if (devFlag !== undefined && devFlag !== true) throw new Error("`ui --dev` is a boolean flag and does not accept a value.");
  const host = normalizeHost(valued("host", "127.0.0.1"));
  const rawPort = valued("port", "4173");
  if (!/^[0-9]+$/.test(rawPort) || Number(rawPort) < 1 || Number(rawPort) > 65535) throw new Error("`ui --port` must be an integer from 1 to 65535.");
  const requestedPort = Number(rawPort);
  let port = requestedPort;
  if (devFlag) {
    const probe = options?.portProbe ?? canListen;
    for (; port <= Math.min(requestedPort + 25, 65535); port++) if (await probe(host, port)) break;
    if (port > Math.min(requestedPort + 25, 65535)) throw new Error(`Could not find an available port between ${requestedPort} and ${Math.min(requestedPort + 25, 65535)}.`);
  }
  const registry = parsed.flags.get("registry");
  if (registry !== undefined && (typeof registry !== "string" || !registry)) throw new Error("`ui --registry` requires a value.");
  return { registryFile: registry === undefined ? undefined : resolve(String(registry)), webDir: PACKAGED_WEB_DIR, packageRoot: fileURLToPath(new URL("../../", import.meta.url)), projectRoot: await realpath(rootDir), host, port, requestedPort, dev: devFlag === true };
}
export function supportedNodeVersion(version: string): boolean {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version);
  return Boolean(match && (Number(match[1]) > 22 || (Number(match[1]) === 22 && Number(match[2]) >= 12)));
}
export async function resolveNodeRuntime(command = "node"): Promise<{ executable: string; version: string }> {
  try {
    const { stdout } = await execFileAsync(command, ["-p", 'JSON.stringify({executable:process.execPath,version:process.version,node:process.release.name,bun:!!process.versions.bun})'], { timeout: 5000, maxBuffer: 4096, env: productionUiEnvironment(process.env, process.cwd()) });
    const runtime = JSON.parse(stdout);
    if (runtime.node !== "node" || runtime.bun || !supportedNodeVersion(runtime.version) || typeof runtime.executable !== "string" || !isAbsolute(runtime.executable)) throw new Error("unsupported runtime");
    return { executable: await realpath(runtime.executable), version: runtime.version };
  } catch { throw new Error("Precompiled UI requires an actual Node.js >=22.12.0 executable on PATH. Install a supported Node.js runtime, or use explicit spm ui --dev for contributor development."); }
}
export function productionUiEnvironment(environment: NodeJS.ProcessEnv, projectRoot: string): NodeJS.ProcessEnv {
  const clean = { ...environment };
  for (const key of Object.keys(clean)) if (key.startsWith("SPM_SERVER_") || key.startsWith("LISTEN_") || /^(?:PORT|HOST|ORIGIN|ADDRESS_HEADER|XFF_DEPTH|PROTOCOL_HEADER|HOST_HEADER|PORT_HEADER|SOCKET_PATH|NODE_OPTIONS|SPM_UI_CONFIG)$/.test(key)) delete clean[key];
  return { ...clean, NODE_ENV: "production", SPM_PROJECT_ROOT: projectRoot, SPM_SERVER_BODY_SIZE_LIMIT: "Infinity" };
}
