import packageJson from "../../package.json" with { type: "json" };

export const CLI_VERSION = packageJson.version;

export async function readCliVersion(): Promise<string> {
  if (typeof CLI_VERSION !== "string" || CLI_VERSION.trim().length === 0) {
    throw new Error("Package version is missing from package.json.");
  }

  return CLI_VERSION.trim();
}

function parseVersionParts(value: string): number[] {
  const normalized = value.trim().replace(/^[^\d]*/u, "");
  return normalized
    .split(/[.-]/u)
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part));
}

export function compareCliVersions(left: string, right: string): number {
  const leftParts = parseVersionParts(left);
  const rightParts = parseVersionParts(right);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;

    if (leftPart > rightPart) {
      return 1;
    }

    if (leftPart < rightPart) {
      return -1;
    }
  }

  return 0;
}
