import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

function hasProjectConfig(dirPath: string): boolean {
  return existsSync(join(dirPath, ".specpm", "config.toml"));
}

export function resolveProjectRootFrom(startDir: string, configuredRoot?: string): string {
  if (configuredRoot && configuredRoot.trim().length > 0) {
    return resolve(configuredRoot);
  }

  let current = resolve(startDir);
  while (true) {
    if (hasProjectConfig(current)) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) {
      break;
    }

    current = parent;
  }

  throw new Error(
    "Could not resolve the Spec Embryo project root. Set SPM_PROJECT_ROOT or run the UI from a repo with `.specpm/config.toml`.",
  );
}

export function resolveProjectRoot(): string {
  return resolveProjectRootFrom(process.cwd(), process.env.SPM_PROJECT_ROOT);
}
