import { fileURLToPath } from "node:url";
import type { ParsedArgs } from "../cli.ts";
import { flagValue } from "../cli.ts";
import { pathExists } from "../storage.ts";

export interface UiLaunchConfig {
  webDir: string;
  host: string;
  port: number;
}

const PACKAGED_WEB_DIR = fileURLToPath(new URL("../../web", import.meta.url));

export async function resolveUiLaunchConfig(rootDir: string, parsed: ParsedArgs): Promise<UiLaunchConfig> {
  const webDir = PACKAGED_WEB_DIR;

  if (!(await pathExists(webDir))) {
    throw new Error("Packaged web app not found. Reinstall Spec Embryo so the UI assets are available.");
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
