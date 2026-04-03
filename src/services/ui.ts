import { join } from "node:path";
import type { ParsedArgs } from "../cli.ts";
import { flagValue } from "../cli.ts";
import { pathExists } from "../storage.ts";

export interface UiLaunchConfig {
  webDir: string;
  host: string;
  port: number;
}

export async function resolveUiLaunchConfig(rootDir: string, parsed: ParsedArgs): Promise<UiLaunchConfig> {
  const webDir = join(rootDir, "web");

  if (!(await pathExists(webDir))) {
    throw new Error("Local web app not found. Expected a SvelteKit app in `web/`.");
  }

  const host = flagValue(parsed, "host") ?? "127.0.0.1";
  const portRaw = flagValue(parsed, "port");
  const port = portRaw ? Number.parseInt(portRaw, 10) : 4173;

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("`ui --port` must be a positive integer.");
  }

  return {
    webDir,
    host,
    port,
  };
}
