import { execFile } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { ParsedArgs } from "../cli.ts";
import { flagValue } from "../cli.ts";
import { pathExists } from "../storage.ts";

export interface UiLaunchConfig {
  webDir: string;
  host: string;
  port: number;
  requestedPort: number;
}

interface UiLaunchResolutionOptions {
  portProbe?: (host: string, port: number) => Promise<boolean>;
}

const PACKAGED_WEB_DIR = fileURLToPath(new URL("../../web", import.meta.url));
const MAX_PORT_SCAN = 25;
const execFileAsync = promisify(execFile);

async function hasListeningProcess(port: number): Promise<boolean | undefined> {
  try {
    const { stdout } = await execFileAsync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN"]);
    return stdout.trim().length > 0;
  } catch (error) {
    if (typeof error === "object" && error && "code" in error) {
      const code = String(error.code);
      if (code === "1") {
        return false;
      }

      if (code === "ENOENT") {
        return undefined;
      }
    }

    return undefined;
  }
}

async function canListenOnPort(host: string, port: number): Promise<boolean> {
  const occupied = await hasListeningProcess(port);
  if (occupied !== undefined) {
    return !occupied;
  }

  return await new Promise<boolean>((resolve) => {
    const server = createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.listen(port, host, () => {
      server.close(() => resolve(true));
    });
  });
}

async function findAvailablePort(
  host: string,
  requestedPort: number,
  portProbe: (host: string, port: number) => Promise<boolean>,
): Promise<number> {
  for (let offset = 0; offset <= MAX_PORT_SCAN; offset += 1) {
    const candidate = requestedPort + offset;
    if (await portProbe(host, candidate)) {
      return candidate;
    }
  }

  throw new Error(`Could not find an available port between ${requestedPort} and ${requestedPort + MAX_PORT_SCAN}.`);
}

export async function resolveUiLaunchConfig(
  rootDir: string,
  parsed: ParsedArgs,
  options?: UiLaunchResolutionOptions,
): Promise<UiLaunchConfig> {
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

  const availablePort = await findAvailablePort(host, port, options?.portProbe ?? canListenOnPort);

  return {
    webDir,
    host,
    port: availablePort,
    requestedPort: port,
  };
}
