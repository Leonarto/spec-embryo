import { parse as parseToml } from "smol-toml";
import { parseProjectConfig } from "../domain.ts";
import { loadProjectContext } from "../repository.ts";
import { containedHarnessPath, readHarnessText } from "./harness-paths.ts";

// Evidence and hook workers need only repo memory; org/session scopes are not read.
export async function loadRootedHarnessContext(rootDir: string) {
  const raw = await readHarnessText(rootDir, ".specpm/config.toml");
  if (raw === null) throw new Error("Managed project marker unavailable");
  const config = parseProjectConfig(parseToml(raw));
  for (const path of [config.memoryDir, config.stateFile, config.specsDir, config.tasksDir, config.handoffsDir]) {
    await containedHarnessPath(rootDir, path);
  }
  return loadProjectContext(rootDir, { config, includeScopedMemory: false });
}
