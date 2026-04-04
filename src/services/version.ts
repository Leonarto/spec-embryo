import { fileURLToPath } from "node:url";
import { readUtf8 } from "../storage.ts";

const PACKAGE_JSON_PATH = fileURLToPath(new URL("../../package.json", import.meta.url));

export async function readCliVersion(): Promise<string> {
  const raw = await readUtf8(PACKAGE_JSON_PATH);
  const parsed = JSON.parse(raw) as { version?: unknown };

  if (typeof parsed.version !== "string" || parsed.version.trim().length === 0) {
    throw new Error("Package version is missing from package.json.");
  }

  return parsed.version.trim();
}
