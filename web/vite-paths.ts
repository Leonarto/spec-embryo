import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

function normalizeOptionalPath(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function findNodeModulesRoot(startDir: string): string | undefined {
  const segments = startDir.split(sep).filter(Boolean);
  const nodeModulesIndex = segments.lastIndexOf("node_modules");

  if (nodeModulesIndex === -1) {
    return undefined;
  }

  const prefix = startDir.startsWith(sep) ? sep : "";
  return prefix + segments.slice(0, nodeModulesIndex + 1).join(sep);
}

export function buildViteFsAllowList(options?: {
  configUrl?: string;
  projectRoot?: string;
}): string[] {
  const configFile = fileURLToPath(options?.configUrl ?? import.meta.url);
  const webDir = dirname(configFile);
  const packageRoot = join(webDir, "..");
  const nodeModulesRoot = findNodeModulesRoot(packageRoot);
  const projectRoot = normalizeOptionalPath(options?.projectRoot);

  return Array.from(
    new Set(
      [packageRoot, nodeModulesRoot, projectRoot].filter((value): value is string => Boolean(value)),
    ),
  );
}
